import { createSupabaseClient } from "@/lib/supabaseClient";

export type RemoveFromFavoritesResult =
  | { success: true }
  | { success: false; error: string };

export async function handleRemoveFromFavorites(
  recipeId: string
): Promise<RemoveFromFavoritesResult> {
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

  const { error: unsaveError } = await supabase
    .from("saved_recipes")
    .delete()
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId);

  if (unsaveError) {
    console.error("[favorites] Error en saved_recipes:", unsaveError);
  }

  const { error: deleteError, count } = await supabase
    .from("recipes")
    .delete({ count: "exact" })
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[favorites] Error eliminando receta:", deleteError);
    return { success: false, error: "No pudimos eliminar la receta. Inténtalo de nuevo." };
  }

  if ((count ?? 0) > 0) {
    return { success: true };
  }

  if (!unsaveError) {
    return { success: true };
  }

  return { success: false, error: "No encontramos esa receta en tu recetario." };
}
