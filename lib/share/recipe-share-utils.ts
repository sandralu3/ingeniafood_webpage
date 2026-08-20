import type { Json } from "@/types/database.types";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";
import { resolveRecipeTags } from "@/lib/recipes/recipe-tags";
import { ingredientsJsonToDisplayStrings } from "@/lib/recipes/structured-ingredients";
import { buildMacroDisplay, parseMacrosFromJson } from "@/lib/recipes/recipe-macros";
import { getRecipeImageFallback } from "@/lib/recipes/dish-image-fallback";
import { isExternalMeal } from "@/lib/plan/external-meal";

export function inferDifficulty(pasosCount: number): string {
  if (pasosCount <= 3) return "FÁCIL";
  if (pasosCount <= 5) return "INTERMEDIO";
  return "AVANZADO";
}

export function formatTimeLabel(tiempo: string): string {
  const t = tiempo.trim().toUpperCase();
  if (t.includes("MIN")) return t.replace(/\s+/g, "\u00A0");
  const n = tiempo.match(/\d+/);
  return n ? `${n[0]}\u00A0MIN` : tiempo;
}

export function jsonToStringList(value: Json): string[] {
  if (Array.isArray(value)) {
    const structured = ingredientsJsonToDisplayStrings(value);
    if (structured.length > 0) {
      return structured;
    }

    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

/** Pasos de preparación: no pasar por el parser de ingredientes (Title Case). */
export function jsonToStepList(value: Json): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object" && "text" in item && typeof (item as { text: unknown }).text === "string") {
          return (item as { text: string }).text.trim();
        }
        if (item && typeof item === "object" && "step" in item && typeof (item as { step: unknown }).step === "string") {
          return (item as { step: string }).step.trim();
        }
        return String(item ?? "").trim();
      })
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

export function parseInstructionsToSteps(instructions: string): string[] {
  return instructions
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

export function buildMacroData(recipe: ShareableRecipe) {
  return buildMacroDisplay(recipe);
}

type SavedRecipeSource = {
  title: string;
  ingredients: Json;
  steps?: Json;
  instructions: string;
  cooking_time: number | null;
  tip_sandra?: string | null;
  meal_type_advisory?: string | null;
  is_airfryer?: boolean;
  is_flourless?: boolean;
  is_sandra_recipe?: boolean | null;
  tags?: Json;
  macros?: Json | null;
  image_url?: string | null;
  reference_image_url?: string | null;
};

export function savedRecipeToShareable(recipe: SavedRecipeSource): ShareableRecipe {
  const tags = resolveRecipeTags({
    tags: recipe.tags,
    is_airfryer: recipe.is_airfryer,
    is_flourless: recipe.is_flourless
  });
  const external = isExternalMeal(tags);

  const ingredientes = jsonToStringList(recipe.ingredients);
  // Si hay pasos reales (p. ej. escaneo Admin), mostrarlos aunque siga etiquetada como comida fuera.
  let pasos = recipe.steps ? jsonToStepList(recipe.steps) : [];
  if (pasos.length === 0 && !external) {
    pasos = parseInstructionsToSteps(recipe.instructions);
  }

  const tiempo =
    recipe.cooking_time && recipe.cooking_time > 0
      ? `${recipe.cooking_time} min`
      : external && pasos.length === 0
        ? ""
        : "25 min";

  const storedImage = recipe.image_url?.trim() || null;
  const storedReference = recipe.reference_image_url?.trim() || null;
  const isExternalPlateOnly = external && pasos.length === 0;
  const isSandraRecipe = Boolean(recipe.is_sandra_recipe);

  let imageUrl: string | null = storedImage;
  let referenceImageUrl: string | null = isExternalPlateOnly ? null : storedReference;

  if (isSandraRecipe) {
    // Foto oficial del plato: nunca duplicar como imagen de referencia.
    imageUrl = storedImage || storedReference;
    referenceImageUrl = null;
  } else if (!isExternalPlateOnly) {
    if (imageUrl && referenceImageUrl && imageUrl === referenceImageUrl) {
      // Banco / stock: mantener ambas iguales.
    } else if (imageUrl && !referenceImageUrl) {
      // Legacy free/stock guardado solo en image_url → tratar como referencia.
      referenceImageUrl = imageUrl;
    } else if (!imageUrl && referenceImageUrl) {
      imageUrl = referenceImageUrl;
    } else if (!imageUrl && !referenceImageUrl) {
      const fallback = getRecipeImageFallback({
        title: recipe.title,
        image_url: null,
        reference_image_url: null,
        ingredients: ingredientes,
        tags
      });
      imageUrl = fallback;
      referenceImageUrl = fallback;
    }
  }

  return {
    titulo: recipe.title,
    tiempo_preparacion: tiempo,
    ingredientes_detallados: ingredientes,
    pasos_ordenados: pasos,
    tip_sandra: recipe.tip_sandra ?? "",
    meal_type_advisory: recipe.meal_type_advisory?.trim() || null,
    tags,
    macronutrientes: parseMacrosFromJson(recipe.macros),
    imageUrl: isExternalPlateOnly ? storedImage : imageUrl,
    referenceImageUrl: isExternalPlateOnly || isSandraRecipe ? null : referenceImageUrl
  };
}
