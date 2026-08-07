import { EventName } from "@paddle/paddle-node-sdk";
import { NextResponse, type NextRequest } from "next/server";
import { getPaddle } from "@/lib/paddle/client";
import {
  extractSupabaseUserIdFromCustomData,
  syncPaddleSubscriptionToSupabase,
  type PaddleSubscriptionLike
} from "@/lib/paddle/subscription-sync";
import {
  sanitizePaddleWebhookSecret,
  verifyPaddleWebhookSignature
} from "@/lib/paddle/webhook-signature";

export const runtime = "nodejs";

function getWebhookSecret(): string {
  const secret = sanitizePaddleWebhookSecret(
    process.env.PADDLE_WEBHOOK_SECRET ??
      process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET
  );
  if (!secret) {
    throw new Error(
      "Falta PADDLE_WEBHOOK_SECRET (o PADDLE_NOTIFICATION_WEBHOOK_SECRET) en el entorno."
    );
  }
  return secret;
}

/** Health check para verificar que la ruta existe en prod. */
export async function GET() {
  const secret = sanitizePaddleWebhookSecret(
    process.env.PADDLE_WEBHOOK_SECRET ??
      process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET
  );
  const hasApiKey = Boolean(
    (process.env.PADDLE_API_KEY ?? "").trim().replace(/^["']|["']$/g, "")
  );
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  return NextResponse.json({
    ok: true,
    provider: "paddle",
    hasApiKey,
    hasWebhookSecret: Boolean(secret),
    secretLooksValid: secret.startsWith("pdl_"),
    secretLength: secret.length,
    hasServiceRole
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

/** Normaliza payload snake_case del webhook crudo a nuestro shape. */
function normalizeSubscriptionPayload(data: Record<string, unknown>): PaddleSubscriptionLike {
  const period = asRecord(data.current_billing_period) ?? asRecord(data.currentBillingPeriod);
  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  const items = itemsRaw.map((item) => {
    const row = asRecord(item);
    const price = asRecord(row?.price);
    return {
      price: price?.id ? { id: String(price.id) } : null
    };
  });

  return {
    id: String(data.id ?? ""),
    status: String(data.status ?? "inactive"),
    customerId: String(data.customer_id ?? data.customerId ?? ""),
    customData:
      (asRecord(data.custom_data) as Record<string, unknown> | null) ??
      (asRecord(data.customData) as Record<string, unknown> | null),
    currentBillingPeriod: period
      ? { endsAt: String(period.ends_at ?? period.endsAt ?? "") || null }
      : null,
    items
  };
}

async function syncSubscriptionById(
  subscriptionId: string,
  options?: { userId?: string | null; paddleCustomerId?: string | null }
) {
  const paddle = getPaddle();
  const subscription = await paddle.subscriptions.get(subscriptionId);
  return syncPaddleSubscriptionToSupabase(subscription as PaddleSubscriptionLike, {
    ...options,
    resolveCustomerEmail: async (customerId) => {
      try {
        const customer = await paddle.customers.get(customerId);
        return customer.email ?? null;
      } catch (error) {
        console.warn("[paddle/webhook] no se pudo leer customer", customerId, error);
        return null;
      }
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const signature =
      request.headers.get("paddle-signature") ??
      request.headers.get("Paddle-Signature") ??
      "";
    if (!signature) {
      return NextResponse.json({ error: "Falta paddle-signature." }, { status: 400 });
    }

    let webhookSecret: string;
    try {
      webhookSecret = getWebhookSecret();
    } catch (error) {
      console.error("[paddle/webhook] configuración incompleta", error);
      return NextResponse.json(
        {
          error:
            "Falta PADDLE_WEBHOOK_SECRET en el entorno de producción (Vercel → Environment Variables → Production)."
        },
        { status: 503 }
      );
    }

    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json({ error: "Body vacío." }, { status: 400 });
    }

    const signatureOk = verifyPaddleWebhookSignature({
      rawBody,
      signatureHeader: signature,
      secret: webhookSecret
    });

    if (!signatureOk) {
      console.error("[paddle/webhook] firma inválida", {
        secretLength: webhookSecret.length,
        secretPrefix: webhookSecret.slice(0, 4),
        signaturePreview: signature.slice(0, 24)
      });
      return NextResponse.json(
        {
          error:
            "Firma inválida. Usa el Endpoint secret del destination (pdl_ntfset_…), entorno Production en Vercel, y redeploy tras cambiar la var."
        },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody) as {
      event_type?: string;
      data?: Record<string, unknown>;
    };
    const eventType = payload.event_type ?? "";
    const data = asRecord(payload.data) ?? {};

    const paddle = getPaddle();
    const resolveCustomerEmail = async (customerId: string) => {
      try {
        const customer = await paddle.customers.get(customerId);
        return customer.email ?? null;
      } catch (error) {
        console.warn("[paddle/webhook] no se pudo leer customer", customerId, error);
        return null;
      }
    };

    switch (eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionCanceled:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionResumed:
      case "subscription.created":
      case "subscription.updated":
      case "subscription.canceled":
      case "subscription.activated":
      case "subscription.trialing":
      case "subscription.past_due":
      case "subscription.paused":
      case "subscription.resumed": {
        await syncPaddleSubscriptionToSupabase(normalizeSubscriptionPayload(data), {
          resolveCustomerEmail
        });
        break;
      }
      case EventName.TransactionCompleted:
      case "transaction.completed": {
        const subscriptionId = (data.subscription_id ?? data.subscriptionId) as
          | string
          | null
          | undefined;
        const customerId = (data.customer_id ?? data.customerId) as string | null | undefined;
        const customData =
          asRecord(data.custom_data) ?? asRecord(data.customData);
        const userId = extractSupabaseUserIdFromCustomData(customData);
        if (subscriptionId) {
          await syncSubscriptionById(subscriptionId, {
            userId,
            paddleCustomerId: customerId ?? null
          });
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true, eventType });
  } catch (error) {
    console.error("[paddle/webhook] error procesando evento", error);
    const message =
      error instanceof Error ? error.message : "Error procesando webhook.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
