import type { MealType } from "@/lib/plan/constants";
import {
  parseRecipeMealType,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";

export type RecipeCandidate = {
  id: string;
  title: string;
  description: string | null;
  instructions: string;
  meal_type?: string | null;
};

/** Keywords solo como fallback si la receta no tiene `meal_type` guardado. */
const BREAKFAST_KEYWORDS = [
  "desayuno",
  "breakfast",
  "overnight",
  "avena",
  "oat",
  "tostada",
  "smoothie",
  "granola",
  "yogur",
  "yogurt",
  "pancake",
  "waffle",
  "porridge",
  "matutin",
  "brunch",
  "shakshuka"
];

const LUNCH_DINNER_KEYWORDS = [
  "almuerzo",
  "lunch",
  "cena",
  "dinner",
  "ensalada",
  "salad",
  "guiso",
  "estofado",
  "salteado",
  "wok",
  "risotto",
  "pasta",
  "arroz",
  "pollo",
  "carne",
  "pescado",
  "salmón",
  "salmon",
  "atún",
  "tofu",
  "legumbre",
  "garbanzo",
  "lenteja",
  "quinoa",
  "wrap",
  "sopa",
  "airfryer"
];

const DESSERT_KEYWORDS = [
  "postre",
  "dessert",
  "dulce",
  "tarta",
  "brownie",
  "helado",
  "mousse",
  "galleta",
  "cookie",
  "muffin",
  "bizcocho"
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function recipeSearchText(recipe: RecipeCandidate): string {
  return normalizeText(
    `${recipe.title} ${recipe.description ?? ""} ${recipe.instructions}`
  );
}

function includesAny(blob: string, keywords: string[]): boolean {
  return keywords.some((keyword) => blob.includes(normalizeText(keyword)));
}

/**
 * Convierte MealType del plan → tipos de filtro de receta compatibles.
 * Desayuno es exclusivo. Almuerzo y Cena se pueden intercambiar.
 * Postre no entra en comidas principales.
 */
export function compatibleRecipeMealTypes(slot: MealType): RecipeMealType[] {
  switch (slot) {
    case "Desayuno":
      return ["desayuno"];
    case "Almuerzo":
      return ["almuerzo", "cena"];
    case "Cena":
      return ["cena", "almuerzo"];
    default:
      return ["almuerzo", "cena"];
  }
}

function inferMealTypeFromText(recipe: RecipeCandidate): RecipeMealType | null {
  const blob = recipeSearchText(recipe);
  if (includesAny(blob, DESSERT_KEYWORDS)) return "postre";
  if (includesAny(blob, BREAKFAST_KEYWORDS)) return "desayuno";
  if (includesAny(blob, LUNCH_DINNER_KEYWORDS)) return "almuerzo";
  return null;
}

/**
 * Tipo efectivo de la receta: prioriza `meal_type` persistido; si no, heurística de texto.
 */
export function resolveRecipeMealType(recipe: RecipeCandidate): RecipeMealType | null {
  return parseRecipeMealType(recipe.meal_type ?? null) ?? inferMealTypeFromText(recipe);
}

export function recipeMatchesMealType(recipe: RecipeCandidate, mealType: MealType): boolean {
  const resolved = resolveRecipeMealType(recipe);
  if (!resolved) return false;
  if (resolved === "postre") return false;
  return compatibleRecipeMealTypes(mealType).includes(resolved);
}

/**
 * Elige una receta coherente con el slot.
 * - Desayuno → solo desayunos
 * - Almuerzo/Cena → almuerzo o cena (intercambiables)
 * - Sin coincidencias coherentes → null (no fuerza un plato incompatible)
 */
export function pickRandomRecipe(
  recipes: RecipeCandidate[],
  mealType: MealType,
  excludeRecipeId: string
): RecipeCandidate | null {
  const pool = recipes.filter((recipe) => recipe.id !== excludeRecipeId);
  if (!pool.length) return null;

  const typed = pool.filter((recipe) => recipeMatchesMealType(recipe, mealType));
  if (!typed.length) return null;

  // Prefer exact slot match (almuerzo→almuerzo) over the interchangeable pair.
  const preferredType: RecipeMealType =
    mealType === "Desayuno" ? "desayuno" : mealType === "Cena" ? "cena" : "almuerzo";

  const preferred = typed.filter((recipe) => resolveRecipeMealType(recipe) === preferredType);
  const candidates = preferred.length ? preferred : typed;
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index] ?? null;
}
