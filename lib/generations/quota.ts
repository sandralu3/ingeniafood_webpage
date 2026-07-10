import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getTodayDateKey } from "@/lib/generations/date-utils";
import {
  hasUnlimitedGenerations,
  UNLIMITED_GENERATIONS_SENTINEL
} from "@/lib/generations/admin-unlimited";

type ProfileQuotaRow = {
  daily_scan_limit: number;
  scans_used_today: number;
  scan_quota_date: string;
};

async function getProfileQuotaRow(userId: string): Promise<ProfileQuotaRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("daily_scan_limit, scans_used_today, scan_quota_date")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
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
    .select("daily_scan_limit, scans_used_today, scan_quota_date")
    .maybeSingle();

  if (error || !updated) {
    return profile;
  }

  return updated;
}

function computeRemainingScans(profile: ProfileQuotaRow): number {
  return Math.max(0, profile.daily_scan_limit - profile.scans_used_today);
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

  const profile = await ensureDailyQuotaReset(userId);
  if (!profile) return null;

  return {
    remaining: computeRemainingScans(profile),
    dailyLimit: profile.daily_scan_limit,
    usedToday: profile.scans_used_today,
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

  const profile = await ensureDailyQuotaReset(userId);
  if (!profile || profile.scans_used_today >= profile.daily_scan_limit) {
    return null;
  }

  const admin = getSupabaseAdminClient();
  const nextUsed = profile.scans_used_today + 1;
  const today = getTodayDateKey();

  const { data: updated, error } = await admin
    .from("profiles")
    .update({
      scans_used_today: nextUsed,
      scan_quota_date: today,
      generations_left: Math.max(0, profile.daily_scan_limit - nextUsed)
    })
    .eq("id", userId)
    .eq("scans_used_today", profile.scans_used_today)
    .eq("scan_quota_date", profile.scan_quota_date)
    .select("daily_scan_limit, scans_used_today")
    .maybeSingle();

  if (error || !updated) {
    return null;
  }

  return Math.max(0, updated.daily_scan_limit - updated.scans_used_today);
}
