import { NextResponse } from "next/server";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { getSelfPremiumToggleState, setSelfPremiumByUser } from "@/lib/profile/self-premium-toggle";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

type PatchBody = {
  isPremium?: boolean;
};

export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Configuración de Supabase incompleta." }, { status: 500 });
  }
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (isSandraAdmin(user.email)) {
    return NextResponse.json({
      isPremium: true,
      canSelfTogglePremium: false,
      isAdmin: true
    });
  }

  try {
    const state = await getSelfPremiumToggleState(user.id);
    if (!state) {
      return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    }

    return NextResponse.json(state);
  } catch (error) {
    console.error("[profile/premium-self-toggle] GET", error);
    return NextResponse.json(
      { error: "No pudimos cargar tu estado Premium." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Configuración de Supabase incompleta." }, { status: 500 });
  }
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (isSandraAdmin(user.email)) {
    return NextResponse.json(
      { error: "La cuenta administradora ya tiene Premium ilimitado." },
      { status: 400 }
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  if (typeof body.isPremium !== "boolean") {
    return NextResponse.json({ error: "Debes indicar isPremium." }, { status: 400 });
  }

  try {
    const state = await setSelfPremiumByUser(user.id, body.isPremium, user.email);
    return NextResponse.json(state);
  } catch (error) {
    console.error("[profile/premium-self-toggle] PATCH", error);
    const message = error instanceof Error ? error.message : "No pudimos actualizar Premium.";
    const isForbidden = message.includes("permiso");
    return NextResponse.json({ error: message }, { status: isForbidden ? 403 : 500 });
  }
}
