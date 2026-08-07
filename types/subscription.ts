/**
 * Tipos de suscripción Premium (Paddle Billing).
 * Alineados con public.subscriptions y estados Paddle Subscription.
 */

export const SUBSCRIPTION_STATUSES = [
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused"
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Estados que otorgan acceso Premium de pago. */
export const VALID_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

export type ValidSubscriptionStatus = (typeof VALID_SUBSCRIPTION_STATUSES)[number];

export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return (
    typeof value === "string" &&
    (SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
  );
}

export function isValidSubscriptionStatus(
  value: unknown
): value is ValidSubscriptionStatus {
  return (
    typeof value === "string" &&
    (VALID_SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
  );
}

/** Fila de public.subscriptions (shape de app, camelCase). */
export type UserSubscription = {
  userId: string;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  status: SubscriptionStatus;
  priceId: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Fila cruda de Supabase (snake_case). */
export type SubscriptionRow = {
  user_id: string;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionAccess = {
  /** Hay fila en subscriptions y status es active o trialing (y periodo vigente). */
  hasValidSubscription: boolean;
  status: SubscriptionStatus | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
};

export const EMPTY_SUBSCRIPTION_ACCESS: SubscriptionAccess = {
  hasValidSubscription: false,
  status: null,
  priceId: null,
  currentPeriodEnd: null,
  paddleCustomerId: null,
  paddleSubscriptionId: null
};

export function mapSubscriptionRow(row: SubscriptionRow): UserSubscription {
  return {
    userId: row.user_id,
    paddleCustomerId: row.paddle_customer_id,
    paddleSubscriptionId: row.paddle_subscription_id,
    status: isSubscriptionStatus(row.status) ? row.status : "inactive",
    priceId: row.price_id,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
