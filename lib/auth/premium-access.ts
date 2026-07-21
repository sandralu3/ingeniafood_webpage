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
import { isSandraAdmin } from "@/lib/auth/sandra-admin";

export type PremiumProfileRow = {
  is_premium: boolean | null;
  is_tester?: boolean | null;
  openai_photo_credits?: number | null;
  premium_trial_remaining?: number | null;
  premium_trial_claimed_at?: string | null;
};

export type PremiumAccess = {
  /** Solo testers ven/usan Premium, Stripe y foto OpenAI. */
  isTester: boolean;
  isPaidPremium: boolean;
  /** Generaciones de foto OpenAI restantes (testers: máx. 1). */
  openaiPhotoCredits: number;
  premiumTrialRemaining: number;
  premiumTrialClaimed: boolean;
  canUsePremiumFeatures: boolean;
  canSimulatePremiumTrial: boolean;
};

export const EMPTY_PREMIUM_ACCESS: PremiumAccess = {
  isTester: false,
  isPaidPremium: false,
  openaiPhotoCredits: 0,
  premiumTrialRemaining: 0,
  premiumTrialClaimed: false,
  canUsePremiumFeatures: false,
  canSimulatePremiumTrial: false
};

/** Tester forzado (admin Sandra) sin Premium de pago hasta suscribirse en Stripe. */
export const ADMIN_TESTER_ACCESS: PremiumAccess = {
  isTester: true,
  isPaidPremium: false,
  openaiPhotoCredits: 1,
  premiumTrialRemaining: 0,
  premiumTrialClaimed: false,
  canUsePremiumFeatures: false,
  canSimulatePremiumTrial: true
};

/** @deprecated Usar ADMIN_TESTER_ACCESS. Ya no fuerza isPaidPremium. */
export const ADMIN_PREMIUM_ACCESS = ADMIN_TESTER_ACCESS;

export type ResolvePremiumAccessOptions = {
  email?: string | null;
};

export function resolvePremiumAccess(
  profile: PremiumProfileRow | null | undefined,
  options?: ResolvePremiumAccessOptions
): PremiumAccess {
  const isTester = isSandraAdmin(options?.email) || profile?.is_tester === true;
  if (!isTester) {
    // Usuarios normales: sin rastro de Premium / trial / Stripe.
    return EMPTY_PREMIUM_ACCESS;
  }

  const premiumTrialRemaining = Math.max(0, profile?.premium_trial_remaining ?? 0);
  const premiumTrialClaimed = Boolean(profile?.premium_trial_claimed_at);
  const isPaidPremium =
    Boolean(profile?.is_premium) && !premiumTrialClaimed && premiumTrialRemaining === 0;
  const canUsePremiumFeatures = isPaidPremium || premiumTrialRemaining > 0;
  const canSimulatePremiumTrial = !isPaidPremium && !premiumTrialClaimed;

  return {
    isTester: true,
    isPaidPremium,
    openaiPhotoCredits: Math.max(
      0,
      profile?.openai_photo_credits ?? (isSandraAdmin(options?.email) ? 1 : 0)
    ),
    premiumTrialRemaining,
    premiumTrialClaimed,
    canUsePremiumFeatures,
    canSimulatePremiumTrial
  };
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
