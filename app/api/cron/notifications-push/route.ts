import { NextResponse } from "next/server";
import { runScheduledPushDigest } from "@/lib/notifications/scheduled-push-digest";
import { clearAllExpiredCodePremiums } from "@/lib/premium/claim-referral-promo";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Cron: genera notificaciones y envía Web Push sin abrir la app.
 * También limpia pases Premium 24h caducados (Hobby: máx. 2 crons/día).
 * Programar en vercel.json (p. ej. 09:00 y 16:00 UTC).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const [digest, expiredPremium] = await Promise.all([
      runScheduledPushDigest(),
      clearAllExpiredCodePremiums().catch((error) => {
        console.error("[cron/notifications-push] clear-expired-premium", error);
        return {
          scanned: 0,
          cleared: 0,
          keptPremiumForSubscription: 0,
          errors: 1
        };
      })
    ]);

    return NextResponse.json({
      ok: true,
      ...digest,
      expiredPremium
    });
  } catch (error) {
    console.error("[cron/notifications-push]", error);
    return NextResponse.json(
      { error: "No pudimos ejecutar el digest de notificaciones push." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
