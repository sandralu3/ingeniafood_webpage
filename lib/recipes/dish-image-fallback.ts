import { matchDishImageFromBundledCatalog } from "@/lib/recipes/dish-image-bank-catalog";
import { isExternalMeal } from "@/lib/plan/external-meal";

/**
 * Fallback de portada (cliente/servidor) sin depender de OpenAI.
 * Misma URL estable que el placeholder del banco de platos.
 */
export const DEFAULT_DISH_HERO_FALLBACK =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

/** Ruta pública opcional si se añade el asset local más adelante. */
export const LOCAL_DISH_HERO_FALLBACK = "/images/placeholders/default-food.jpg";

type RecipeImageSource = {
  image?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  referenceImageUrl?: string | null;
  reference_image_url?: string | null;
  titulo?: string | null;
  title?: string | null;
  ingredientes_detallados?: string[] | null;
  ingredients?: string[] | null;
  tags?: string[] | null;
};

/**
 * Elige la mejor URL disponible en el objeto receta (sin red).
 */
export function pickStoredRecipeImageUrl(recipe: RecipeImageSource): string | null {
  const candidates = [
    recipe.image,
    recipe.imageUrl,
    recipe.image_url,
    recipe.referenceImageUrl,
    recipe.reference_image_url
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Foto de stock del catálogo local según título/ingredientes, o fallback estable.
 * Seguro en cliente y servidor (sin OpenAI).
 * Comidas fuera: nunca inventa stock — solo aplica si hay foto real guardada.
 */
export function getRecipeImageFallback(recipe: RecipeImageSource): string {
  if (isExternalMeal(recipe.tags)) {
    return pickStoredRecipeImageUrl(recipe) || "";
  }

  const title = (recipe.titulo || recipe.title || "").trim();
  const ingredients = recipe.ingredientes_detallados ?? recipe.ingredients ?? [];
  const tags = recipe.tags ?? [];

  if (title || ingredients.length > 0) {
    try {
      const match = matchDishImageFromBundledCatalog({
        recipeTitle: title || "Receta",
        ingredients,
        tags,
        mealType: "almuerzo",
        cuisineStyle: "estandar"
      });
      if (match?.imageUrl) {
        return match.imageUrl;
      }
    } catch {
      // Catálogo no disponible: usar fallback estático.
    }
  }

  return DEFAULT_DISH_HERO_FALLBACK;
}

/**
 * Normaliza URLs de imagen para persistir / renderizar.
 * Recetas normales: siempre hay al menos un fallback de stock.
 * Comidas fuera: solo foto real (o vacío).
 */
export function normalizeRecipeImageFields(recipe: RecipeImageSource): {
  image: string;
  imageUrl: string;
  referenceImageUrl: string | null;
} {
  const stored = pickStoredRecipeImageUrl(recipe);
  if (isExternalMeal(recipe.tags)) {
    return {
      image: stored ?? "",
      imageUrl: stored ?? "",
      referenceImageUrl: null
    };
  }

  const fallback = getRecipeImageFallback(recipe);
  const imageUrl = stored || fallback;
  const reference =
    (typeof recipe.referenceImageUrl === "string" && recipe.referenceImageUrl.trim()) ||
    (typeof recipe.reference_image_url === "string" && recipe.reference_image_url.trim()) ||
    null;

  return {
    image: imageUrl,
    imageUrl,
    referenceImageUrl: reference && reference !== imageUrl ? reference : stored ? null : null
  };
}
