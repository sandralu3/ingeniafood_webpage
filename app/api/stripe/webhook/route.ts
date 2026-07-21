import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripe,
  getStripeWebhookSecret
} from "@/lib/stripe/stripe-server";
import {
  extractSupabaseUserIdFromMetadata,
  syncStripeSubscriptionToSupabase
} from "@/lib/stripe/subscription-sync";

export const runtime = "nodejs";

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") {
    return;
  }

  const stripe = getStripe();
  const userId =
    session.client_reference_id?.trim() ||
    extractSupabaseUserIdFromMetadata(session.metadata);

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!subscriptionId) {
    console.warn("[stripe/webhook] checkout.session.completed sin subscription", session.id);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncStripeSubscriptionToSupabase(subscription, {
    userId,
    stripeCustomerId: customerId
  });
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  await syncStripeSubscriptionToSupabase(subscription);
}

async function handleInvoiceEvent(invoice: Stripe.Invoice, failed: boolean) {
  const stripe = getStripe();
  const subscriptionRef =
    (
      invoice as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      }
    ).subscription ?? null;

  const subscriptionId =
    typeof subscriptionRef === "string"
      ? subscriptionRef
      : subscriptionRef && typeof subscriptionRef === "object"
        ? subscriptionRef.id
        : null;

  if (!subscriptionId) {
    // Factura one-off sin suscripción: no cambia el acceso Premium.
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const synced = await syncStripeSubscriptionToSupabase(subscription);

  if (failed && synced) {
    // past_due / unpaid ya se sincronizan vía status de la subscription.
    // Refuerzo: si Stripe aún marca active pero el pago falló, dejamos el status de Stripe.
    console.info("[stripe/webhook] invoice.payment_failed", {
      userId: synced.userId,
      subscriptionId,
      invoiceId: invoice.id
    });
  }

  if (!failed && synced) {
    console.info("[stripe/webhook] invoice.paid", {
      userId: synced.userId,
      subscriptionId,
      invoiceId: invoice.id
    });
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Falta stripe-signature." }, { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = getStripeWebhookSecret();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe/webhook] firma inválida", error);
    return NextResponse.json({ error: "Firma de webhook inválida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncStripeSubscriptionToSupabase({
          ...subscription,
          status: "canceled"
        });
        break;
      }
      case "invoice.paid": {
        await handleInvoiceEvent(event.data.object as Stripe.Invoice, false);
        break;
      }
      case "invoice.payment_failed": {
        await handleInvoiceEvent(event.data.object as Stripe.Invoice, true);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`[stripe/webhook] error en ${event.type}`, error);
    return NextResponse.json({ error: "Error procesando el webhook." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
