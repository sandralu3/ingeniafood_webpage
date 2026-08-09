import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getTodayDateKey } from "@/lib/generations/date-utils";
import {
  FREE_DAILY_SCAN_LIMIT,
  PREMIUM_DAILY_SCAN_LIMIT,
  resolveEffectiveDailyScanLimit,
  UNLIMITED_GENERATIONS_SENTINEL
} from "@/lib/generations/constants";
import { hasUnlimitedGenerations } from "@/lib/generations/admin-unlimited";
import {
  isPremiumExpiryActive,
  resolvePremiumAccess
} from "@/lib/auth/premium-access";
import { clearExpiredCodePremium } from "@/lib/premium/claim-referral-promo";

type ProfileQuotaRow = {
  daily_scan_limit: number;
  scans_used_today: number;
  scan_quota_date: string;
  is_premium: boolean | null;
  is_tester?: boolean | null;
  role?: string | null;
  premium_expires_at: string | null;
  has_promo_claimable?: boolean | null;
};

const QUOTA_SELECT =
  "daily_scan_limit, scans_used_today, scan_quota_date, is_premium, is_tester, role, premium_expires_at, has_promo_claimable" as const;

async function getProfileQuotaRow(userId: string): Promise<ProfileQuotaRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(QUOTA_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ProfileQuotaRow;
}

async function ensureDailyQuotaReset(userId: string): Promise<ProfileQuotaRow | null> {
  const profile = await getProfileQuotaRow(userId);
  if (!profile) return null;

  const today = getTodayDateKey();
  if (profile.scan_quota_date === today) {
    return profile;
  }

  const admin = getSupabaseAdminClient();
  const { data: updated, error } = await admin
    .from("profiles")
    .update({
      scans_used_today: 0,
      scan_quota_date: today
    })
    .eq("id", userId)
    .select(QUOTA_SELECT)
    .maybeSingle();

  if (error || !updated) {
    return profile;
  }

  return updated as ProfileQuotaRow;
}

async function resolveQuotaContext(
  userId: string,
  email?: string | null
): Promise<{
  profile: ProfileQuotaRow;
  dailyLimit: number;
  isPremium: boolean;
} | null> {
  let profile = await ensureDailyQuotaReset(userId);
  if (!profile) return null;

  // Limpiar pase 24h vencido antes de calcular el tope.
  if (
    profile.premium_expires_at &&
    !isPremiumExpiryActive(profile.premium_expires_at)
  ) {
    await clearExpiredCodePremium(userId);
    profile = (await getProfileQuotaRow(userId)) ?? profile;
  }

  const access = resolvePremiumAccess(profile, { email });
  const isPremium = access.canUsePremiumFeatures;
  const dailyLimit = resolveEffectiveDailyScanLimit(profile.daily_scan_limit, isPremium);

  // Persistimos el tope Premium para que el admin UI y generations_left reflejen 20.
  if (isPremium && profile.daily_scan_limit < PREMIUM_DAILY_SCAN_LIMIT) {
    const admin = getSupabaseAdminClient();
    const { data: bumped } = await admin
      .from("profiles")
      .update({
        daily_scan_limit: PREMIUM_DAILY_SCAN_LIMIT,
        generations_left: Math.max(
          0,
          PREMIUM_DAILY_SCAN_LIMIT - profile.scans_used_today
        )
      })
      .eq("id", userId)
      .select(QUOTA_SELECT)
      .maybeSingle();

    if (bumped) {
      profile = bumped as ProfileQuotaRow;
    }
  }

  return { profile, dailyLimit, isPremium };
}

export type UserScanQuota = {
  remaining: number;
  dailyLimit: number;
  usedToday: number;
  unlimited: boolean;
};

export async function getUserScanQuota(
  userId: string,
  email?: string | null
): Promise<UserScanQuota | null> {
  if (hasUnlimitedGenerations(email)) {
    return {
      remaining: UNLIMITED_GENERATIONS_SENTINEL,
      dailyLimit: UNLIMITED_GENERATIONS_SENTINEL,
      usedToday: 0,
      unlimited: true
    };
  }

  const ctx = await resolveQuotaContext(userId, email);
  if (!ctx) return null;

  return {
    remaining: Math.max(0, ctx.dailyLimit - ctx.profile.scans_used_today),
    dailyLimit: ctx.dailyLimit,
    usedToday: ctx.profile.scans_used_today,
    unlimited: false
  };
}

export async function getGenerationsLeft(
  userId: string,
  email?: string | null
): Promise<number | null> {
  const quota = await getUserScanQuota(userId, email);
  return quota?.remaining ?? null;
}

export async function consumeGeneration(
  userId: string,
  email?: string | null
): Promise<number | null> {
  if (hasUnlimitedGenerations(email)) {
    return UNLIMITED_GENERATIONS_SENTINEL;
  }

  const ctx = await resolveQuotaContext(userId, email);
  if (!ctx || ctx.profile.scans_used_today >= ctx.dailyLimit) {
    return null;
  }

  const admin = getSupabaseAdminClient();
  const nextUsed = ctx.profile.scans_used_today + 1;
  const today = getTodayDateKey();
  const nextRemaining = Math.max(0, ctx.dailyLimit - nextUsed);

  const { data: updated, error } = await admin
    .from("profiles")
    .update({
      scans_used_today: nextUsed,
      scan_quota_date: today,
      generations_left: nextRemaining,
      // Mantener el tope alineado con el plan vigente.
      daily_scan_limit: ctx.isPremium
        ? Math.max(ctx.profile.daily_scan_limit, PREMIUM_DAILY_SCAN_LIMIT)
        : ctx.profile.daily_scan_limit
    })
    .eq("id", userId)
    .eq("scans_used_today", ctx.profile.scans_used_today)
    .eq("scan_quota_date", ctx.profile.scan_quota_date)
    .select("daily_scan_limit, scans_used_today")
    .maybeSingle();

  if (error || !updated) {
    return null;
  }

  const effective = resolveEffectiveDailyScanLimit(
    updated.daily_scan_limit,
    ctx.isPremium
  );
  return Math.max(0, effective - updated.scans_used_today);
}

export { FREE_DAILY_SCAN_LIMIT, PREMIUM_DAILY_SCAN_LIMIT };
