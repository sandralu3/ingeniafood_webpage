import {
  resolvePremiumAccess,
  type PremiumAccess
} from "@/lib/auth/premium-access";
import type { createSupabaseRouteClient } from "@/lib/supabaseRoute";

type SupabaseRouteClient = NonNullable<Awaited<ReturnType<typeof createSupabaseRouteClient>>>;

const PREMIUM_PROFILE_SELECT =
  "is_premium, is_tester, openai_photo_credits, premium_trial_remaining, premium_trial_claimed_at" as const;

export async function getUserPremiumAccess(
  supabase: SupabaseRouteClient,
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

  return { access: resolvePremiumAccess(profile, { email }) };
}

/** Compat: true si el usuario puede usar funciones Premium (pago o prueba activa). */
export async function getUserIsPremium(
  supabase: SupabaseRouteClient,
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
