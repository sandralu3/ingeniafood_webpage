import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { isPremiumExpiryActive } from "@/lib/auth/premium-access";

const DEFAULT_DURATION_HOURS = 24;

export type RedeemPremiumCodeResult =
  | {
      ok: true;
      expiresAt: string;
      durationHours: number;
      message: string;
    }
  | {
      ok: false;
      code:
        | "INVALID"
        | "INACTIVE"
        | "EXHAUSTED"
        | "ALREADY_ACTIVE"
        | "ALREADY_REDEEMED"
        | "NO_USER"
        | "DB_ERROR";
      error: string;
    };

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function envFallbackCodes(): Set<string> {
  const raw = process.env.PREMIUM_ACCESS_CODES?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((item) => normalizeCode(item))
      .filter(Boolean)
  );
}

/**
 * Canjea un código Premium temporal (default 24h).
 * Persistido en DB: premium_expires_at + redeemed_code + redemptions audit.
 */
export async function redeemPremiumAccessCode(
  userId: string,
  rawCode: string
): Promise<RedeemPremiumCodeResult> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return { ok: false, code: "NO_USER", error: "Debes iniciar sesión." };
  }

  const code = normalizeCode(rawCode);
  if (!code || code.length < 4) {
    return { ok: false, code: "INVALID", error: "Código no válido." };
  }

  const admin = getSupabaseAdminClient();
  const now = new Date();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("premium_expires_at, redeemed_code, role, is_tester, is_premium")
    .eq("id", trimmedUserId)
    .maybeSingle();

  if (profileError) {
    console.error("[premium-code] profile read", profileError.message);
    return { ok: false, code: "DB_ERROR", error: "No pudimos validar el código." };
  }

  if (isPremiumExpiryActive(profile?.premium_expires_at, now)) {
    return {
      ok: false,
      code: "ALREADY_ACTIVE",
      error: "Ya tienes un acceso Premium temporal activo."
    };
  }

  const { data: codeRow, error: codeError } = await admin
    .from("premium_access_codes")
    .select("code, duration_hours, max_redemptions, redemption_count, is_active")
    .eq("code", code)
    .maybeSingle();

  if (codeError) {
    console.error("[premium-code] code read", codeError.message);
    return { ok: false, code: "DB_ERROR", error: "No pudimos validar el código." };
  }

  let durationHours = DEFAULT_DURATION_HOURS;
  let fromEnvFallback = false;

  if (codeRow) {
    if (!codeRow.is_active) {
      return { ok: false, code: "INACTIVE", error: "Este código ya no está activo." };
    }
    if (
      codeRow.max_redemptions != null &&
      codeRow.redemption_count >= codeRow.max_redemptions
    ) {
      return {
        ok: false,
        code: "EXHAUSTED",
        error: "Este código alcanzó el máximo de canjes."
      };
    }
    durationHours = codeRow.duration_hours || DEFAULT_DURATION_HOURS;
  } else if (envFallbackCodes().has(code)) {
    fromEnvFallback = true;
    durationHours = DEFAULT_DURATION_HOURS;
  } else {
    return { ok: false, code: "INVALID", error: "Código no válido." };
  }

  const { data: priorRedemption } = await admin
    .from("premium_code_redemptions")
    .select("id")
    .eq("user_id", trimmedUserId)
    .eq("code", code)
    .maybeSingle();

  if (priorRedemption?.id) {
    return {
      ok: false,
      code: "ALREADY_REDEEMED",
      error: "Ya canjeaste este código anteriormente."
    };
  }

  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString();

  if (fromEnvFallback) {
    await admin.from("premium_access_codes").upsert(
      {
        code,
        label: "Env fallback",
        duration_hours: durationHours,
        is_active: true,
        redemption_count: 0
      },
      { onConflict: "code" }
    );
  }

  const { error: redeemInsertError } = await admin.from("premium_code_redemptions").insert({
    user_id: trimmedUserId,
    code,
    redeemed_at: now.toISOString(),
    expires_at: expiresAt
  });

  if (redeemInsertError) {
    if (redeemInsertError.code === "23505") {
      return {
        ok: false,
        code: "ALREADY_REDEEMED",
        error: "Ya canjeaste este código anteriormente."
      };
    }
    console.error("[premium-code] redemption insert", redeemInsertError.message);
    return { ok: false, code: "DB_ERROR", error: "No pudimos canjear el código." };
  }

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({
      premium_expires_at: expiresAt,
      redeemed_code: code,
      updated_at: now.toISOString()
    })
    .eq("id", trimmedUserId);

  if (profileUpdateError) {
    console.error("[premium-code] profile update", profileUpdateError.message);
    return { ok: false, code: "DB_ERROR", error: "No pudimos activar el acceso Premium." };
  }

  if (codeRow || fromEnvFallback) {
    const nextCount = (codeRow?.redemption_count ?? 0) + 1;
    await admin
      .from("premium_access_codes")
      .update({ redemption_count: nextCount })
      .eq("code", code);
  }

  return {
    ok: true,
    expiresAt,
    durationHours,
    message: "¡Felicidades! Tienes 24 horas de acceso Premium ilimitado."
  };
}

export { clearExpiredCodePremium } from "@/lib/premium/claim-referral-promo";
