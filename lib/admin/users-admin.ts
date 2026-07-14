import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getTodayDateKey } from "@/lib/generations/date-utils";
import { hasUnlimitedGenerations, UNLIMITED_GENERATIONS_SENTINEL } from "@/lib/generations/admin-unlimited";

export type AdminUserListItem = {
  id: string;
  fullName: string | null;
  email: string;
  dailyScanLimit: number;
  scansUsedToday: number;
  scansRemainingToday: number;
  createdAt: string;
  unlimitedScans: boolean;
  isPremium: boolean;
  canSelfTogglePremium: boolean;
  premiumTrialRemaining: number;
  premiumTrialClaimed: boolean;
};

const MAX_DAILY_SCAN_LIMIT = 500;

const ADMIN_PROFILE_SELECT =
  "id, full_name, daily_scan_limit, scans_used_today, scan_quota_date, created_at, is_premium, can_self_toggle_premium, premium_trial_remaining, premium_trial_claimed_at" as const;

const ADMIN_PROFILE_SELECT_LEGACY =
  "id, full_name, daily_scan_limit, scans_used_today, scan_quota_date, created_at, is_premium, premium_trial_remaining, premium_trial_claimed_at" as const;

type AdminProfileRow = {
  id: string;
  full_name: string | null;
  daily_scan_limit: number;
  scans_used_today: number;
  scan_quota_date: string;
  created_at: string;
  is_premium: boolean;
  can_self_toggle_premium?: boolean;
  premium_trial_remaining: number;
  premium_trial_claimed_at: string | null;
};

function isMissingSelfToggleColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("can_self_toggle_premium") === true ||
    error.message?.includes("Could not find the 'can_self_toggle_premium' column") === true ||
    error.message?.includes("schema cache") === true
  );
}

function normalizeAdminProfileRow(profile: AdminProfileRow): AdminProfileRow {
  return {
    ...profile,
    can_self_toggle_premium: Boolean(profile.can_self_toggle_premium)
  };
}

async function fetchAdminProfiles(
  admin: ReturnType<typeof getSupabaseAdminClient>
): Promise<AdminProfileRow[]> {
  const { data, error } = await admin
    .from("profiles")
    .select(ADMIN_PROFILE_SELECT)
    .order("created_at", { ascending: false });

  if (!error) {
    return (data ?? []).map((profile) => normalizeAdminProfileRow(profile as AdminProfileRow));
  }

  if (!isMissingSelfToggleColumnError(error)) {
    throw error;
  }

  const { data: legacyData, error: legacyError } = await admin
    .from("profiles")
    .select(ADMIN_PROFILE_SELECT_LEGACY)
    .order("created_at", { ascending: false });

  if (legacyError) {
    throw legacyError;
  }

  return (legacyData ?? []).map((profile) =>
    normalizeAdminProfileRow({
      ...(profile as AdminProfileRow),
      can_self_toggle_premium: false
    })
  );
}

function buildAdminUserListItem(
  profile: AdminProfileRow,
  email: string,
  createdAtFallback: string
): AdminUserListItem {
  const unlimitedScans = hasUnlimitedGenerations(email);
  const dailyScanLimit = profile.daily_scan_limit ?? 5;
  const scansUsedToday = computeScansUsedToday(profile.scans_used_today, profile.scan_quota_date);

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: email || "—",
    dailyScanLimit: unlimitedScans ? UNLIMITED_GENERATIONS_SENTINEL : dailyScanLimit,
    scansUsedToday,
    scansRemainingToday: unlimitedScans
      ? UNLIMITED_GENERATIONS_SENTINEL
      : Math.max(0, dailyScanLimit - scansUsedToday),
    createdAt: profile.created_at ?? createdAtFallback,
    unlimitedScans,
    isPremium: unlimitedScans || Boolean(profile.is_premium),
    canSelfTogglePremium: Boolean(profile.can_self_toggle_premium),
    premiumTrialRemaining: Math.max(0, profile.premium_trial_remaining ?? 0),
    premiumTrialClaimed: Boolean(profile.premium_trial_claimed_at)
  };
}

function computeScansUsedToday(scansUsedToday: number, scanQuotaDate: string): number {
  return scanQuotaDate === getTodayDateKey() ? scansUsedToday : 0;
}

export async function listAdminUsers(): Promise<AdminUserListItem[]> {
  const admin = getSupabaseAdminClient();
  const profiles = await fetchAdminProfiles(admin);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const authUsers: Array<{ id: string; email?: string; created_at: string }> = [];

  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw error;
    }

    authUsers.push(
      ...data.users.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }))
    );

    if (data.users.length < 200) break;
    page += 1;
  }

  return authUsers
    .map((user) => {
      const profile = profileById.get(user.id);
      if (!profile) {
        return null;
      }

      return buildAdminUserListItem(
        profile as AdminProfileRow,
        user.email ?? "—",
        user.created_at
      );
    })
    .filter((user): user is AdminUserListItem => user !== null)
    .sort((a, b) => a.email.localeCompare(b.email, "es"));
}

export type DeletedAdminUser = {
  id: string;
  email: string;
};

export async function deleteAdminUser(
  userId: string,
  options?: { requesterUserId?: string | null }
): Promise<DeletedAdminUser> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    throw new Error("Debes indicar el usuario a eliminar.");
  }

  if (options?.requesterUserId && options.requesterUserId === trimmedUserId) {
    throw new Error("No puedes eliminar tu propia cuenta desde este panel.");
  }

  const admin = getSupabaseAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(trimmedUserId);
  if (authError || !authData.user) {
    throw authError ?? new Error("No se encontró el usuario en autenticación.");
  }

  if (hasUnlimitedGenerations(authData.user.email)) {
    throw new Error("No se puede eliminar la cuenta administradora.");
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(trimmedUserId, false);
  if (deleteError) {
    throw deleteError;
  }

  await admin.from("profiles").delete().eq("id", trimmedUserId);

  return {
    id: trimmedUserId,
    email: authData.user.email ?? "—"
  };
}

export async function updateUserDailyScanLimit(
  userId: string,
  dailyScanLimit: number
): Promise<AdminUserListItem> {
  if (!Number.isInteger(dailyScanLimit) || dailyScanLimit < 0 || dailyScanLimit > MAX_DAILY_SCAN_LIMIT) {
    throw new Error(`El límite diario debe ser un entero entre 0 y ${MAX_DAILY_SCAN_LIMIT}.`);
  }

  const admin = getSupabaseAdminClient();

  const { data: updatedProfile, error: updateError } = await admin
    .from("profiles")
    .update({
      daily_scan_limit: dailyScanLimit,
      generations_left: dailyScanLimit
    })
    .eq("id", userId)
    .select(ADMIN_PROFILE_SELECT)
    .maybeSingle();

  let profile = updatedProfile as AdminProfileRow | null;
  if (updateError && isMissingSelfToggleColumnError(updateError)) {
    const { data: legacyProfile, error: legacyError } = await admin
      .from("profiles")
      .update({
        daily_scan_limit: dailyScanLimit,
        generations_left: dailyScanLimit
      })
      .eq("id", userId)
      .select(ADMIN_PROFILE_SELECT_LEGACY)
      .maybeSingle();
    if (legacyError || !legacyProfile) {
      throw legacyError ?? new Error("No se encontró el perfil del usuario.");
    }
    profile = { ...(legacyProfile as AdminProfileRow), can_self_toggle_premium: false };
  } else if (updateError || !profile) {
    throw updateError ?? new Error("No se encontró el perfil del usuario.");
  }

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) {
    throw authError ?? new Error("No se encontró el usuario.");
  }

  return buildAdminUserListItem(
    normalizeAdminProfileRow(profile),
    authData.user.email ?? "—",
    authData.user.created_at
  );
}

export async function updateUserPremiumStatus(
  userId: string,
  isPremium: boolean
): Promise<AdminUserListItem> {
  const admin = getSupabaseAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) {
    throw authError ?? new Error("No se encontró el usuario.");
  }

  if (hasUnlimitedGenerations(authData.user.email) && !isPremium) {
    throw new Error("No se puede quitar Premium a la cuenta administradora.");
  }

  const updatePayload = isPremium
    ? {
        is_premium: true,
        premium_trial_remaining: 0,
        premium_trial_claimed_at: null
      }
    : {
        is_premium: false
      };

  const { data: updatedProfile, error: updateError } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId)
    .select(ADMIN_PROFILE_SELECT)
    .maybeSingle();

  let profile = updatedProfile as AdminProfileRow | null;
  if (updateError && isMissingSelfToggleColumnError(updateError)) {
    const { data: legacyProfile, error: legacyError } = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select(ADMIN_PROFILE_SELECT_LEGACY)
      .maybeSingle();
    if (legacyError || !legacyProfile) {
      throw legacyError ?? new Error("No se encontró el perfil del usuario.");
    }
    profile = { ...(legacyProfile as AdminProfileRow), can_self_toggle_premium: false };
  } else if (updateError || !profile) {
    throw updateError ?? new Error("No se encontró el perfil del usuario.");
  }

  return buildAdminUserListItem(
    normalizeAdminProfileRow(profile),
    authData.user.email ?? "—",
    authData.user.created_at
  );
}

export async function updateUserPremiumSelfTogglePermission(
  userId: string,
  canSelfTogglePremium: boolean
): Promise<AdminUserListItem> {
  const admin = getSupabaseAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) {
    throw authError ?? new Error("No se encontró el usuario.");
  }

  if (hasUnlimitedGenerations(authData.user.email)) {
    throw new Error("La cuenta administradora no necesita autogestión de Premium.");
  }

  const { data: updatedProfile, error: updateError } = await admin
    .from("profiles")
    .update({
      can_self_toggle_premium: canSelfTogglePremium,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId)
    .select(ADMIN_PROFILE_SELECT)
    .maybeSingle();

  if (updateError && isMissingSelfToggleColumnError(updateError)) {
    throw new Error(
      "Falta la migración can_self_toggle_premium. Ejecuta supabase/migrations/20260714150000_profiles_can_self_toggle_premium.sql en Supabase."
    );
  }

  if (updateError || !updatedProfile) {
    throw updateError ?? new Error("No se encontró el perfil del usuario.");
  }

  return buildAdminUserListItem(
    normalizeAdminProfileRow(updatedProfile as AdminProfileRow),
    authData.user.email ?? "—",
    authData.user.created_at
  );
}

export { MAX_DAILY_SCAN_LIMIT };
