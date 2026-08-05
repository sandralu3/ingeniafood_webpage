import { NextResponse } from "next/server";
import { syncUserNotifications } from "@/lib/notifications/sync-user-notifications";
import {
  countUnreadNotifications,
  listUserNotifications
} from "@/lib/notifications/service";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import type { AppLocale } from "@/i18n/config";

const LOCALES: AppLocale[] = ["es", "en", "fr", "pt", "de"];

function parseLocale(value: unknown): AppLocale {
  return typeof value === "string" && (LOCALES as string[]).includes(value)
    ? (value as AppLocale)
    : "es";
}

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 500 });
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  let body: {
    localHour?: number;
    locale?: string;
    updateVersion?: string | null;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const syncResult = await syncUserNotifications(supabase, {
      userId: user.id,
      localHour:
        typeof body.localHour === "number" ? body.localHour : new Date().getHours(),
      locale: parseLocale(body.locale),
      updateVersion: body.updateVersion ?? null
    });

    const [notifications, unreadCount] = await Promise.all([
      listUserNotifications(supabase, user.id),
      countUnreadNotifications(supabase, user.id)
    ]);

    return NextResponse.json({
      created: syncResult.created,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error("[notifications/sync] POST", error);
    return NextResponse.json(
      { error: "No pudimos sincronizar las notificaciones." },
      { status: 500 }
    );
  }
}
