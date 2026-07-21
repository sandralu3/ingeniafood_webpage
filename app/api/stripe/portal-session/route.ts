import { NextResponse, type NextRequest } from "next/server";
import { isUserTester } from "@/lib/auth/is-tester";
import { buildPortalReturnUrl, getRequestOrigin } from "@/lib/stripe/checkout-urls";
import { resolveValidStripeCustomerId } from "@/lib/stripe/resolve-stripe-customer";
import { getStripe } from "@/lib/stripe/stripe-server";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

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
        { error: "El portal de facturación solo está disponible para testers." },
        { status: 403 }
      );
    }

    const { data: subscriptionRow, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      console.error("[stripe/portal-session] select", subscriptionError);
      return NextResponse.json(
        { error: "No pudimos cargar tu suscripción." },
        { status: 500 }
      );
    }

    const customerId = await resolveValidStripeCustomerId(
      user.id,
      subscriptionRow?.stripe_customer_id
    );

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "Aún no tienes una suscripción de pago. Pulsa «Upgrade a Premium» para crear una nueva."
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin = getRequestOrigin(request);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: buildPortalReturnUrl(origin)
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[stripe/portal-session]", error);
    const message =
      error instanceof Error ? error.message : "No pudimos abrir el portal de facturación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
