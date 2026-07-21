import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { resolvePremiumAccess, type PremiumAccess } from "@/lib/auth/premium-access";

export async function claimPremiumTrial(
  userId: string,
  email?: string | null
): Promise<
  | { ok: true; access: PremiumAccess }
  | { ok: false; code: "ALREADY_PREMIUM" | "ALREADY_CLAIMED" | "UPDATE_FAILED" }
> {
  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("is_premium, is_tester, openai_photo_credits, premium_trial_remaining, premium_trial_claimed_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return { ok: false, code: "UPDATE_FAILED" };
  }

  if (profile.is_tester !== true) {
    return { ok: false, code: "UPDATE_FAILED" };
  }

  const access = resolvePremiumAccess(profile, { email });
  if (access.isPaidPremium) {
    return { ok: false, code: "ALREADY_PREMIUM" };
  }
  if (access.premiumTrialClaimed) {
    return { ok: false, code: "ALREADY_CLAIMED" };
  }

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({
      is_premium: false,
      premium_trial_remaining: 1,
      premium_trial_claimed_at: new Date().toISOString()
    })
    .eq("id", userId)
    .eq("is_tester", true)
    .is("premium_trial_claimed_at", null)
    .select("is_premium, is_tester, openai_photo_credits, premium_trial_remaining, premium_trial_claimed_at")
    .maybeSingle();

  if (updateError || !updated) {
    return { ok: false, code: "UPDATE_FAILED" };
  }

  return { ok: true, access: resolvePremiumAccess(updated, { email }) };
}

export async function consumePremiumTrialUse(userId: string): Promise<number> {
  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("premium_trial_remaining")
    .eq("id", userId)
    .maybeSingle();

  const remaining = profile?.premium_trial_remaining ?? 0;
  if (error || !profile || remaining <= 0) {
    return remaining;
  }

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ premium_trial_remaining: 0 })
    .eq("id", userId)
    .gt("premium_trial_remaining", 0)
    .select("premium_trial_remaining")
    .maybeSingle();

  if (updateError || !updated) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[premium-trial] No se pudo consumir la prueba:", updateError?.message);
    }
    return remaining;
  }

  return updated.premium_trial_remaining ?? 0;
}
