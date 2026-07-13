import { NextResponse } from "next/server";
import { claimPremiumTrial } from "@/lib/auth/premium-trial";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

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

  const result = await claimPremiumTrial(user.id, user.email);
  if (!result.ok) {
    const message =
      result.code === "ALREADY_PREMIUM"
        ? "Ya tienes Premium activo."
        : result.code === "ALREADY_CLAIMED"
          ? "Ya usaste tu prueba Premium simulada."
          : "No pudimos activar la prueba Premium.";

    return NextResponse.json(
      { error: message, code: result.code },
      { status: result.code === "UPDATE_FAILED" ? 503 : 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    premiumTrialRemaining: result.access.premiumTrialRemaining,
    canUsePremiumFeatures: result.access.canUsePremiumFeatures
  });
}
