import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import {
  countOwnedRecipesNeedingEnrichment,
  enrichOwnedRecipesMissingMetadata
} from "@/lib/recipes/enrich-owned-recipes";

export const maxDuration = 60;

export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  try {
    const pending = await countOwnedRecipesNeedingEnrichment(supabase, user.id);
    return NextResponse.json({ pending });
  } catch (error) {
    console.error("[api/recipes/enrich-mine] GET", error);
    return NextResponse.json({ error: "No pudimos contar las recetas pendientes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  let limit: number | undefined;
  try {
    const body = (await request.json()) as { limit?: unknown };
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = body.limit;
    }
  } catch {
    // body opcional
  }

  try {
    const result = await enrichOwnedRecipesMissingMetadata(supabase, user.id, { limit });
    return NextResponse.json({
      ...result,
      message:
        result.processed === 0
          ? "Tus recetas ya tienen tipo de comida y dieta para filtrar."
          : `Actualizamos ${result.updated} recetas. ${result.remaining} pendientes.`
    });
  } catch (error) {
    console.error("[api/recipes/enrich-mine] POST", error);
    const message =
      error instanceof Error ? error.message : "No pudimos completar tus recetas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
