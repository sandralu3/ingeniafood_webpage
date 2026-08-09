import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { syncUserNotifications } from "@/lib/notifications/sync-user-notifications";
import { isWebPushConfigured } from "@/lib/notifications/web-push-config";
import { parseAppLocale, type AppLocale } from "@/i18n/config";

const DEFAULT_TIMEZONE = "Europe/Madrid";
const BATCH_SIZE = 40;

export type ScheduledPushDigestResult = {
  configured: boolean;
  usersConsidered: number;
  usersProcessed: number;
  notificationsCreated: number;
  errors: number;
  localHour: number;
  timezone: string;
};

function resolveLocalHour(timeZone: string, now = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "numeric",
      hour12: false
    }).formatToParts(now);
    const hourPart = parts.find((part) => part.type === "hour")?.value;
    const hour = Number.parseInt(hourPart ?? "", 10);
    if (Number.isFinite(hour)) {
      // en-GB + hour12:false puede devolver "24" a medianoche en algunos motores
      return hour === 24 ? 0 : Math.max(0, Math.min(23, hour));
    }
  } catch {
    // fallback UTC
  }
  return now.getUTCHours();
}

function resolveTodayIso(timeZone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // fallback
  }
  return now.toISOString().slice(0, 10);
}

/**
 * Evalúa reglas y envía Web Push a usuarios con notificaciones activadas
 * y al menos una suscripción de dispositivo. No actualiza last_seen_at.
 */
export async function runScheduledPushDigest(options?: {
  timeZone?: string;
  now?: Date;
}): Promise<ScheduledPushDigestResult> {
  const timeZone = options?.timeZone?.trim() || DEFAULT_TIMEZONE;
  const now = options?.now ?? new Date();
  const localHour = resolveLocalHour(timeZone, now);
  const todayIso = resolveTodayIso(timeZone, now);

  if (!isWebPushConfigured()) {
    return {
      configured: false,
      usersConsidered: 0,
      usersProcessed: 0,
      notificationsCreated: 0,
      errors: 0,
      localHour,
      timezone: timeZone
    };
  }

  const admin = getSupabaseAdminClient();

  const { data: subscriptionRows, error: subError } = await admin
    .from("push_subscriptions")
    .select("user_id");

  if (subError) {
    console.error("[scheduled-push] Error listando suscripciones:", subError);
    throw subError;
  }

  const userIdsWithSubs = Array.from(
    new Set(
      (subscriptionRows ?? [])
        .map((row) => row.user_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  if (userIdsWithSubs.length === 0) {
    return {
      configured: true,
      usersConsidered: 0,
      usersProcessed: 0,
      notificationsCreated: 0,
      errors: 0,
      localHour,
      timezone: timeZone
    };
  }

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, language, push_notifications_enabled")
    .in("id", userIdsWithSubs)
    .eq("push_notifications_enabled", true);

  if (profileError) {
    console.error("[scheduled-push] Error listando perfiles:", profileError);
    throw profileError;
  }

  const targets = profiles ?? [];
  let usersProcessed = 0;
  let notificationsCreated = 0;
  let errors = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (profile) => {
        const locale: AppLocale = parseAppLocale(profile.language);
        const result = await syncUserNotifications(admin, {
          userId: profile.id,
          localHour,
          locale,
          todayIso,
          touchLastSeen: false
        });
        return result.created;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        usersProcessed += 1;
        notificationsCreated += result.value;
      } else {
        errors += 1;
        console.warn("[scheduled-push] Error sincronizando usuario:", result.reason);
      }
    }
  }

  return {
    configured: true,
    usersConsidered: targets.length,
    usersProcessed,
    notificationsCreated,
    errors,
    localHour,
    timezone: timeZone
  };
}
