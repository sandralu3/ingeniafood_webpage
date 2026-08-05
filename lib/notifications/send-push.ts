import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { ensureWebPushConfigured, webpush } from "@/lib/notifications/web-push-config";
import type { UserNotification } from "@/lib/notifications/types";

type PushPayload = {
  title: string;
  body: string;
  href?: string | null;
  tag?: string;
};

async function sendRawPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureWebPushConfigured()) return 0;

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("push_notifications_enabled")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.push_notifications_enabled) return 0;

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subscriptions?.length) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    href: payload.href ?? "/app-recetas/hoy",
    tag: payload.tag ?? "ingeniafood"
  });

  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          body,
          { TTL: 60 * 60 * 12, urgency: "normal" }
        );
        sent += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error &&
          "statusCode" in error &&
          typeof (error as { statusCode?: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.warn("[web-push] send failed:", statusCode ?? error);
        }
      }
    })
  );

  return sent;
}

/** Envía push del sistema para notificaciones recién creadas en el inbox. */
export async function sendPushForNotifications(
  userId: string,
  notifications: Array<Pick<UserNotification, "id" | "title" | "body" | "href" | "type" | "dedupe_key">>
): Promise<void> {
  if (notifications.length === 0) return;

  for (const item of notifications) {
    try {
      await sendRawPushToUser(userId, {
        title: item.title,
        body: item.body,
        href: item.href,
        tag: item.dedupe_key || item.type
      });
    } catch (error) {
      console.warn("[web-push] notification fan-out failed:", error);
    }
  }
}
