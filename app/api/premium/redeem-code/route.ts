import { NextResponse } from "next/server";
import { redeemPremiumAccessCode } from "@/lib/premium/redeem-access-code";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

type Body = {
  code?: string;
};

/**
 * POST /api/premium/redeem-code
 * Body: { code: string }
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
    const code = typeof body.code === "string" ? body.code : "";

    const result = await redeemPremiumAccessCode(user.id, code);

    if (!result.ok) {
      const status =
        result.code === "INVALID" || result.code === "INACTIVE"
          ? 400
          : result.code === "ALREADY_ACTIVE" || result.code === "ALREADY_REDEEMED"
            ? 409
            : result.code === "EXHAUSTED"
              ? 410
              : 400;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      expiresAt: result.expiresAt,
      durationHours: result.durationHours,
      message: result.message
    });
  } catch (error) {
    console.error("[api/premium/redeem-code]", error);
    return NextResponse.json(
      { error: "No pudimos canjear el código." },
      { status: 500 }
    );
  }
}
