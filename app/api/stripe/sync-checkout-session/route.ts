import { NextResponse, type NextRequest } from "next/server";
import { isUserTester } from "@/lib/auth/is-tester";
import { getStripe } from "@/lib/stripe/stripe-server";
import {
  extractSupabaseUserIdFromMetadata,
  syncStripeSubscriptionToSupabase
} from "@/lib/stripe/subscription-sync";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

type SyncCheckoutBody = {
  sessionId?: string;
};

/**
 * Tras volver de Stripe Checkout, sincroniza la suscripción en Supabase.
 * Respaldo del webhook (local sin Stripe CLI o latencia del webhook).
 */
export async function POST(request: NextRequest) {
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

    if (!(await isUserTester(supabase, user.id, user.email))) {
      return NextResponse.json(
        { error: "La sincronización Premium solo está disponible para testers." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as SyncCheckoutBody;
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "Falta el id de la sesión de Checkout." }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== "subscription") {
      return NextResponse.json({ error: "La sesión no es de suscripción." }, { status: 400 });
    }

    const sessionUserId =
      session.client_reference_id?.trim() ||
      extractSupabaseUserIdFromMetadata(session.metadata);

    if (!sessionUserId || sessionUserId !== user.id) {
      return NextResponse.json(
        { error: "Esta sesión de pago no pertenece a tu cuenta." },
        { status: 403 }
      );
    }

    if (session.status !== "complete") {
      return NextResponse.json(
        { error: "El pago aún no se ha completado. Espera unos segundos e inténtalo de nuevo." },
        { status: 409 }
      );
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "No encontramos la suscripción en Stripe." },
        { status: 404 }
      );
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const synced = await syncStripeSubscriptionToSupabase(subscription, {
      userId: user.id,
      stripeCustomerId: customerId
    });

    if (!synced) {
      return NextResponse.json(
        { error: "No pudimos vincular la suscripción a tu cuenta." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, status: subscription.status });
  } catch (error) {
    console.error("[stripe/sync-checkout-session]", error);
    const message =
      error instanceof Error ? error.message : "No pudimos activar tu suscripción Premium.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
