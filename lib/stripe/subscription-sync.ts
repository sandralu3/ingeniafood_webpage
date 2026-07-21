import type Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { isValidSubscriptionStatus } from "@/types/subscription";

const SUPABASE_USER_META_KEY = "supabase_user_id";

type SubscriptionSyncInput = {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  priceId: string | null;
  currentPeriodEnd: Date | null;
};

export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const legacy = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  if (typeof legacy === "number" && Number.isFinite(legacy)) {
    return new Date(legacy * 1000);
  }

  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  if (typeof itemEnd === "number" && Number.isFinite(itemEnd)) {
    return new Date(itemEnd * 1000);
  }

  return null;
}

export function getSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items?.data?.[0]?.price?.id ?? null;
}

export function extractSupabaseUserIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): string | null {
  const value = metadata?.[SUPABASE_USER_META_KEY]?.trim();
  return value || null;
}

export async function resolveUserIdFromStripeCustomer(
  stripeCustomerId: string
): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    console.error("[stripe] resolveUserIdFromStripeCustomer", error);
    return null;
  }

  return data?.user_id ?? null;
}

export async function resolveUserIdFromStripeSubscription(
  stripeSubscriptionId: string
): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error) {
    console.error("[stripe] resolveUserIdFromStripeSubscription", error);
    return null;
  }

  return data?.user_id ?? null;
}

export async function upsertSubscriptionAndPremiumCache(
  input: SubscriptionSyncInput
): Promise<void> {
  const admin = getSupabaseAdminClient();
  const isPremium = isValidSubscriptionStatus(input.status);

  const { error: subscriptionError } = await admin.from("subscriptions").upsert(
    {
      user_id: input.userId,
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId,
      status: input.status,
      price_id: input.priceId,
      current_period_end: input.currentPeriodEnd?.toISOString() ?? null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (subscriptionError) {
    throw subscriptionError;
  }

  const profileUpdate = isPremium
    ? {
        is_premium: true,
        premium_trial_remaining: 0,
        premium_trial_claimed_at: null as string | null
      }
    : { is_premium: false };

  const { error: profileError } = await admin
    .from("profiles")
    .update(profileUpdate)
    .eq("id", input.userId);

  if (profileError) {
    throw profileError;
  }
}

export async function syncStripeSubscriptionToSupabase(
  subscription: Stripe.Subscription,
  options?: { userId?: string | null; stripeCustomerId?: string | null }
): Promise<{ userId: string } | null> {
  const customerId =
    options?.stripeCustomerId ??
    (typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null);

  let userId =
    options?.userId ??
    extractSupabaseUserIdFromMetadata(subscription.metadata) ??
    null;

  if (!userId && customerId) {
    userId = await resolveUserIdFromStripeCustomer(customerId);
  }

  if (!userId) {
    userId = await resolveUserIdFromStripeSubscription(subscription.id);
  }

  if (!userId) {
    console.warn("[stripe] No se pudo resolver user_id para subscription", subscription.id);
    return null;
  }

  await upsertSubscriptionAndPremiumCache({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    priceId: getSubscriptionPriceId(subscription),
    currentPeriodEnd: getSubscriptionPeriodEnd(subscription)
  });

  return { userId };
}

export { SUPABASE_USER_META_KEY };
