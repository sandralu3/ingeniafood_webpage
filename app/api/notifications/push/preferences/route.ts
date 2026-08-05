import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import { isWebPushConfigured } from "@/lib/notifications/web-push-config";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_notifications_enabled")
    .eq("id", user.id)
    .maybeSingle();

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({
    configured: isWebPushConfigured(),
    enabled: Boolean(profile?.push_notifications_enabled),
    deviceCount: count ?? 0
  });
}

export async function PATCH(request: Request) {
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

  let body: { enabled?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Falta enabled." }, { status: 400 });
  }

  if (!body.enabled) {
    await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ push_notifications_enabled: body.enabled })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "No pudimos guardar la preferencia." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, enabled: body.enabled });
}
