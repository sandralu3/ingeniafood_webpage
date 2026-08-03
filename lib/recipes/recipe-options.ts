import type { RecipeMacros } from "@/lib/recipes/recipe-macros";

export type RecipeOptionVariant = "classic" | "quick" | "light";

export type RecipeOption = {
  titulo: string;
  tiempo_preparacion: string;
  ingredientes_detallados: string[];
  pasos_ordenados: string[];
  tip_sandra: string;
  tags?: string[];
  macronutrientes?: RecipeMacros | null;
  imageUrl?: string | null;
  referenceImageUrl?: string | null;
  /** Id auto-guardado mientras se genera la foto OpenAI (polling). */
  savedRecipeId?: string | null;
  variant: RecipeOptionVariant;
  emoji: string;
  nombre_corto: string;
};

export const RECIPE_OPTION_VARIANTS: RecipeOptionVariant[] = [
  "classic",
  "quick",
  "light"
];

export const RECIPE_OPTION_DEFAULTS: Record<
  RecipeOptionVariant,
  { emoji: string; badgeKey: "badgeClassic" | "badgeQuick" | "badgeLight" }
> = {
  classic: { emoji: "🍲", badgeKey: "badgeClassic" },
  quick: { emoji: "⚡", badgeKey: "badgeQuick" },
  light: { emoji: "🥗", badgeKey: "badgeLight" }
};

export function normalizeRecipeVariant(value: unknown, fallbackIndex: number): RecipeOptionVariant {
  if (value === "classic" || value === "quick" || value === "light") {
    return value;
  }
  if (value === "fit" || value === "creative") {
    return "light";
  }
  if (value === "rapida" || value === "rápida" || value === "fast") {
    return "quick";
  }
  return RECIPE_OPTION_VARIANTS[fallbackIndex] ?? "classic";
}

export function shortRecipeName(title: string, explicit?: string | null): string {
  const fromExplicit = typeof explicit === "string" ? explicit.trim() : "";
  if (fromExplicit.length > 0) {
    // Hasta ~42 caracteres: cabe en 2 líneas de tarjeta sin forzar "…".
    return fromExplicit.length > 42 ? `${fromExplicit.slice(0, 41).trimEnd()}…` : fromExplicit;
  }
  const cleaned = title.trim();
  if (cleaned.length <= 42) return cleaned || "Receta";
  return `${cleaned.slice(0, 41).trimEnd()}…`;
}

/** Extrae el nombre base de una línea de ingrediente ("2 huevos" → "huevos"). */
export function ingredientBaseName(line: string): string {
  return line
    .replace(/^\d+([.,]\d+)?\s*(g|kg|ml|l|tz|cdta|cda|uds?|unidades?)?\s*/i, "")
    .replace(/\([^)]*\)/g, "")
    .trim()
    .toLowerCase();
}

export function partitionIngredientsByPantry(
  recipeLines: string[],
  pantryIngredients: string[]
): { available: string[]; missing: string[] } {
  const pantry = pantryIngredients
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const available: string[] = [];
  const missing: string[] = [];

  for (const line of recipeLines) {
    const base = ingredientBaseName(line);
    const hasMatch =
      pantry.length > 0 &&
      pantry.some(
        (item) =>
          base.includes(item) ||
          item.includes(base) ||
          line.toLowerCase().includes(item)
      );
    if (hasMatch) {
      available.push(line);
    } else {
      missing.push(line);
    }
  }

  return { available, missing };
}
