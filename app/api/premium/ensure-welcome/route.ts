import { NextResponse } from "next/server";
import { ensureWelcomePromoClaimable } from "@/lib/premium/claim-referral-promo";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

/**
 * POST /api/premium/ensure-welcome
 * Marca pase 24h reclamable de bienvenida si el usuario nunca tuvo promo.
 */
export async function POST() {
  try {
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

    const result = await ensureWelcomePromoClaimable(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[api/premium/ensure-welcome]", error);
    return NextResponse.json(
      { error: "No pudimos preparar la promoción de bienvenida." },
      { status: 500 }
    );
  }
}
