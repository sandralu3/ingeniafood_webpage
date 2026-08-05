import { NextResponse } from "next/server";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";
import { sendAdminTestPush } from "@/lib/notifications/send-push";
import { upsertNotificationDrafts } from "@/lib/notifications/service";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

export async function POST() {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 500 });
  }

  const dedupeKey = `admin_push_test:${Date.now()}`;
  const title = "Prueba IngeniaFood";
  const body = "Si ves esto, las notificaciones push del sistema funcionan.";

  try {
    await upsertNotificationDrafts(supabase, auth.user.id, [
      {
        type: "app_update",
        title,
        body,
        href: APP_ROUTES.parametros,
        dedupeKey,
        payload: { test: true }
      }
    ]);

    const result = await sendAdminTestPush(auth.user.id);

    if (!result.configured) {
      return NextResponse.json(
        {
          ok: false,
          inbox: true,
          sent: 0,
          error:
            "Web Push no está configurado en el servidor (faltan VAPID). Revisa las variables de entorno y redespliega."
        },
        { status: 503 }
      );
    }

    if (result.sent === 0) {
      return NextResponse.json(
        {
          ok: false,
          inbox: true,
          sent: 0,
          error:
            "No hay suscripción push en este dispositivo. Activa las notificaciones aquí y vuelve a probar."
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      inbox: true,
      sent: result.sent,
      message: `Push enviado a ${result.sent} dispositivo(s). También verás el aviso en la campana.`
    });
  } catch (error) {
    console.error("[notifications/push/test]", error);
    return NextResponse.json(
      { error: "No pudimos enviar la notificación de prueba." },
      { status: 500 }
    );
  }
}
