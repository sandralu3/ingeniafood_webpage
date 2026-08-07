import type { SupabaseClient } from "@supabase/supabase-js";
import { clearExpiredCodePremium } from "@/lib/premium/claim-referral-promo";
import {
  resolvePremiumAccess,
  type PremiumAccess
} from "@/lib/auth/premium-access";
import type { Database } from "@/types/database.types";

type AppSupabaseClient = SupabaseClient<Database>;

export const PREMIUM_PROFILE_SELECT =
  "is_premium, is_tester, role, premium_expires_at, has_generated_real_photo, redeemed_code, has_promo_claimable, promo_code_ref, openai_photo_credits, premium_trial_remaining, premium_trial_claimed_at" as const;

export async function getUserPremiumAccess(
  supabase: AppSupabaseClient,
  userId: string,
  email?: string | null
): Promise<{ access: PremiumAccess; error?: string }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PREMIUM_PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return {
      access: resolvePremiumAccess(null, { email }),
      error: "No pudimos validar tu plan de suscripción."
    };
  }

  const access = resolvePremiumAccess(profile, { email });

  if (
    profile?.premium_expires_at &&
    !access.isCodePremium &&
    Date.parse(profile.premium_expires_at) <= Date.now()
  ) {
    void clearExpiredCodePremium(userId);
  }

  return { access };
}

/** Compat: true si el usuario puede usar funciones Premium (suscripción / pase temporal / rol). */
export async function getUserIsPremium(
  supabase: AppSupabaseClient,
  userId: string,
  email?: string | null
): Promise<{ isPremium: boolean; access: PremiumAccess; error?: string }> {
  const result = await getUserPremiumAccess(supabase, userId, email);
  return {
    isPremium: result.access.canUsePremiumFeatures,
    access: result.access,
    error: result.error
  };
}
