import {
  isPremiumCuisineStyle,
  isPremiumMealType,
  type RecipeCuisineStyle,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";

export type PremiumProfileRow = {
  is_premium: boolean | null;
  premium_trial_remaining?: number | null;
  premium_trial_claimed_at?: string | null;
};

export type PremiumAccess = {
  isPaidPremium: boolean;
  premiumTrialRemaining: number;
  premiumTrialClaimed: boolean;
  canUsePremiumFeatures: boolean;
  canSimulatePremiumTrial: boolean;
};

export const ADMIN_PREMIUM_ACCESS: PremiumAccess = {
  isPaidPremium: true,
  premiumTrialRemaining: 0,
  premiumTrialClaimed: false,
  canUsePremiumFeatures: true,
  canSimulatePremiumTrial: false
};

export type ResolvePremiumAccessOptions = {
  email?: string | null;
};

export function resolvePremiumAccess(
  profile: PremiumProfileRow | null | undefined,
  options?: ResolvePremiumAccessOptions
): PremiumAccess {
  if (isSandraAdmin(options?.email)) {
    return ADMIN_PREMIUM_ACCESS;
  }

  const premiumTrialRemaining = Math.max(0, profile?.premium_trial_remaining ?? 0);
  const premiumTrialClaimed = Boolean(profile?.premium_trial_claimed_at);
  // Suscripción real: is_premium sin prueba simulada activa (la prueba usa premium_trial_remaining).
  const isPaidPremium =
    Boolean(profile?.is_premium) && !premiumTrialClaimed && premiumTrialRemaining === 0;
  const canUsePremiumFeatures = isPaidPremium || premiumTrialRemaining > 0;
  const canSimulatePremiumTrial = !isPaidPremium && !premiumTrialClaimed;

  return {
    isPaidPremium,
    premiumTrialRemaining,
    premiumTrialClaimed,
    canUsePremiumFeatures,
    canSimulatePremiumTrial
  };
}

export function usedPremiumRecipeFilters(filters: {
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
}): boolean {
  return isPremiumMealType(filters.mealType) || isPremiumCuisineStyle(filters.cuisineStyle);
}
