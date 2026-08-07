import { NextResponse, type NextRequest } from "next/server";
import { isUserTester } from "@/lib/auth/is-tester";
import { getPaddle } from "@/lib/paddle/client";
import {
  isLegacyStripeCustomerId,
  isPaddleCustomerId,
  isPaddleSubscriptionId
} from "@/lib/paddle/ids";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

function paddleErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "No pudimos abrir el portal de Paddle.";
  }

  const maybe = error as {
    message?: string;
    detail?: string;
    code?: string;
    error?: { detail?: string; code?: string; message?: string };
  };

  const detail =
    maybe.error?.detail ??
    maybe.detail ??
    maybe.error?.message ??
    maybe.message;

  if (typeof detail === "string" && detail.trim()) {
    if (detail.includes("URL called is invalid") || maybe.code === "invalid_url") {
      return "El cliente de facturación no es válido en Paddle (posible dato antiguo de Stripe). Haz un checkout nuevo en sandbox.";
    }
    return detail;
  }

  return "No pudimos abrir el portal de Paddle.";
}

export async function POST(_request: NextRequest) {
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
        { error: "El portal Premium solo está disponible para testers." },
        { status: 403 }
      );
    }

    const { data: subscriptionRow, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      console.error("[paddle/portal-session] select", subscriptionError);
      return NextResponse.json(
        { error: "No pudimos cargar tu suscripción." },
        { status: 500 }
      );
    }

    const customerId = subscriptionRow?.paddle_customer_id?.trim() ?? "";
    const subscriptionId = subscriptionRow?.paddle_subscription_id?.trim() ?? "";

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "Aún no hay un cliente de facturación. Completa una suscripción primero."
        },
        { status: 400 }
      );
    }

    if (isLegacyStripeCustomerId(customerId) || !isPaddleCustomerId(customerId)) {
      // Limpia IDs Stripe residuales tras el rename de columnas.
      try {
        const admin = getSupabaseAdminClient();
        await admin
          .from("subscriptions")
          .update({
            paddle_customer_id: null,
            paddle_subscription_id: null,
            status: "inactive",
            price_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);
      } catch (cleanupError) {
        console.warn("[paddle/portal-session] cleanup legacy ids", cleanupError);
      }

      return NextResponse.json(
        {
          error:
            "Había datos antiguos de Stripe. Se limpiaron. Vuelve a suscribirte con Paddle (Upgrade a Premium)."
        },
        { status: 409 }
      );
    }

    const subscriptionIds =
      subscriptionId && isPaddleSubscriptionId(subscriptionId) ? [subscriptionId] : [];

    const paddle = getPaddle();
    const session = await paddle.customerPortalSessions.create(
      customerId,
      subscriptionIds
    );

    const url = session.urls?.general?.overview;
    if (!url) {
      return NextResponse.json(
        { error: "Paddle no devolvió URL del portal." },
        { status: 502 }
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[paddle/portal-session]", error);
    return NextResponse.json({ error: paddleErrorMessage(error) }, { status: 500 });
  }
}
