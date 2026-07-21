import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Polling ligero: ¿ya hay foto definitiva en `recipes.image_url`?
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: recipeId } = await context.params;
    if (!recipeId?.trim()) {
      return NextResponse.json({ error: "Falta el id de la receta." }, { status: 400 });
    }

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

    const { data, error } = await supabase
      .from("recipes")
      .select("id, image_url, reference_image_url")
      .eq("id", recipeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Receta no encontrada." }, { status: 404 });
    }

    const imageUrl =
      typeof data.image_url === "string" && data.image_url.trim().length > 0
        ? data.image_url.trim()
        : null;
    const referenceImageUrl =
      typeof data.reference_image_url === "string" && data.reference_image_url.trim().length > 0
        ? data.reference_image_url.trim()
        : null;

    // Pendiente solo si aún no hay image_url (la referencia vive en otra columna).
    const status = imageUrl ? ("ready" as const) : ("pending" as const);

    return NextResponse.json({
      recipeId: data.id,
      status,
      imageUrl,
      referenceImageUrl
    });
  } catch (error) {
    console.error("[image-status]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No pudimos consultar el estado de la imagen."
      },
      { status: 500 }
    );
  }
}
