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
  is_airfryer?: boolean;
  is_flourless?: boolean;
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
  let pasos = external ? [] : recipe.steps ? jsonToStringList(recipe.steps) : [];
  if (!external && pasos.length === 0) {
    pasos = parseInstructionsToSteps(recipe.instructions);
  }

  const tiempo =
    recipe.cooking_time && recipe.cooking_time > 0
      ? `${recipe.cooking_time} min`
      : external
        ? ""
        : "25 min";

  const storedImage = recipe.image_url?.trim() || null;
  const storedReference = recipe.reference_image_url?.trim() || null;
  // Comida fuera: solo foto del plato (o ninguna). Nunca banco/stock.
  const resolvedImage = external
    ? storedImage
    : storedImage ||
      storedReference ||
      getRecipeImageFallback({
        title: recipe.title,
        image_url: storedImage,
        reference_image_url: storedReference,
        ingredients: jsonToStringList(recipe.ingredients),
        tags
      });

  return {
    titulo: recipe.title,
    tiempo_preparacion: tiempo,
    ingredientes_detallados: ingredientes,
    pasos_ordenados: pasos,
    tip_sandra: recipe.tip_sandra ?? "",
    tags,
    macronutrientes: parseMacrosFromJson(recipe.macros),
    imageUrl: resolvedImage,
    referenceImageUrl:
      !external && storedReference && storedReference !== resolvedImage ? storedReference : null
  };
}
