import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

/**
 * Actualiza (o quita) el enlace de Instagram de cualquier receta (service role).
 * Reservado a rutas admin ya autenticadas con requireSandraAdmin.
 */
export async function updateRecipeInstagramUrl(params: {
  recipeId: string;
  instagramUrl: string | null;
}): Promise<{ recipeId: string; instagramUrl: string | null }> {
  const admin = getSupabaseAdminClient();
  const recipeId = params.recipeId.trim();
  if (!recipeId) {
    throw new Error("Falta el id de la receta.");
  }

  const { data: recipe, error: fetchError } = await admin
    .from("recipes")
    .select("id")
    .eq("id", recipeId)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin/update-recipe-instagram-url] fetch:", fetchError);
    throw new Error("No pudimos cargar la receta.");
  }
  if (!recipe) {
    throw new Error("No encontramos esa receta.");
  }

  const { error: updateError } = await admin
    .from("recipes")
    .update({
      instagram_url: params.instagramUrl,
      ...(params.instagramUrl ? { es_instagram: true } : {}),
      updated_at: new Date().toISOString()
    })
    .eq("id", recipeId);

  if (updateError) {
    console.error("[admin/update-recipe-instagram-url] update:", updateError);
    throw new Error("No pudimos guardar el enlace de Instagram.");
  }

  return { recipeId, instagramUrl: params.instagramUrl };
}
