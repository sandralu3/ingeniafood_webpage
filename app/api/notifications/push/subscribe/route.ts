import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import { isWebPushConfigured } from "@/lib/notifications/web-push-config";

export async function POST(request: Request) {
  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web Push no está configurado en el servidor." },
      { status: 503 }
    );
  }

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
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    userAgent?: string;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Suscripción incompleta." }, { status: 400 });
  }

  const { error: upsertError } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: body.userAgent?.slice(0, 300) ?? null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "endpoint" }
  );

  if (upsertError) {
    console.error("[push/subscribe]", upsertError);
    return NextResponse.json({ error: "No pudimos guardar la suscripción." }, { status: 500 });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ push_notifications_enabled: true })
    .eq("id", user.id);

  if (profileError) {
    console.error("[push/subscribe] profile", profileError);
    return NextResponse.json({ error: "No pudimos activar las notificaciones." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, enabled: true });
}

export async function DELETE(request: Request) {
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

  let endpoint: string | null = null;
  try {
    const body = (await request.json()) as { endpoint?: string };
    endpoint = body.endpoint?.trim() || null;
  } catch {
    endpoint = null;
  }

  if (endpoint) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
  } else {
    await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  }

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const stillHasDevices = (count ?? 0) > 0;

  if (!stillHasDevices) {
    await supabase
      .from("profiles")
      .update({ push_notifications_enabled: false })
      .eq("id", user.id);
  }

  return NextResponse.json({ ok: true, enabled: stillHasDevices });
}
