import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  evaluateSubscriptionAccess,
  getSubscriptionAccess
} from "@/lib/billing/has-valid-subscription";
import {
  isPremiumExpiryActive,
  resolveUserRole
} from "@/lib/auth/premium-access";
import {
  FREE_DAILY_SCAN_LIMIT,
  PREMIUM_DAILY_SCAN_LIMIT
} from "@/lib/generations/constants";
import type { SubscriptionRow } from "@/types/subscription";

const PROMO_DURATION_HOURS = 24;
/** Promo de bienvenida para nuevos registros (sin ?ref=). */
export const WELCOME_PROMO_REF = "WELCOME";


export type AttachReferralPromoResult =
  | { ok: true; alreadyClaimable: boolean; attached: boolean }
  | {
      ok: false;
      code: "NO_USER" | "INVALID" | "ALREADY_CLAIMED" | "ALREADY_ACTIVE" | "DB_ERROR";
      error: string;
    };

export type ClaimReferralPromoResult =
  | { ok: true; expiresAt: string; message: string }
  | {
      ok: false;
      code: "NO_USER" | "NOTHING_TO_CLAIM" | "ALREADY_ACTIVE" | "DB_ERROR";
      error: string;
    };

export type ResetTesterPromoResult =
  | { ok: true }
  | { ok: false; code: "NO_USER" | "FORBIDDEN" | "DB_ERROR"; error: string };

function normalizeRef(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function hasConsumedPromo(profile: {
  has_promo_claimable?: boolean | null;
  promo_code_ref?: string | null;
  redeemed_code?: string | null;
  premium_expires_at?: string | null;
}): boolean {
  // Ya reclamó y activó (redeemed) o tiene ref histórico sin claimable pendiente.
  if (profile.has_promo_claimable === true) return false;
  if (profile.redeemed_code) return true;
  if (profile.promo_code_ref && !profile.has_promo_claimable) {
    // Tuvo promo y ya no está pendiente → consumida (activa o expirada).
    return true;
  }
  return false;
}

/**
 * Marca promo reclamable SIN activar Premium.
 * Sirve para registro nuevo y usuarios existentes con sesión + ?ref=.
 */
export async function attachReferralPromo(
  userId: string,
  rawRef: string
): Promise<AttachReferralPromoResult> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return { ok: false, code: "NO_USER", error: "Debes iniciar sesión." };
  }

  const ref = normalizeRef(rawRef);
  if (!ref || ref.length < 2) {
    return { ok: false, code: "INVALID", error: "Referencia no válida." };
  }

  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "has_promo_claimable, promo_code_ref, premium_expires_at, redeemed_code, is_premium, role, is_tester"
    )
    .eq("id", trimmedUserId)
    .maybeSingle();

  if (error) {
    console.error("[referral-promo] attach read", error.message);
    return { ok: false, code: "DB_ERROR", error: "No pudimos guardar la promoción." };
  }

  if (profile?.has_promo_claimable === true) {
    return { ok: true, alreadyClaimable: true, attached: false };
  }

  if (isPremiumExpiryActive(profile?.premium_expires_at)) {
    return {
      ok: false,
      code: "ALREADY_ACTIVE",
      error: "Ya tienes Premium temporal activo."
    };
  }

  if (hasConsumedPromo(profile ?? {})) {
    return {
      ok: false,
      code: "ALREADY_CLAIMED",
      error: "Esta cuenta ya usó su promoción de acceso."
    };
  }

  const nowIso = new Date().toISOString();
  // No forzar is_premium=false si el rol es permanente; el banner usa canUsePremiumFeatures.
  // Solo dejamos la promo pendiente de activar.
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      has_promo_claimable: true,
      promo_code_ref: ref,
      updated_at: nowIso
    })
    .eq("id", trimmedUserId)
    .eq("has_promo_claimable", false);

  if (updateError) {
    console.error("[referral-promo] attach update", updateError.message);
    return { ok: false, code: "DB_ERROR", error: "No pudimos guardar la promoción." };
  }

  return { ok: true, alreadyClaimable: false, attached: true };
}

/**
 * Otorga el pase 24h reclamable de bienvenida si la cuenta nunca tuvo promo.
 * No pisa una promo de referido pendiente ni una ya consumida.
 */
export async function ensureWelcomePromoClaimable(
  userId: string
): Promise<{ attached: boolean; alreadyClaimable: boolean }> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return { attached: false, alreadyClaimable: false };
  }

  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "has_promo_claimable, promo_code_ref, premium_expires_at, redeemed_code, is_premium, role, is_tester"
    )
    .eq("id", trimmedUserId)
    .maybeSingle();

  if (error || !profile) {
    if (error) {
      console.error("[referral-promo] welcome read", error.message);
    }
    return { attached: false, alreadyClaimable: false };
  }

  if (profile.has_promo_claimable === true) {
    return { attached: false, alreadyClaimable: true };
  }

  if (isPremiumExpiryActive(profile.premium_expires_at)) {
    return { attached: false, alreadyClaimable: false };
  }

  if (hasConsumedPromo(profile)) {
    return { attached: false, alreadyClaimable: false };
  }

  const role = resolveUserRole(
    {
      is_premium: profile.is_premium,
      role: profile.role,
      is_tester: profile.is_tester
    },
    null
  );
  // Admin/tester permanentes ya tienen Premium; no hace falta banner de bienvenida.
  if (role === "admin" || role === "tester") {
    return { attached: false, alreadyClaimable: false };
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({
      has_promo_claimable: true,
      promo_code_ref: WELCOME_PROMO_REF,
      updated_at: nowIso
    })
    .eq("id", trimmedUserId)
    .eq("has_promo_claimable", false)
    .is("promo_code_ref", null)
    .is("redeemed_code", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[referral-promo] welcome update", updateError.message);
    return { attached: false, alreadyClaimable: false };
  }

  return { attached: Boolean(updated?.id), alreadyClaimable: false };
}

/**
 * Activa las 24h Premium desde el botón de HOY.
 */
export async function claimReferralPromo24h(
  userId: string
): Promise<ClaimReferralPromoResult> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return { ok: false, code: "NO_USER", error: "Debes iniciar sesión." };
  }

  const admin = getSupabaseAdminClient();
  const now = new Date();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("has_promo_claimable, promo_code_ref, premium_expires_at, is_premium")
    .eq("id", trimmedUserId)
    .maybeSingle();

  if (error) {
    console.error("[referral-promo] claim read", error.message);
    return { ok: false, code: "DB_ERROR", error: "No pudimos activar la promoción." };
  }

  if (isPremiumExpiryActive(profile?.premium_expires_at, now)) {
    return {
      ok: false,
      code: "ALREADY_ACTIVE",
      error: "Ya tienes un acceso Premium temporal activo."
    };
  }

  if (profile?.has_promo_claimable !== true) {
    return {
      ok: false,
      code: "NOTHING_TO_CLAIM",
      error: "No tienes una promoción pendiente por activar."
    };
  }

  const expiresAt = new Date(
    now.getTime() + PROMO_DURATION_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({
      is_premium: true,
      premium_expires_at: expiresAt,
      has_promo_claimable: false,
      redeemed_code: profile.promo_code_ref ?? "REFERRAL",
      daily_scan_limit: PREMIUM_DAILY_SCAN_LIMIT,
      updated_at: now.toISOString()
    })
    .eq("id", trimmedUserId)
    .eq("has_promo_claimable", true)
    .select("id")
    .maybeSingle();

  if (updateError || !updated?.id) {
    console.error("[referral-promo] claim update", updateError?.message);
    return { ok: false, code: "DB_ERROR", error: "No pudimos activar la promoción." };
  }

  return {
    ok: true,
    expiresAt,
    message: "¡Tu pase Premium de 24 horas ya está activo! Disfruta la experiencia."
  };
}

/**
 * Reset de prueba Premium (solo tester/admin) para validar el flujo en beta.
 */
export async function resetTesterPremiumTrial(
  userId: string,
  email?: string | null
): Promise<ResetTesterPromoResult> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return { ok: false, code: "NO_USER", error: "Debes iniciar sesión." };
  }

  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role, is_tester")
    .eq("id", trimmedUserId)
    .maybeSingle();

  if (error) {
    console.error("[referral-promo] reset read", error.message);
    return { ok: false, code: "DB_ERROR", error: "No pudimos resetear la prueba." };
  }

  const role = resolveUserRole(
    { is_premium: null, role: profile?.role, is_tester: profile?.is_tester },
    email
  );
  if (role !== "admin" && role !== "tester") {
    return {
      ok: false,
      code: "FORBIDDEN",
      error: "Solo testers y admin pueden resetear la prueba."
    };
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      is_premium: false,
      has_promo_claimable: true,
      premium_expires_at: null,
      has_generated_real_photo: false,
      openai_photo_credits: 1,
      redeemed_code: null,
      promo_code_ref: "TESTER_RESET",
      updated_at: nowIso
    })
    .eq("id", trimmedUserId);

  if (updateError) {
    console.error("[referral-promo] reset update", updateError.message);
    return { ok: false, code: "DB_ERROR", error: "No pudimos resetear la prueba." };
  }

  return { ok: true };
}

/**
 * Limpia Premium temporal vencido.
 * Si no hay Stripe/Paddle activo, también baja is_premium.
 */
export async function clearExpiredCodePremium(userId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { access } = await getSubscriptionAccess(admin, userId);
  const patch: {
    premium_expires_at: null;
    updated_at: string;
    is_premium?: boolean;
    daily_scan_limit?: number;
  } = {
    premium_expires_at: null,
    updated_at: nowIso
  };

  if (!access.hasValidSubscription) {
    patch.is_premium = false;
    // Vuelve al tope free al caducar el pase 24h (si no hay suscripción).
    patch.daily_scan_limit = FREE_DAILY_SCAN_LIMIT;
  }

  await admin
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .lt("premium_expires_at", nowIso);
}

export type ClearExpiredCodePremiumsResult = {
  scanned: number;
  cleared: number;
  keptPremiumForSubscription: number;
  errors: number;
};

/**
 * Job masivo: limpia todos los pases 24h con `premium_expires_at` vencido.
 * Conserva `redeemed_code` como histórico de uso.
 */
export async function clearAllExpiredCodePremiums(): Promise<ClearExpiredCodePremiumsResult> {
  const admin = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: expiredRows, error: listError } = await admin
    .from("profiles")
    .select("id")
    .not("premium_expires_at", "is", null)
    .lt("premium_expires_at", nowIso)
    .limit(500);

  if (listError) {
    console.error("[referral-promo] clearAll list", listError.message);
    throw new Error("No pudimos listar pases 24h caducados.");
  }

  const ids = (expiredRows ?? []).map((row) => row.id).filter(Boolean);
  if (!ids.length) {
    return { scanned: 0, cleared: 0, keptPremiumForSubscription: 0, errors: 0 };
  }

  const { data: subscriptions, error: subError } = await admin
    .from("subscriptions")
    .select("user_id, status, current_period_end")
    .in("user_id", ids);

  if (subError) {
    console.error("[referral-promo] clearAll subscriptions", subError.message);
  }

  const subscribed = new Set<string>();
  for (const row of subscriptions ?? []) {
    const access = evaluateSubscriptionAccess({
      user_id: row.user_id,
      status: row.status,
      current_period_end: row.current_period_end,
      paddle_customer_id: null,
      paddle_subscription_id: null,
      price_id: null,
      created_at: nowIso,
      updated_at: nowIso
    } as SubscriptionRow);
    if (access.hasValidSubscription) {
      subscribed.add(row.user_id);
    }
  }

  let cleared = 0;
  let keptPremiumForSubscription = 0;
  let errors = 0;

  for (const userId of ids) {
    const hasSub = subscribed.has(userId);
    const patch: {
      premium_expires_at: null;
      updated_at: string;
      is_premium?: boolean;
      daily_scan_limit?: number;
    } = {
      premium_expires_at: null,
      updated_at: nowIso
    };

    if (hasSub) {
      keptPremiumForSubscription += 1;
    } else {
      patch.is_premium = false;
      patch.daily_scan_limit = FREE_DAILY_SCAN_LIMIT;
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .lt("premium_expires_at", nowIso);

    if (updateError) {
      console.error("[referral-promo] clearAll update", userId, updateError.message);
      errors += 1;
      continue;
    }
    cleared += 1;
  }

  return {
    scanned: ids.length,
    cleared,
    keptPremiumForSubscription,
    errors
  };
}
