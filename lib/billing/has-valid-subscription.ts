import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { isUserTester } from "@/lib/auth/is-tester";
import {
  EMPTY_SUBSCRIPTION_ACCESS,
  isSubscriptionStatus,
  isValidSubscriptionStatus,
  type SubscriptionAccess,
  type SubscriptionRow
} from "@/types/subscription";

type AppSupabaseClient = SupabaseClient<Database>;

const SUBSCRIPTION_SELECT =
  "user_id, paddle_customer_id, paddle_subscription_id, status, price_id, current_period_end, created_at, updated_at" as const;

/**
 * True si el periodo de facturación aún no ha terminado.
 * Si current_period_end es null, no bloqueamos (p. ej. fila recién creada en checkout).
 */
export function isSubscriptionPeriodActive(
  currentPeriodEnd: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!currentPeriodEnd) return true;
  const endMs = Date.parse(currentPeriodEnd);
  if (Number.isNaN(endMs)) return false;
  return endMs > now.getTime();
}

/**
 * Evalúa una fila de subscriptions sin I/O.
 * Válida = status ∈ {active, trialing} y current_period_end vigente.
 * Nota: el acceso real Premium también exige `is_tester` (ver hasValidSubscription).
 */
export function evaluateSubscriptionAccess(
  row: SubscriptionRow | null | undefined,
  now: Date = new Date()
): SubscriptionAccess {
  if (!row) {
    return EMPTY_SUBSCRIPTION_ACCESS;
  }

  const status = isSubscriptionStatus(row.status) ? row.status : null;
  const hasValidSubscription =
    isValidSubscriptionStatus(row.status) &&
    isSubscriptionPeriodActive(row.current_period_end, now);

  return {
    hasValidSubscription,
    status,
    priceId: row.price_id,
    currentPeriodEnd: row.current_period_end,
    paddleCustomerId: row.paddle_customer_id,
    paddleSubscriptionId: row.paddle_subscription_id
  };
}

/**
 * Comprueba suscripción Paddle (sin exigir tester).
 */
export async function getSubscriptionAccess(
  supabase: AppSupabaseClient,
  userId: string
): Promise<{ access: SubscriptionAccess; error?: string }> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return { access: EMPTY_SUBSCRIPTION_ACCESS, error: "Falta el id de usuario." };
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("user_id", trimmedUserId)
    .maybeSingle();

  if (error) {
    console.error("[billing] getSubscriptionAccess", error);
    return {
      access: EMPTY_SUBSCRIPTION_ACCESS,
      error: "No pudimos validar la suscripción."
    };
  }

  return {
    access: evaluateSubscriptionAccess(data as SubscriptionRow | null)
  };
}

/**
 * Premium de pago efectivo: tester obligatorio + status active|trialing y periodo vigente.
 * Si no es tester → false aunque tenga suscripción en Paddle.
 */
export async function hasValidSubscription(
  supabase: AppSupabaseClient,
  userId: string,
  email?: string | null
): Promise<boolean> {
  const isTester = await isUserTester(supabase, userId, email);
  if (!isTester) {
    return false;
  }

  const { access } = await getSubscriptionAccess(supabase, userId);
  return access.hasValidSubscription;
}
