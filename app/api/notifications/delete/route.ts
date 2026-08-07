import { NextResponse } from "next/server";
import {
  dismissAllNotifications,
  dismissNotification
} from "@/lib/notifications/service";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

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

  let body: { id?: string; all?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  try {
    if (body.all === true) {
      await dismissAllNotifications(supabase, user.id);
      return NextResponse.json({ ok: true });
    }

    if (typeof body.id !== "string" || !body.id.trim()) {
      return NextResponse.json({ error: "Falta el id de la notificación." }, { status: 400 });
    }

    await dismissNotification(supabase, user.id, body.id.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notifications/delete] POST", error);
    return NextResponse.json(
      { error: "No pudimos eliminar la notificación." },
      { status: 500 }
    );
  }
}
