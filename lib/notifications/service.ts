import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import type { NotificationDraft, UserNotification } from "@/lib/notifications/types";
import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

type Client = SupabaseClient<Database>;

function isNotificationType(value: string): value is UserNotification["type"] {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export function mapNotificationRow(
  row: Database["public"]["Tables"]["user_notifications"]["Row"]
): UserNotification | null {
  if (!isNotificationType(row.type)) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    dedupe_key: row.dedupe_key,
    payload: row.payload,
    read_at: row.read_at,
    created_at: row.created_at
  };
}

export async function listUserNotifications(
  client: Client,
  userId: string,
  limit = 40
): Promise<UserNotification[]> {
  const { data, error } = await client
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapNotificationRow(row))
    .filter((row): row is UserNotification => row != null);
}

export async function countUnreadNotifications(
  client: Client,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}

export async function upsertNotificationDrafts(
  client: Client,
  userId: string,
  drafts: NotificationDraft[]
): Promise<UserNotification[]> {
  if (drafts.length === 0) return [];

  const rows = drafts.map((draft) => ({
    user_id: userId,
    type: draft.type,
    title: draft.title,
    body: draft.body,
    href: draft.href ?? null,
    dedupe_key: draft.dedupeKey,
    payload: (draft.payload ?? {}) as Json
  }));

  const { data, error } = await client
    .from("user_notifications")
    .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
    .select("*");

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapNotificationRow(row))
    .filter((row): row is UserNotification => row != null);
}

export async function markNotificationRead(
  client: Client,
  userId: string,
  notificationId: string
): Promise<void> {
  const { error } = await client
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .is("read_at", null);

  if (error) throw error;
}

export async function markAllNotificationsRead(
  client: Client,
  userId: string
): Promise<void> {
  const { error } = await client
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .is("read_at", null);

  if (error) throw error;
}

export async function dismissNotification(
  client: Client,
  userId: string,
  notificationId: string
): Promise<void> {
  const { error } = await client
    .from("user_notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("dismissed_at", null);

  if (error) throw error;
}

export async function dismissAllNotifications(
  client: Client,
  userId: string
): Promise<void> {
  const { error } = await client
    .from("user_notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("dismissed_at", null);

  if (error) throw error;
}
