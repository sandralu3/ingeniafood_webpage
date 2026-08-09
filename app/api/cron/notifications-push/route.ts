import { NextResponse } from "next/server";
import { runScheduledPushDigest } from "@/lib/notifications/scheduled-push-digest";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Cron: genera notificaciones y envía Web Push sin abrir la app.
 * Programar en vercel.json (p. ej. cada hora).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await runScheduledPushDigest();
    return NextResponse.json({
      ok: true,
      ...result
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
