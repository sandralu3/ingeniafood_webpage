import { NextResponse } from "next/server";
import {
  countUnreadNotifications,
  listUserNotifications
} from "@/lib/notifications/service";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export async function GET() {
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

  try {
    const [notifications, unreadCount] = await Promise.all([
      listUserNotifications(supabase, user.id),
      countUnreadNotifications(supabase, user.id)
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("[notifications] GET", error);
    return NextResponse.json(
      { error: "No pudimos cargar las notificaciones." },
      { status: 500 }
    );
  }
}
