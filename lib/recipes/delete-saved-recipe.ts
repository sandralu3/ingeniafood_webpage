import { createSupabaseClient } from "@/lib/supabaseClient";

export type DeleteSavedRecipeResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Elimina una receta del recetario del usuario.
 * Los favoritos en `saved_recipes` se limpian por CASCADE (o best-effort).
 */
export async function deleteSavedRecipe(
  recipeId: string
): Promise<DeleteSavedRecipeResult> {
  let supabase;

  try {
    supabase = createSupabaseClient();
  } catch {
    return { success: false, error: "No se pudo conectar con Supabase." };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Inicia sesión para gestionar tus recetas." };
  }

  // Best-effort: limpiar pivot por si no hay CASCADE en el entorno.
  const { error: unsaveError } = await supabase
    .from("saved_recipes")
    .delete()
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId);

  if (unsaveError) {
    console.error("[delete-recipe] Error en saved_recipes:", unsaveError);
  }

  const { error: deleteError, count } = await supabase
    .from("recipes")
    .delete({ count: "exact" })
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[delete-recipe] Error eliminando receta:", deleteError);
    return { success: false, error: "No pudimos eliminar la receta. Inténtalo de nuevo." };
  }

  if ((count ?? 0) > 0) {
    return { success: true };
  }

  return { success: false, error: "No encontramos esa receta en tu recetario." };
}
