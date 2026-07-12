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
};

const MAX_DAILY_SCAN_LIMIT = 500;

function computeScansUsedToday(scansUsedToday: number, scanQuotaDate: string): number {
  return scanQuotaDate === getTodayDateKey() ? scansUsedToday : 0;
}

export async function listAdminUsers(): Promise<AdminUserListItem[]> {
  const admin = getSupabaseAdminClient();

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, full_name, daily_scan_limit, scans_used_today, scan_quota_date, created_at")
    .order("created_at", { ascending: false });

  if (profilesError) {
    throw profilesError;
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
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
      const unlimitedScans = hasUnlimitedGenerations(user.email);
      const dailyScanLimit = profile?.daily_scan_limit ?? 5;
      const scansUsedToday = profile
        ? computeScansUsedToday(profile.scans_used_today, profile.scan_quota_date)
        : 0;

      return {
        id: user.id,
        fullName: profile?.full_name ?? null,
        email: user.email ?? "—",
        dailyScanLimit: unlimitedScans ? UNLIMITED_GENERATIONS_SENTINEL : dailyScanLimit,
        scansUsedToday,
        scansRemainingToday: unlimitedScans
          ? UNLIMITED_GENERATIONS_SENTINEL
          : Math.max(0, dailyScanLimit - scansUsedToday),
        createdAt: profile?.created_at ?? user.created_at,
        unlimitedScans
      };
    })
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
  const today = getTodayDateKey();

  const { data: updatedProfile, error: updateError } = await admin
    .from("profiles")
    .update({
      daily_scan_limit: dailyScanLimit,
      generations_left: dailyScanLimit
    })
    .eq("id", userId)
    .select("id, full_name, daily_scan_limit, scans_used_today, scan_quota_date, created_at")
    .maybeSingle();

  if (updateError || !updatedProfile) {
    throw updateError ?? new Error("No se encontró el perfil del usuario.");
  }

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) {
    throw authError ?? new Error("No se encontró el usuario.");
  }

  const unlimitedScans = hasUnlimitedGenerations(authData.user.email);
  const scansUsedToday = computeScansUsedToday(
    updatedProfile.scans_used_today,
    updatedProfile.scan_quota_date
  );

  return {
    id: updatedProfile.id,
    fullName: updatedProfile.full_name,
    email: authData.user.email ?? "—",
    dailyScanLimit: unlimitedScans ? UNLIMITED_GENERATIONS_SENTINEL : updatedProfile.daily_scan_limit,
    scansUsedToday,
    scansRemainingToday: unlimitedScans
      ? UNLIMITED_GENERATIONS_SENTINEL
      : Math.max(0, updatedProfile.daily_scan_limit - scansUsedToday),
    createdAt: updatedProfile.created_at,
    unlimitedScans
  };
}

export { MAX_DAILY_SCAN_LIMIT };
