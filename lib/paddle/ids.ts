/** IDs de Paddle Billing (no confundir con Stripe `cus_…`). */
export function isPaddleCustomerId(value: string | null | undefined): boolean {
  return Boolean(value?.trim().startsWith("ctm_"));
}

export function isPaddleSubscriptionId(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  // Paddle usa sub_…; Stripe también. Exigimos longitud típica de Paddle (sub_ + 26 chars).
  return /^sub_[a-z0-9]{24,}$/i.test(trimmed);
}

export function isLegacyStripeCustomerId(value: string | null | undefined): boolean {
  return Boolean(value?.trim().startsWith("cus_"));
}
