import { NextResponse } from "next/server";
import { attachReferralPromo } from "@/lib/premium/claim-referral-promo";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

type Body = { ref?: string };

/**
 * POST /api/premium/attach-referral
 * Guarda promo reclamable (sin activar las 24h).
 */
export async function POST(request: Request) {
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

    const body = (await request.json()) as Body;
    const ref = typeof body.ref === "string" ? body.ref : "";
    const result = await attachReferralPromo(user.id, ref);

    if (!result.ok) {
      const status = result.code === "ALREADY_CLAIMED" ? 409 : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({
      ok: true,
      alreadyClaimable: result.alreadyClaimable,
      attached: result.attached
    });
  } catch (error) {
    console.error("[api/premium/attach-referral]", error);
    return NextResponse.json(
      { error: "No pudimos guardar la promoción de referido." },
      { status: 500 }
    );
  }
}
