import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  isSubscriptionStatus,
  isValidSubscriptionStatus,
  type SubscriptionStatus
} from "@/types/subscription";

export const SUPABASE_USER_META_KEY = "supabase_user_id";

type SubscriptionSyncInput = {
  userId: string;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  status: string;
  priceId: string | null;
  currentPeriodEnd: Date | null;
};

/** Shape mínimo compartido entre entidad API y notificaciones webhook. */
export type PaddleSubscriptionLike = {
  id: string;
  status: string;
  customerId: string;
  customData?: Record<string, unknown> | null;
  currentBillingPeriod?: { endsAt?: string | null } | null;
  items?: Array<{ price?: { id?: string } | null } | null> | null;
};

export function mapPaddleStatusToApp(status: string): SubscriptionStatus {
  if (isSubscriptionStatus(status)) {
    return status;
  }
  return "inactive";
}

export function getSubscriptionPeriodEnd(
  subscription: PaddleSubscriptionLike
): Date | null {
  const endsAt = subscription.currentBillingPeriod?.endsAt;
  if (!endsAt) return null;
  const parsed = Date.parse(endsAt);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

export function getSubscriptionPriceId(
  subscription: PaddleSubscriptionLike
): string | null {
  return subscription.items?.[0]?.price?.id ?? null;
}

export function extractSupabaseUserIdFromCustomData(
  customData: Record<string, unknown> | null | undefined
): string | null {
  if (!customData) return null;
  const value = customData[SUPABASE_USER_META_KEY];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function resolveUserIdFromPaddleCustomer(
  paddleCustomerId: string
): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("paddle_customer_id", paddleCustomerId)
    .maybeSingle();

  if (error) {
    console.error("[paddle] resolveUserIdFromPaddleCustomer", error);
    return null;
  }

  return data?.user_id ?? null;
}

export async function resolveUserIdFromPaddleSubscription(
  paddleSubscriptionId: string
): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("paddle_subscription_id", paddleSubscriptionId)
    .maybeSingle();

  if (error) {
    console.error("[paddle] resolveUserIdFromPaddleSubscription", error);
    return null;
  }

  return data?.user_id ?? null;
}

/** Resuelve user_id por email del customer Paddle (auth admin). */
export async function resolveUserIdFromPaddleCustomerEmail(
  email: string
): Promise<string | null> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;

  const admin = getSupabaseAdminClient();
  const perPage = 200;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[paddle] resolveUserIdFromPaddleCustomerEmail", error);
      return null;
    }
    const match = data.users.find((user) => user.email?.toLowerCase() === trimmed);
    if (match) return match.id;
    if (data.users.length < perPage) break;
  }
  return null;
}

export async function upsertSubscriptionAndPremiumCache(
  input: SubscriptionSyncInput
): Promise<void> {
  const admin = getSupabaseAdminClient();
  const mappedStatus = mapPaddleStatusToApp(input.status);
  const isPremium = isValidSubscriptionStatus(mappedStatus);

  const { error: subscriptionError } = await admin.from("subscriptions").upsert(
    {
      user_id: input.userId,
      paddle_customer_id: input.paddleCustomerId,
      paddle_subscription_id: input.paddleSubscriptionId,
      status: mappedStatus,
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

export async function syncPaddleSubscriptionToSupabase(
  subscription: PaddleSubscriptionLike,
  options?: {
    userId?: string | null;
    paddleCustomerId?: string | null;
    resolveCustomerEmail?: (customerId: string) => Promise<string | null>;
  }
): Promise<{ userId: string } | null> {
  const customerId = options?.paddleCustomerId ?? subscription.customerId ?? null;

  let userId =
    options?.userId ??
    extractSupabaseUserIdFromCustomData(subscription.customData) ??
    null;

  if (!userId && customerId) {
    userId = await resolveUserIdFromPaddleCustomer(customerId);
  }

  if (!userId) {
    userId = await resolveUserIdFromPaddleSubscription(subscription.id);
  }

  if (!userId && customerId && options?.resolveCustomerEmail) {
    const email = await options.resolveCustomerEmail(customerId);
    if (email) {
      userId = await resolveUserIdFromPaddleCustomerEmail(email);
    }
  }

  if (!userId) {
    console.warn("[paddle] No se pudo resolver user_id para subscription", {
      subscriptionId: subscription.id,
      customerId,
      customData: subscription.customData ?? null
    });
    return null;
  }

  await upsertSubscriptionAndPremiumCache({
    userId,
    paddleCustomerId: customerId,
    paddleSubscriptionId: subscription.id,
    status: subscription.status,
    priceId: getSubscriptionPriceId(subscription),
    currentPeriodEnd: getSubscriptionPeriodEnd(subscription)
  });

  return { userId };
}
