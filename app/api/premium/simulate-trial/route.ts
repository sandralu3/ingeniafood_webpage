import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

/** La prueba Premium de 1 uso fue retirada. */
export async function POST() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 500 });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "La prueba Premium gratuita ya no está disponible. Contrata Premium para continuar.",
      code: "PREMIUM_TRIAL_DISABLED"
    },
    { status: 410 }
  );
}
