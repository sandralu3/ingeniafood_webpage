import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe/stripe-server";

function isMissingStripeCustomerError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const stripeError = error as { code?: string; type?: string; message?: string };
  if (stripeError.code === "resource_missing") return true;
  return Boolean(stripeError.message?.includes("No such customer"));
}

/**
 * Valida un stripe_customer_id antes de Checkout/Portal.
 * Si el cliente ya no existe en Stripe (borrado o modo test/live distinto),
 * limpia la fila en Supabase y devuelve null para crear uno nuevo.
 */
export async function resolveValidStripeCustomerId(
  userId: string,
  candidateCustomerId: string | null | undefined
): Promise<string | null> {
  const customerId = candidateCustomerId?.trim() || null;
  if (!customerId) return null;

  const stripe = getStripe();
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) {
      await clearStaleStripeCustomer(userId);
      return null;
    }
    return customer.id;
  } catch (error) {
    if (isMissingStripeCustomerError(error)) {
      console.warn("[stripe] Cliente obsoleto, se limpia para nuevo checkout", {
        userId,
        customerId
      });
      await clearStaleStripeCustomer(userId);
      return null;
    }
    throw error;
  }
}

async function clearStaleStripeCustomer(userId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      stripe_customer_id: null,
      stripe_subscription_id: null,
      status: "canceled",
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[stripe] No se pudo limpiar customer obsoleto", error);
  }
}

export type CheckoutCustomerParams = {
  customer?: string;
  customer_email?: string;
};

/**
 * Params seguros para Checkout: customer válido o email (cliente nuevo).
 */
export async function buildCheckoutCustomerParams(
  userId: string,
  email: string,
  candidateCustomerId: string | null | undefined
): Promise<CheckoutCustomerParams> {
  const validCustomerId = await resolveValidStripeCustomerId(userId, candidateCustomerId);
  if (validCustomerId) {
    return { customer: validCustomerId };
  }
  return { customer_email: email };
}
