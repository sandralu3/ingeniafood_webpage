import {
  deleteSavedRecipe,
  type DeleteSavedRecipeResult
} from "@/lib/recipes/delete-saved-recipe";

export type RemoveFromFavoritesResult = DeleteSavedRecipeResult;

/**
 * @deprecated Prefer `deleteSavedRecipe`. El corazón ya no elimina; solo la papelera.
 */
export async function handleRemoveFromFavorites(
  recipeId: string
): Promise<RemoveFromFavoritesResult> {
  return deleteSavedRecipe(recipeId);
}
