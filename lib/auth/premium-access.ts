import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import {
  isPremiumComplexity,
  isPremiumCuisineStyle,
  isPremiumMealType,
  isPremiumServings,
  type RecipeComplexity,
  type RecipeCuisineStyle,
  type RecipeMealType,
  type RecipeServings
} from "@/lib/recipes/premium-recipe-filters";

export type UserRole = "admin" | "tester" | "user";

export type PremiumProfileRow = {
  is_premium: boolean | null;
  is_tester?: boolean | null;
  role?: UserRole | string | null;
  premium_expires_at?: string | null;
  has_generated_real_photo?: boolean | null;
  redeemed_code?: string | null;
  has_promo_claimable?: boolean | null;
  promo_code_ref?: string | null;
  openai_photo_credits?: number | null;
  /** @deprecated Prueba de 1 uso eliminada; se mantiene por compatibilidad de esquema. */
  premium_trial_remaining?: number | null;
  /** @deprecated Prueba de 1 uso eliminada; se mantiene por compatibilidad de esquema. */
  premium_trial_claimed_at?: string | null;
};

export type PremiumAccess = {
  role: UserRole;
  /** Solo testers/admin ven herramientas de beta/Stripe avanzadas. */
  isTester: boolean;
  /** Premium de pago (Stripe / is_premium sin timer) vigente. */
  isPaidPremium: boolean;
  /** Premium por código/promo con premium_expires_at vigente. */
  isCodePremium: boolean;
  /** Fin del Premium temporal (ISO) o null. */
  premiumExpiresAt: string | null;
  /** Tiene 24h Premium pendientes de activar (referido). */
  hasPromoClaimable: boolean;
  /** Origen del link ?ref= si aplica. */
  promoCodeRef: string | null;
  /** Ya usó la foto real de prueba (lifetime). */
  hasGeneratedRealPhoto: boolean;
  /** Generaciones de foto OpenAI restantes (legacy mirror). */
  openaiPhotoCredits: number;
  /** Siempre 0: la prueba de 1 uso ya no otorga acceso. */
  premiumTrialRemaining: number;
  /** Histórico de reclamación; ya no habilita funciones. */
  premiumTrialClaimed: boolean;
  /** admin/tester permanente, Stripe, o código 24h vigente. */
  canUsePremiumFeatures: boolean;
  /** Siempre false: la simulación de prueba fue retirada. */
  canSimulatePremiumTrial: boolean;
};

export const EMPTY_PREMIUM_ACCESS: PremiumAccess = {
  role: "user",
  isTester: false,
  isPaidPremium: false,
  isCodePremium: false,
  premiumExpiresAt: null,
  hasPromoClaimable: false,
  promoCodeRef: null,
  hasGeneratedRealPhoto: false,
  openaiPhotoCredits: 0,
  premiumTrialRemaining: 0,
  premiumTrialClaimed: false,
  canUsePremiumFeatures: false,
  canSimulatePremiumTrial: false
};

/** @deprecated Prefer resolvePremiumAccess; se mantiene por imports legacy. */
export const ADMIN_TESTER_ACCESS: PremiumAccess = {
  role: "admin",
  isTester: true,
  isPaidPremium: true,
  isCodePremium: false,
  premiumExpiresAt: null,
  hasPromoClaimable: false,
  promoCodeRef: null,
  hasGeneratedRealPhoto: false,
  openaiPhotoCredits: 1,
  premiumTrialRemaining: 0,
  premiumTrialClaimed: false,
  canUsePremiumFeatures: true,
  canSimulatePremiumTrial: false
};

/** @deprecated Usar ADMIN_TESTER_ACCESS. */
export const ADMIN_PREMIUM_ACCESS = ADMIN_TESTER_ACCESS;

export type ResolvePremiumAccessOptions = {
  email?: string | null;
  now?: Date;
};

export function resolveUserRole(
  profile: PremiumProfileRow | null | undefined,
  email?: string | null
): UserRole {
  if (isSandraAdmin(email)) return "admin";
  const raw = typeof profile?.role === "string" ? profile.role.trim().toLowerCase() : "";
  if (raw === "admin" || raw === "tester" || raw === "user") {
    return raw;
  }
  if (profile?.is_tester === true) return "tester";
  return "user";
}

export function isPremiumExpiryActive(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return false;
  const endMs = Date.parse(expiresAt);
  if (Number.isNaN(endMs)) return false;
  return endMs > now.getTime();
}

/**
 * Resuelve acceso Premium:
 * - admin / tester → Premium permanente
 * - is_premium sin timer → Stripe / flag de pago
 * - premium_expires_at vigente → Premium temporal (código o referido activado)
 * - si Date.now() > premiumExpiresAt → Free automáticamente (aunque is_premium siga true)
 */
export function resolvePremiumAccess(
  profile: PremiumProfileRow | null | undefined,
  options?: ResolvePremiumAccessOptions
): PremiumAccess {
  const now = options?.now ?? new Date();
  const role = resolveUserRole(profile, options?.email);
  const isTester = role === "admin" || role === "tester";
  const isPermanentPremium = isTester;
  const premiumExpiresAt =
    typeof profile?.premium_expires_at === "string" && profile.premium_expires_at.trim()
      ? profile.premium_expires_at
      : null;
  const isCodePremium = isPremiumExpiryActive(premiumExpiresAt, now);
  // Timer presente (activo o vencido pendiente de limpieza) → no tratar is_premium como Stripe.
  const isFlagPremium = Boolean(profile?.is_premium) && !premiumExpiresAt;
  const hasGeneratedRealPhoto = Boolean(profile?.has_generated_real_photo);
  const hasPromoClaimable = Boolean(profile?.has_promo_claimable);
  const promoCodeRef =
    typeof profile?.promo_code_ref === "string" && profile.promo_code_ref.trim()
      ? profile.promo_code_ref.trim()
      : null;
  const premiumTrialClaimed = Boolean(profile?.premium_trial_claimed_at);

  // Promo pendiente: Free hasta activar (permite probar el flujo a testers).
  // Stripe (flag sin timer) y código activo tienen prioridad.
  const canUsePremiumFeatures = isCodePremium
    ? true
    : isFlagPremium
      ? true
      : hasPromoClaimable
        ? false
        : isPermanentPremium;

  const openaiPhotoCredits = hasGeneratedRealPhoto
    ? 0
    : Math.max(
        0,
        profile?.openai_photo_credits ?? (isPermanentPremium ? 1 : 0)
      );

  return {
    role,
    isTester,
    isPaidPremium: isPermanentPremium || isFlagPremium,
    isCodePremium,
    premiumExpiresAt: isCodePremium ? premiumExpiresAt : null,
    hasPromoClaimable,
    promoCodeRef,
    hasGeneratedRealPhoto,
    openaiPhotoCredits,
    premiumTrialRemaining: 0,
    premiumTrialClaimed,
    canUsePremiumFeatures,
    canSimulatePremiumTrial: false
  };
}

/** Texto corto del tiempo restante de Premium temporal. */
export function formatPremiumTimeRemaining(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (!expiresAt) return null;
  const endMs = Date.parse(expiresAt);
  if (Number.isNaN(endMs)) return null;
  const diffMs = endMs - now.getTime();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.ceil(diffMs / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
  }
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function usedPremiumRecipeFilters(filters: {
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
  servings: RecipeServings;
  complexity: RecipeComplexity;
}): boolean {
  return (
    isPremiumMealType(filters.mealType) ||
    isPremiumCuisineStyle(filters.cuisineStyle) ||
    isPremiumServings(filters.servings) ||
    isPremiumComplexity(filters.complexity)
  );
}
