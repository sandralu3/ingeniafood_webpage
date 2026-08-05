import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { mapNotificationRow } from "@/lib/notifications/service";
import { sendPushForNotifications } from "@/lib/notifications/send-push";
import type { NotificationDraft, UserNotification } from "@/lib/notifications/types";

/**
 * Inserta la misma notificación a todos los perfiles con role = admin.
 * Usado tras publicar en catálogo Instagram (aviso interno).
 */
export async function notifyAllAdmins(draft: NotificationDraft): Promise<number> {
  const admin = getSupabaseAdminClient();
  const { data: admins, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (error) throw error;
  if (!admins?.length) return 0;

  const rows = admins.map((profile) => ({
    user_id: profile.id,
    type: draft.type,
    title: draft.title,
    body: draft.body,
    href: draft.href ?? null,
    dedupe_key: draft.dedupeKey,
    payload: draft.payload ?? {}
  }));

  const { data, error: upsertError } = await admin
    .from("user_notifications")
    .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
    .select("*");

  if (upsertError) throw upsertError;

  const created = (data ?? [])
    .map((row) => mapNotificationRow(row))
    .filter((row): row is UserNotification => row != null);

  await Promise.all(
    created.map((notification) =>
      sendPushForNotifications(notification.user_id, [notification])
    )
  );

  return created.length;
}

export async function notifyAdminsCatalogPublished(params: {
  recipeId: string;
  title: string;
}): Promise<void> {
  try {
    await notifyAllAdmins({
      type: "admin_catalog_published",
      title: "Catálogo Instagram actualizado",
      body: `Se publicó 「${params.title}」 en el catálogo.`,
      href: "/admin/catalogo-instagram",
      dedupeKey: `admin_catalog_published:${params.recipeId}`,
      payload: { recipeId: params.recipeId, title: params.title }
    });
  } catch (error) {
    console.warn("[notifications] admin catalog notify failed:", error);
  }
}
