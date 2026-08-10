import { createSupabaseClient } from "@/lib/supabaseClient";

export type FavoriteMutationResult =
  | { success: true; isFavorite: boolean }
  | { success: false; error: string };

export type FavoriteIdsResult =
  | { success: true; ids: Set<string> }
  | { success: false; error: string };

/** IDs de recetas marcadas como favoritas (`saved_recipes`). */
export async function fetchFavoriteRecipeIds(
  userId?: string | null
): Promise<FavoriteIdsResult> {
  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch {
    return { success: false, error: "No se pudo conectar con Supabase." };
  }

  let resolvedUserId = userId?.trim() || null;
  if (!resolvedUserId) {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    resolvedUserId = session?.user?.id ?? null;
  }

  if (!resolvedUserId) {
    return { success: false, error: "Inicia sesión para gestionar tus favoritos." };
  }

  const { data, error } = await supabase
    .from("saved_recipes")
    .select("recipe_id")
    .eq("user_id", resolvedUserId);

  if (error) {
    console.error("[favorites] Error listando favoritos:", error);
    return { success: false, error: "No pudimos cargar tus favoritos." };
  }

  return {
    success: true,
    ids: new Set((data ?? []).map((row) => row.recipe_id).filter(Boolean))
  };
}

export async function isRecipeFavorite(recipeId: string): Promise<boolean> {
  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch {
    return false;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from("saved_recipes")
    .select("recipe_id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (error) {
    console.error("[favorites] Error consultando favorito:", error);
    return false;
  }

  return Boolean(data);
}

export async function addRecipeFavorite(
  recipeId: string
): Promise<FavoriteMutationResult> {
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
    return { success: false, error: "Inicia sesión para marcar favoritos." };
  }

  const { error } = await supabase.from("saved_recipes").upsert(
    { user_id: user.id, recipe_id: recipeId },
    { onConflict: "user_id,recipe_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[favorites] Error añadiendo favorito:", error);
    return { success: false, error: "No pudimos añadir la receta a favoritos." };
  }

  return { success: true, isFavorite: true };
}

export async function removeRecipeFavorite(
  recipeId: string
): Promise<FavoriteMutationResult> {
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
    return { success: false, error: "Inicia sesión para gestionar favoritos." };
  }

  const { error } = await supabase
    .from("saved_recipes")
    .delete()
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId);

  if (error) {
    console.error("[favorites] Error quitando favorito:", error);
    return { success: false, error: "No pudimos quitar la receta de favoritos." };
  }

  return { success: true, isFavorite: false };
}

export async function toggleRecipeFavorite(
  recipeId: string,
  currentlyFavorite: boolean
): Promise<FavoriteMutationResult> {
  return currentlyFavorite
    ? removeRecipeFavorite(recipeId)
    : addRecipeFavorite(recipeId);
}
