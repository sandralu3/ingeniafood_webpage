import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { hasUnlimitedGenerations } from "@/lib/generations/admin-unlimited";

function isMissingSelfToggleColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("can_self_toggle_premium") === true ||
    error.message?.includes("schema cache") === true
  );
}

export type SelfPremiumToggleResult = {
  isPremium: boolean;
  canSelfTogglePremium: boolean;
};

export async function getSelfPremiumToggleState(
  userId: string
): Promise<SelfPremiumToggleResult | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("is_premium, can_self_toggle_premium")
    .eq("id", userId)
    .maybeSingle();

  if (error && isMissingSelfToggleColumnError(error)) {
    const { data: legacyData, error: legacyError } = await admin
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .maybeSingle();
    if (legacyError || !legacyData) {
      throw legacyError ?? new Error("No se encontró el perfil del usuario.");
    }
    return {
      isPremium: Boolean(legacyData.is_premium),
      canSelfTogglePremium: false
    };
  }

  if (error || !data) {
    throw error ?? new Error("No se encontró el perfil del usuario.");
  }

  return {
    isPremium: Boolean(data.is_premium),
    canSelfTogglePremium: Boolean(data.can_self_toggle_premium)
  };
}

export async function setSelfPremiumByUser(
  userId: string,
  isPremium: boolean,
  email?: string | null
): Promise<SelfPremiumToggleResult> {
  if (hasUnlimitedGenerations(email) && !isPremium) {
    throw new Error("No puedes desactivar Premium en una cuenta administradora.");
  }

  const admin = getSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("can_self_toggle_premium")
    .eq("id", userId)
    .maybeSingle();

  if (profileError && isMissingSelfToggleColumnError(profileError)) {
    throw new Error(
      "La autogestión Premium aún no está disponible. Pide a Sandra que aplique la migración en Supabase."
    );
  }

  if (profileError || !profile) {
    throw profileError ?? new Error("No se encontró el perfil del usuario.");
  }

  if (!profile.can_self_toggle_premium) {
    throw new Error("No tienes permiso para gestionar Premium desde tu perfil.");
  }

  const updatePayload = isPremium
    ? {
        is_premium: true,
        premium_trial_remaining: 0,
        premium_trial_claimed_at: null,
        updated_at: new Date().toISOString()
      }
    : {
        is_premium: false,
        updated_at: new Date().toISOString()
      };

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId)
    .select("is_premium, can_self_toggle_premium")
    .maybeSingle();

  if (updateError || !updated) {
    throw updateError ?? new Error("No se pudo actualizar Premium.");
  }

  return {
    isPremium: Boolean(updated.is_premium),
    canSelfTogglePremium: Boolean(updated.can_self_toggle_premium)
  };
}
