import { NextResponse } from "next/server";
import { resetTesterPremiumTrial } from "@/lib/premium/claim-referral-promo";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

/**
 * POST /api/premium/reset-tester-trial
 * Solo tester/admin: resetea promo + foto para re-probar el flujo.
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

    const result = await resetTesterPremiumTrial(user.id, user.email);

    if (!result.ok) {
      const status = result.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/premium/reset-tester-trial]", error);
    return NextResponse.json(
      { error: "No pudimos resetear la prueba Premium." },
      { status: 500 }
    );
  }
}
