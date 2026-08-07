import { NextResponse, type NextRequest } from "next/server";
import { getPaddle } from "@/lib/paddle/client";
import {
  syncPaddleSubscriptionToSupabase,
  type PaddleSubscriptionLike
} from "@/lib/paddle/subscription-sync";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

/**
 * Tras volver del checkout overlay (?checkout=success),
 * re-sincroniza la suscripción Paddle → Supabase (respaldo del webhook).
 */
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

    const { data: row } = await supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const paddle = getPaddle();
    let synced = false;

    if (row?.paddle_subscription_id) {
      const subscription = await paddle.subscriptions.get(row.paddle_subscription_id);
      const result = await syncPaddleSubscriptionToSupabase(
        subscription as PaddleSubscriptionLike,
        { userId: user.id }
      );
      synced = Boolean(result);
    } else if (row?.paddle_customer_id) {
      const collection = paddle.subscriptions.list({
        customerId: [row.paddle_customer_id]
      });
      for await (const subscription of collection) {
        await syncPaddleSubscriptionToSupabase(subscription as PaddleSubscriptionLike, {
          userId: user.id
        });
        synced = true;
        break;
      }
    }

    return NextResponse.json({ synced });
  } catch (error) {
    console.error("[paddle/sync-subscription]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pudimos sincronizar la suscripción."
      },
      { status: 500 }
    );
  }
}
