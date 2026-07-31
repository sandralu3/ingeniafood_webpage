import { NextResponse } from "next/server";
import { claimReferralPromo24h } from "@/lib/premium/claim-referral-promo";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

/**
 * POST /api/premium/claim-promo
 * Activa las 24h Premium pendientes (referido).
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

    const result = await claimReferralPromo24h(user.id);

    if (!result.ok) {
      const status =
        result.code === "ALREADY_ACTIVE"
          ? 409
          : result.code === "NOTHING_TO_CLAIM"
            ? 404
            : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({
      ok: true,
      expiresAt: result.expiresAt,
      message: result.message
    });
  } catch (error) {
    console.error("[api/premium/claim-promo]", error);
    return NextResponse.json(
      { error: "No pudimos activar tu pase Premium." },
      { status: 500 }
    );
  }
}
