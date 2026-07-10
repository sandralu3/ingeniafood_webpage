import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import { getUserScanQuota } from "@/lib/generations/quota";

export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 500 });
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const quota = await getUserScanQuota(user.id, user.email);
  if (!quota) {
    return NextResponse.json({ error: "No pudimos cargar tu cuota de escaneos." }, { status: 503 });
  }

  return NextResponse.json({
    generationsLeft: quota.remaining,
    dailyLimit: quota.dailyLimit,
    usedToday: quota.usedToday,
    unlimited: quota.unlimited
  });
}
