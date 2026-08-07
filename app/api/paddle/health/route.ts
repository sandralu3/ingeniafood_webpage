import { NextResponse } from "next/server";
import { sanitizePaddleWebhookSecret } from "@/lib/paddle/webhook-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Health check del adaptador Paddle (GET seguro para probar en el navegador). */
export async function GET() {
  const secret = sanitizePaddleWebhookSecret(
    process.env.PADDLE_WEBHOOK_SECRET ??
      process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET
  );
  const apiKey = (process.env.PADDLE_API_KEY ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");

  return NextResponse.json({
    ok: true,
    provider: "paddle",
    commitHint: "paddle-health-v1",
    hasApiKey: Boolean(apiKey),
    hasWebhookSecret: Boolean(secret),
    secretLooksValid: secret.startsWith("pdl_"),
    secretLength: secret.length,
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "sandbox")
      .trim()
      .replace(/^["']|["']$/g, "")
  });
}
