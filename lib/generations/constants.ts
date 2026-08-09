/** Límite diario de escaneos para cuentas free. */
export const FREE_DAILY_SCAN_LIMIT = 5;

/** Límite diario de escaneos con Premium (pago o pase 24h). */
export const PREMIUM_DAILY_SCAN_LIMIT = 20;

/** @deprecated Usar FREE_DAILY_SCAN_LIMIT. */
export const FREE_GENERATIONS_LIMIT = FREE_DAILY_SCAN_LIMIT;

/** Valor devuelto para cuentas con escaneos ilimitados (admin). */
export const UNLIMITED_GENERATIONS_SENTINEL = 999_999;

/**
 * Límite efectivo según plan.
 * Premium (Stripe / 24h / tester-admin vía canUsePremiumFeatures) obtiene al menos 20.
 * Si el admin configuró un tope mayor, se respeta.
 */
export function resolveEffectiveDailyScanLimit(
  storedLimit: number,
  isPremium: boolean
): number {
  const stored = Number.isFinite(storedLimit) ? Math.max(0, Math.floor(storedLimit)) : FREE_DAILY_SCAN_LIMIT;
  if (isPremium) {
    return Math.max(stored, PREMIUM_DAILY_SCAN_LIMIT);
  }
  return stored;
}
