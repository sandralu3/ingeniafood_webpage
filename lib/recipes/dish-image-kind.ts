import { DEFAULT_DISH_HERO_FALLBACK } from "@/lib/recipes/dish-image-fallback";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";

/** Hay foto real distinta de la de referencia (p. ej. OpenAI ya lista). */
export function hasDistinctRealDishPhoto(
  recipe: Pick<ShareableRecipe, "imageUrl" | "referenceImageUrl">
): boolean {
  const primary = recipe.imageUrl?.trim() || null;
  const reference = recipe.referenceImageUrl?.trim() || null;
  if (!primary || !reference) return false;
  return primary !== reference;
}

/**
 * True cuando la imagen mostrada no es la foto real generada (OpenAI),
 * sino banco/referencia, stock o fallback.
 */
export function isShowingReferenceDishImage(params: {
  recipe: Pick<ShareableRecipe, "imageUrl" | "referenceImageUrl">;
  heroImageUrl: string | null;
  imageFailed?: boolean;
}): boolean {
  const { recipe, heroImageUrl, imageFailed = false } = params;
  if (!heroImageUrl) return false;
  if (heroImageUrl === DEFAULT_DISH_HERO_FALLBACK) return true;

  if (
    hasDistinctRealDishPhoto(recipe) &&
    !imageFailed &&
    heroImageUrl === recipe.imageUrl?.trim()
  ) {
    return false;
  }

  return true;
}
