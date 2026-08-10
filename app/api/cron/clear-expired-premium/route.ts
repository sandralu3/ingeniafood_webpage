import { NextResponse } from "next/server";
import { clearAllExpiredCodePremiums } from "@/lib/premium/claim-referral-promo";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Cron / manual: limpia pases Premium 24h caducados (is_premium / premium_expires_at).
 * Conserva redeemed_code como histórico.
 * En producción Hobby se ejecuta también desde /api/cron/notifications-push (2×/día).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await clearAllExpiredCodePremiums();
    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    console.error("[cron/clear-expired-premium]", error);
    return NextResponse.json(
      { error: "No pudimos limpiar los pases Premium caducados." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
