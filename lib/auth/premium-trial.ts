import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { resolvePremiumAccess, type PremiumAccess } from "@/lib/auth/premium-access";

/**
 * La prueba Premium de 1 uso fue retirada.
 * Se mantiene el módulo por compatibilidad con imports legacy.
 */
export async function claimPremiumTrial(
  _userId: string,
  _email?: string | null
): Promise<
  | { ok: true; access: PremiumAccess }
  | { ok: false; code: "ALREADY_PREMIUM" | "ALREADY_CLAIMED" | "UPDATE_FAILED" | "DISABLED" }
> {
  return { ok: false, code: "DISABLED" };
}

/** @deprecated La prueba de 1 uso ya no se consume. */
export async function consumePremiumTrialUse(userId: string): Promise<number> {
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("premium_trial_remaining")
    .eq("id", userId)
    .maybeSingle();

  return Math.max(0, profile?.premium_trial_remaining ?? 0);
}
