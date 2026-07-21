import { NextResponse, type NextRequest } from "next/server";
import { isUserTester } from "@/lib/auth/is-tester";
import { evaluateSubscriptionAccess } from "@/lib/billing/has-valid-subscription";
import {
  buildCheckoutCancelUrl,
  buildCheckoutSuccessUrl,
  getRequestOrigin
} from "@/lib/stripe/checkout-urls";
import { buildCheckoutCustomerParams } from "@/lib/stripe/resolve-stripe-customer";
import { getStripe, getStripePremiumPriceId } from "@/lib/stripe/stripe-server";
import { SUPABASE_USER_META_KEY } from "@/lib/stripe/subscription-sync";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import type { SubscriptionRow } from "@/types/subscription";

export const runtime = "nodejs";

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
        { error: "El checkout Premium solo está disponible para testers." },
        { status: 403 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "Tu cuenta no tiene email. No podemos iniciar el checkout." },
        { status: 400 }
      );
    }

    const { data: subscriptionRow } = await supabase
      .from("subscriptions")
      .select(
        "user_id, stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const subscriptionAccess = evaluateSubscriptionAccess(
      (subscriptionRow as SubscriptionRow | null) ?? null
    );

    // Ya suscrito: no crear otro checkout; el portal gestiona el plan.
    if (subscriptionAccess.hasValidSubscription && subscriptionAccess.stripeCustomerId) {
      // Confirmar que el customer sigue existiendo en Stripe.
      const customerParams = await buildCheckoutCustomerParams(
        user.id,
        user.email,
        subscriptionAccess.stripeCustomerId
      );
      if (customerParams.customer) {
        return NextResponse.json(
          {
            error:
              "Ya tienes una suscripción Premium activa. Usa «Gestionar suscripción» para cambiar el plan."
          },
          { status: 409 }
        );
      }
      // Customer obsoleto: continuar con checkout limpio.
    }

    const stripe = getStripe();
    const priceId = getStripePremiumPriceId();
    const origin = getRequestOrigin(request);
    const userMeta = { [SUPABASE_USER_META_KEY]: user.id };
    const customerParams = await buildCheckoutCustomerParams(
      user.id,
      user.email,
      subscriptionAccess.stripeCustomerId
    );

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      ...customerParams,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: buildCheckoutSuccessUrl(origin),
      cancel_url: buildCheckoutCancelUrl(origin),
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: userMeta,
      subscription_data: {
        metadata: userMeta
      }
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe no devolvió URL de Checkout." },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("[stripe/checkout-session]", error);
    const message =
      error instanceof Error ? error.message : "No pudimos iniciar el checkout Premium.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
