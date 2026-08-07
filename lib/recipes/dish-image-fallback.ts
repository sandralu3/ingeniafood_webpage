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

function trimUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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
    const url = trimUrl(value);
    if (url) return url;
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
 * Normaliza URLs para persistir / renderizar.
 * - Foto real (OpenAI): imageUrl ≠ referenceImageUrl
 * - Solo referencia/stock: ambas iguales (así el UI no la trata como foto real)
 * - Comidas fuera: solo foto del plato
 */
export function normalizeRecipeImageFields(recipe: RecipeImageSource): {
  image: string;
  imageUrl: string;
  referenceImageUrl: string | null;
} {
  const primary = trimUrl(recipe.imageUrl) || trimUrl(recipe.image_url) || trimUrl(recipe.image);
  const reference =
    trimUrl(recipe.referenceImageUrl) || trimUrl(recipe.reference_image_url);

  if (isExternalMeal(recipe.tags)) {
    const plate = primary || reference || "";
    return {
      image: plate,
      imageUrl: plate,
      referenceImageUrl: null
    };
  }

  // Foto real distinta de la referencia.
  if (primary && reference && primary !== reference) {
    return {
      image: primary,
      imageUrl: primary,
      referenceImageUrl: reference
    };
  }

  // Banco provisional (misma URL en ambos) o solo una URL de stock.
  if (primary && reference && primary === reference) {
    return {
      image: primary,
      imageUrl: primary,
      referenceImageUrl: reference
    };
  }

  if (primary && !reference) {
    // Legacy / ambigua: tratar como referencia para no fingir foto real.
    return {
      image: primary,
      imageUrl: primary,
      referenceImageUrl: primary
    };
  }

  if (!primary && reference) {
    return {
      image: reference,
      imageUrl: reference,
      referenceImageUrl: reference
    };
  }

  const fallback = getRecipeImageFallback(recipe);
  return {
    image: fallback,
    imageUrl: fallback,
    referenceImageUrl: fallback
  };
}
