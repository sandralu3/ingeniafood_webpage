import type { Database, Json } from "@/types/database.types";
import { ingredientsJsonToDisplayStrings } from "@/lib/recipes/structured-ingredients";
import {
  getRecipeMealTypeLabel,
  parseRecipeMealType,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";

export type SavedRecipeFilter = "Todas" | "Airfryer" | "Desayunos" | "Cenas" | "Sin Harinas";

export const SAVED_RECIPE_FILTERS: SavedRecipeFilter[] = [
  "Todas",
  "Airfryer",
  "Desayunos",
  "Cenas",
  "Sin Harinas"
];

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

const BREAKFAST_KEYWORDS = [
  "desayuno",
  "breakfast",
  "overnight",
  "avena",
  "oat",
  "oats",
  "bowl matutin",
  "smoothie",
  "tostada",
  "granola",
  "yogur",
  "yogurt",
  "huevo",
  "pancake",
  "waffle",
  "cafe",
  "muffin",
  "porridge",
  "matutin",
  "chia"
];

const DINNER_KEYWORDS = [
  "cena",
  "dinner",
  "sopa",
  "crema",
  "guiso",
  "estofado",
  "asado",
  "salteado",
  "nocturn",
  "lasaña",
  "lasana",
  "risotto",
  "tallarin",
  "pasta",
  "albondiga"
];

const LUNCH_KEYWORDS = [
  "almuerzo",
  "lunch",
  "ensalada",
  "salad",
  "wrap",
  "sandwich",
  "bowl",
  "poke",
  "quinoa"
];

const MEAL_TYPE_CARD_LABEL: Record<RecipeMealType, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  postre: "Postre"
};

export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function jsonToSearchableText(value: Json): string {
  if (value === null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(jsonToSearchableText).join(" ");
  }
  return Object.values(value)
    .map((entry) => (entry === undefined ? "" : jsonToSearchableText(entry)))
    .join(" ");
}

export function buildRecipeSearchBlob(recipe: RecipeRow): string {
  const ingredientLines = ingredientsJsonToDisplayStrings(recipe.ingredients);
  const ingredientText =
    ingredientLines.length > 0 ? ingredientLines.join(" ") : jsonToSearchableText(recipe.ingredients);

  return normalizeSearchText(
    [
      recipe.title,
      recipe.description ?? "",
      recipe.instructions,
      ingredientText,
      jsonToSearchableText(recipe.steps)
    ].join(" ")
  );
}

function includesAnyKeyword(blob: string, keywords: string[]): boolean {
  return keywords.some((keyword) => blob.includes(normalizeSearchText(keyword)));
}

function storedMealType(recipe: Pick<RecipeRow, "meal_type">): RecipeMealType | null {
  return parseRecipeMealType(recipe.meal_type ?? null);
}

export function matchesSavedRecipeCategory(recipe: RecipeRow, filter: SavedRecipeFilter): boolean {
  if (filter === "Todas") return true;

  const mealType = storedMealType(recipe);
  const blob = buildRecipeSearchBlob(recipe);

  switch (filter) {
    case "Airfryer":
      return recipe.is_airfryer || blob.includes("airfryer") || blob.includes("air fryer");
    case "Sin Harinas":
      return recipe.is_flourless || blob.includes("sin harinas") || blob.includes("sin harina");
    case "Desayunos":
      if (mealType) return mealType === "desayuno";
      return includesAnyKeyword(blob, BREAKFAST_KEYWORDS);
    case "Cenas":
      if (mealType) return mealType === "cena";
      return includesAnyKeyword(blob, DINNER_KEYWORDS);
    default:
      return true;
  }
}

export function matchesSavedRecipeSearch(recipe: RecipeRow, searchTerm: string): boolean {
  const normalizedTerm = normalizeSearchText(searchTerm);
  if (!normalizedTerm) return true;

  const blob = buildRecipeSearchBlob(recipe);
  const tokens = normalizedTerm.split(/\s+/).filter(Boolean);
  return tokens.every((token) => blob.includes(token));
}

export function filterSavedRecipes(
  recipes: RecipeRow[],
  options: { searchTerm: string; categoryFilter: SavedRecipeFilter }
): RecipeRow[] {
  return recipes.filter((recipe) => {
    const matchesSearch = matchesSavedRecipeSearch(recipe, options.searchTerm);
    const matchesCategory = matchesSavedRecipeCategory(recipe, options.categoryFilter);
    return matchesSearch && matchesCategory;
  });
}

export function countSavedRecipesByCategory(
  recipes: RecipeRow[],
  filter: Exclude<SavedRecipeFilter, "Todas">
): number {
  return recipes.filter((recipe) => matchesSavedRecipeCategory(recipe, filter)).length;
}

function resolveRecipeCardLabelFromKeywords(
  blob: string,
  flags: { is_airfryer?: boolean; is_flourless?: boolean }
): string | null {
  if (includesAnyKeyword(blob, BREAKFAST_KEYWORDS)) return "Desayuno";
  if (includesAnyKeyword(blob, DINNER_KEYWORDS)) return "Cena";
  if (includesAnyKeyword(blob, LUNCH_KEYWORDS)) return "Almuerzo";
  if (flags.is_flourless || blob.includes("sin harinas") || blob.includes("sin harina")) {
    return "Sin Harinas";
  }
  if (flags.is_airfryer || blob.includes("airfryer") || blob.includes("air fryer")) {
    return "Airfryer";
  }
  return null;
}

export type RecipeLabelSource = {
  title: string;
  is_airfryer?: boolean;
  is_flourless?: boolean;
  meal_type?: string | null;
};

export function getRecipePickerCardLabel(source: RecipeLabelSource): string | null {
  const mealType = parseRecipeMealType(source.meal_type ?? null);
  if (mealType) return MEAL_TYPE_CARD_LABEL[mealType];
  return resolveRecipeCardLabelFromKeywords(normalizeSearchText(source.title), source);
}

export function matchesPickerRecipeCategory(
  source: RecipeLabelSource,
  filter: SavedRecipeFilter
): boolean {
  if (filter === "Todas") return true;

  const mealType = parseRecipeMealType(source.meal_type ?? null);
  const blob = normalizeSearchText(source.title);

  switch (filter) {
    case "Airfryer":
      return Boolean(source.is_airfryer) || blob.includes("airfryer") || blob.includes("air fryer");
    case "Sin Harinas":
      return Boolean(source.is_flourless) || blob.includes("sin harinas") || blob.includes("sin harina");
    case "Desayunos":
      if (mealType) return mealType === "desayuno";
      return includesAnyKeyword(blob, BREAKFAST_KEYWORDS);
    case "Cenas":
      if (mealType) return mealType === "cena";
      return includesAnyKeyword(blob, DINNER_KEYWORDS);
    default:
      return true;
  }
}

export function filterPickerRecipes<T extends RecipeLabelSource>(
  recipes: T[],
  options: { searchTerm: string; categoryFilter: SavedRecipeFilter }
): T[] {
  const normalizedTerm = normalizeSearchText(options.searchTerm);
  const tokens = normalizedTerm.split(/\s+/).filter(Boolean);

  return recipes.filter((recipe) => {
    const blob = normalizeSearchText(recipe.title);
    const matchesSearch =
      tokens.length === 0 || tokens.every((token) => blob.includes(token));
    const matchesCategory = matchesPickerRecipeCategory(recipe, options.categoryFilter);
    return matchesSearch && matchesCategory;
  });
}

/**
 * Etiqueta de categoría en la lista: prioriza `meal_type` persistido al generar/guardar.
 * Solo usa heurística por palabras del título/ingredientes en recetas legacy sin ese campo.
 */
export function getRecipeCardLabel(recipe: RecipeRow): string | null {
  const mealType = storedMealType(recipe);
  if (mealType) {
    return MEAL_TYPE_CARD_LABEL[mealType] ?? getRecipeMealTypeLabel(mealType);
  }
  return resolveRecipeCardLabelFromKeywords(buildRecipeSearchBlob(recipe), recipe);
}
