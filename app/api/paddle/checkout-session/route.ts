import { NextResponse, type NextRequest } from "next/server";
import { isUserTester } from "@/lib/auth/is-tester";
import { evaluateSubscriptionAccess } from "@/lib/billing/has-valid-subscription";
import {
  buildCheckoutCancelUrl,
  buildCheckoutSuccessUrl,
  getRequestOrigin
} from "@/lib/paddle/checkout-urls";
import {
  getPaddleClientToken,
  getPaddlePriceId,
  getPaddlePublicEnvironment,
  type PaddlePriceInterval
} from "@/lib/paddle/client";
import { isPaddleCustomerId } from "@/lib/paddle/ids";
import { SUPABASE_USER_META_KEY } from "@/lib/paddle/subscription-sync";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import type { SubscriptionRow } from "@/types/subscription";

export const runtime = "nodejs";

function parseInterval(value: unknown): PaddlePriceInterval {
  return value === "year" ? "year" : "month";
}

/**
 * Devuelve datos para abrir el overlay de Paddle.js en el cliente.
 * El cobro ocurre en Paddle; el vínculo usuario ↔ suscripción va en customData.
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

    const body = (await request.json().catch(() => ({}))) as {
      interval?: unknown;
    };
    const interval = parseInterval(body.interval);

    const { data: subscriptionRow } = await supabase
      .from("subscriptions")
      .select(
        "user_id, paddle_customer_id, paddle_subscription_id, status, price_id, current_period_end, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const subscriptionAccess = evaluateSubscriptionAccess(
      (subscriptionRow as SubscriptionRow | null) ?? null
    );

    if (
      subscriptionAccess.hasValidSubscription &&
      isPaddleCustomerId(subscriptionAccess.paddleCustomerId)
    ) {
      return NextResponse.json(
        {
          error:
            "Ya tienes una suscripción Premium activa. Usa «Gestionar suscripción» para cambiar el plan."
        },
        { status: 409 }
      );
    }

    const origin = getRequestOrigin(request);
    const priceId = getPaddlePriceId(interval);
    const clientToken = getPaddleClientToken();
    const environment = getPaddlePublicEnvironment();

    return NextResponse.json({
      priceId,
      interval,
      environment,
      clientToken,
      customer: {
        email: user.email
      },
      customData: {
        [SUPABASE_USER_META_KEY]: user.id
      },
      settings: {
        successUrl: buildCheckoutSuccessUrl(origin),
        // Paddle overlay: successUrl en settings; cancel se gestiona al cerrar el overlay.
        cancelUrl: buildCheckoutCancelUrl(origin)
      }
    });
  } catch (error) {
    console.error("[paddle/checkout-session]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pudimos preparar el checkout de Paddle."
      },
      { status: 500 }
    );
  }
}
