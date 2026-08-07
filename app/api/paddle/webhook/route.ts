import { EventName } from "@paddle/paddle-node-sdk";
import { NextResponse, type NextRequest } from "next/server";
import { getPaddle, getPaddleWebhookSecret } from "@/lib/paddle/client";
import {
  extractSupabaseUserIdFromCustomData,
  syncPaddleSubscriptionToSupabase,
  type PaddleSubscriptionLike
} from "@/lib/paddle/subscription-sync";

export const runtime = "nodejs";

async function syncSubscriptionById(
  subscriptionId: string,
  options?: { userId?: string | null; paddleCustomerId?: string | null }
) {
  const paddle = getPaddle();
  const subscription = await paddle.subscriptions.get(subscriptionId);
  return syncPaddleSubscriptionToSupabase(subscription as PaddleSubscriptionLike, options);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("paddle-signature");
  if (!signature) {
    return NextResponse.json({ error: "Falta paddle-signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  const webhookSecret = getPaddleWebhookSecret();
  const paddle = getPaddle();

  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
  } catch (error) {
    console.error("[paddle/webhook] firma inválida", error);
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionCanceled:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionResumed: {
        await syncPaddleSubscriptionToSupabase(
          event.data as unknown as PaddleSubscriptionLike
        );
        break;
      }
      case EventName.TransactionCompleted: {
        const transaction = event.data;
        const subscriptionId = transaction.subscriptionId;
        const userId = extractSupabaseUserIdFromCustomData(
          transaction.customData as Record<string, unknown> | null
        );
        if (subscriptionId) {
          await syncSubscriptionById(subscriptionId, {
            userId,
            paddleCustomerId: transaction.customerId
          });
        } else if (userId && transaction.customerId) {
          // Transacción sin suscripción: no provisionamos Premium recurrente.
          console.info("[paddle/webhook] transaction.completed sin subscription", {
            transactionId: transaction.id,
            userId
          });
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[paddle/webhook] error en ${event.eventType}`, error);
    return NextResponse.json({ error: "Error procesando webhook." }, { status: 500 });
  }
}
