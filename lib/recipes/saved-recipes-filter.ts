import type { Database, Json } from "@/types/database.types";
import {
  preferredDietLabel,
  recipeMatchesPreferredDiet,
  type PreferredDiet
} from "@/lib/nutrition/preferred-diet";
import {
  getRecipeDietsFromTags,
  hasRecipeDietAssignment
} from "@/lib/recipes/recipe-diet-tags";
import { ingredientsJsonToDisplayStrings } from "@/lib/recipes/structured-ingredients";
import {
  parseRecipeMealType,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";

/** Filtro legado (picker del Plan + menú antiguo). */
export type SavedRecipeFilter =
  | "Todas"
  | "Desayunos"
  | "Almuerzos"
  | "Cenas"
  | "Snacks"
  | "Airfryer"
  | "Sin Harinas";

export const SAVED_RECIPE_FILTERS: SavedRecipeFilter[] = [
  "Todas",
  "Desayunos",
  "Almuerzos",
  "Cenas",
  "Snacks",
  "Airfryer",
  "Sin Harinas"
];

/** Tipo de comida en la hoja de filtros de Recetas. */
export type SavedRecipeMealFilter =
  | "Todas"
  | "Desayunos"
  | "Almuerzos"
  | "Cenas"
  | "Snacks"
  | "Postres";

export const SAVED_RECIPE_MEAL_FILTERS: SavedRecipeMealFilter[] = [
  "Todas",
  "Desayunos",
  "Almuerzos",
  "Cenas",
  "Snacks",
  "Postres"
];

/** Extras (airfryer / sin harinas). */
export type SavedRecipeExtraFilter = "Ninguno" | "Airfryer" | "Sin Harinas";

export const SAVED_RECIPE_EXTRA_FILTERS: SavedRecipeExtraFilter[] = [
  "Ninguno",
  "Airfryer",
  "Sin Harinas"
];

export type SavedRecipesFilterState = {
  mealFilter: SavedRecipeMealFilter;
  extraFilter: SavedRecipeExtraFilter;
  /** `null` o `estandar` = sin filtro de dieta. */
  dietFilter: PreferredDiet | null;
};

export const DEFAULT_SAVED_RECIPES_FILTER_STATE: SavedRecipesFilterState = {
  mealFilter: "Todas",
  extraFilter: "Ninguno",
  dietFilter: null
};

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

const BREAKFAST_KEYWORDS = [
  "desayuno",
  "breakfast",
  "overnight",
  "overnight oats",
  "avena",
  "oats",
  "smoothie",
  "tostada",
  "granola",
  "yogur",
  "yogurt",
  "pancake",
  "waffle",
  "muffin",
  "porridge",
  "chia",
  "revuelto"
];

const DINNER_KEYWORDS = [
  "cena",
  "dinner",
  "sopa",
  "guiso",
  "estofado",
  "salteado",
  "nocturn",
  "lasaña",
  "lasana",
  "risotto",
  "tallarin",
  "albondiga",
  "albóndiga"
];

const LUNCH_KEYWORDS = [
  "almuerzo",
  "lunch",
  "ensalada",
  "salad",
  "wrap",
  "sandwich",
  "sándwich",
  "poke",
  "quinoa"
];

const SNACK_TITLE_HINTS = ["snack", "tentempie", "tentempié", "merienda", "picoteo"];
const DESSERT_TITLE_HINTS = ["postre", "dessert", "dulce", "brownie", "tarta", "galleta"];

const MEAL_TYPE_CARD_LABEL: Record<RecipeMealType, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  snack: "Snack",
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

function tagsToSearchableText(tags: unknown): string {
  return normalizeRecipeTags(tags)
    .map((tag) => tag.replace(/^diet:/i, "").replace(/_/g, " "))
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
      jsonToSearchableText(recipe.steps),
      tagsToSearchableText(recipe.tags)
    ].join(" ")
  );
}

function includesAnyKeyword(blob: string, keywords: string[]): boolean {
  return keywords.some((keyword) => {
    const needle = normalizeSearchText(keyword);
    if (!needle) return false;
    // Evita falsos positivos por subcadena (ej. "oat" dentro de otras palabras).
    const pattern = new RegExp(
      `(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
      "i"
    );
    return pattern.test(blob);
  });
}

function mealTypeToFilter(mealType: RecipeMealType): SavedRecipeMealFilter {
  switch (mealType) {
    case "desayuno":
      return "Desayunos";
    case "almuerzo":
      return "Almuerzos";
    case "cena":
      return "Cenas";
    case "snack":
      return "Snacks";
    case "postre":
      return "Postres";
  }
}

/**
 * Una sola categoría por receta. Prioridad: meal_type → tags de momento → título.
 * No usa el blob de ingredientes (evita que «crema»/«bowl» metan desayunos en cena/almuerzo).
 */
export function resolveSavedRecipeMealFilter(recipe: {
  title: string;
  meal_type?: string | null;
  tags?: unknown;
}): SavedRecipeMealFilter | null {
  const mealType = parseRecipeMealType(recipe.meal_type ?? null);
  if (mealType) return mealTypeToFilter(mealType);

  const tags = normalizeRecipeTags(recipe.tags).map((tag) => tag.toLowerCase());
  if (tags.some((tag) => tag === "desayuno" || tag === "breakfast")) return "Desayunos";
  if (tags.some((tag) => tag === "almuerzo" || tag === "lunch")) return "Almuerzos";
  if (tags.some((tag) => tag === "cena" || tag === "dinner")) return "Cenas";
  if (tags.some((tag) => tag === "snack")) return "Snacks";
  if (tags.some((tag) => tag === "postre" || tag === "dessert")) return "Postres";

  if (isExplicitDessertRecipe(recipe)) return "Postres";
  if (isExplicitSnackRecipe(recipe)) return "Snacks";

  const title = normalizeSearchText(recipe.title);
  if (includesAnyKeyword(title, BREAKFAST_KEYWORDS)) return "Desayunos";
  if (includesAnyKeyword(title, DINNER_KEYWORDS)) return "Cenas";
  if (includesAnyKeyword(title, LUNCH_KEYWORDS)) return "Almuerzos";
  if (/\bpasta\b/.test(title)) return "Almuerzos";

  return null;
}

/** Snack = meal_type/tag snack. Sin heurística amplia (batido/yogur = desayuno). */
function isExplicitSnackRecipe(recipe: {
  meal_type?: string | null;
  tags?: unknown;
  title: string;
}): boolean {
  const mealType = parseRecipeMealType(recipe.meal_type ?? null);
  if (mealType === "snack") return true;
  if (mealType) return false;

  const tags = normalizeRecipeTags(recipe.tags).map((tag) => tag.toLowerCase());
  if (tags.includes("snack")) return true;

  const title = normalizeSearchText(recipe.title);
  return SNACK_TITLE_HINTS.some(
    (hint) => title === hint || title.startsWith(`${hint} `) || title.includes(` ${hint} `)
  );
}

function isExplicitDessertRecipe(recipe: {
  meal_type?: string | null;
  tags?: unknown;
  title: string;
}): boolean {
  const mealType = parseRecipeMealType(recipe.meal_type ?? null);
  if (mealType === "postre") return true;
  if (mealType) return false;

  const tags = normalizeRecipeTags(recipe.tags).map((tag) => tag.toLowerCase());
  if (tags.includes("postre") || tags.includes("dessert")) return true;

  const title = normalizeSearchText(recipe.title);
  return DESSERT_TITLE_HINTS.some(
    (hint) => title === hint || title.startsWith(`${hint} `) || title.includes(` ${hint} `)
  );
}

export function isRestrictiveDietFilter(diet: PreferredDiet | null | undefined): boolean {
  return Boolean(diet && diet !== "estandar");
}

export function matchesSavedRecipeDiet(
  recipe: RecipeRow,
  diet: PreferredDiet | null | undefined
): boolean {
  if (!isRestrictiveDietFilter(diet)) return true;

  if (hasRecipeDietAssignment(recipe.tags)) {
    return getRecipeDietsFromTags(recipe.tags).includes(
      diet as Exclude<PreferredDiet, "estandar">
    );
  }

  // Sin tags canónicos: incluir true u unknown; excluir solo incompatibles.
  return recipeMatchesPreferredDiet(recipe, diet) !== false;
}

export function matchesSavedRecipeMeal(
  recipe: RecipeRow,
  filter: SavedRecipeMealFilter
): boolean {
  if (filter === "Todas") return true;
  const resolved = resolveSavedRecipeMealFilter(recipe);
  // Sin categoría clara: no entra en filtros concretos (sí en «Todas»).
  return resolved === filter;
}

export function matchesSavedRecipeExtra(
  recipe: RecipeRow,
  filter: SavedRecipeExtraFilter
): boolean {
  if (filter === "Ninguno") return true;
  const blob = buildRecipeSearchBlob(recipe);
  if (filter === "Airfryer") {
    return recipe.is_airfryer || blob.includes("airfryer") || blob.includes("air fryer");
  }
  return recipe.is_flourless || blob.includes("sin harinas") || blob.includes("sin harina");
}

/** Compatibilidad con el picker del Plan (Snacks incluye postre). */
export function matchesSavedRecipeCategory(recipe: RecipeRow, filter: SavedRecipeFilter): boolean {
  if (filter === "Todas") return true;
  if (filter === "Airfryer") return matchesSavedRecipeExtra(recipe, "Airfryer");
  if (filter === "Sin Harinas") return matchesSavedRecipeExtra(recipe, "Sin Harinas");
  if (filter === "Snacks") {
    const resolved = resolveSavedRecipeMealFilter(recipe);
    return resolved === "Snacks" || resolved === "Postres";
  }
  return matchesSavedRecipeMeal(recipe, filter);
}

export function matchesSavedRecipeSearch(recipe: RecipeRow, searchTerm: string): boolean {
  const normalizedTerm = normalizeSearchText(searchTerm);
  if (!normalizedTerm) return true;

  const blob = buildRecipeSearchBlob(recipe);
  const tokens = normalizedTerm.split(/\s+/).filter(Boolean);
  return tokens.every((token) => blob.includes(token));
}

export function countActiveSavedRecipeFilters(state: SavedRecipesFilterState): number {
  let count = 0;
  if (state.mealFilter !== "Todas") count += 1;
  if (state.extraFilter !== "Ninguno") count += 1;
  if (isRestrictiveDietFilter(state.dietFilter)) count += 1;
  return count;
}

export function summarizeSavedRecipeFilters(
  state: SavedRecipesFilterState,
  translateMeal: (filter: SavedRecipeMealFilter) => string,
  translateExtra: (filter: SavedRecipeExtraFilter) => string,
  translateDiet: (diet: PreferredDiet) => string = preferredDietLabel
): string {
  const parts: string[] = [];
  if (state.mealFilter !== "Todas") parts.push(translateMeal(state.mealFilter));
  if (isRestrictiveDietFilter(state.dietFilter) && state.dietFilter) {
    parts.push(translateDiet(state.dietFilter));
  }
  if (state.extraFilter !== "Ninguno") parts.push(translateExtra(state.extraFilter));
  return parts.join(" · ");
}

export function filterSavedRecipes(
  recipes: RecipeRow[],
  options: {
    searchTerm: string;
    categoryFilter?: SavedRecipeFilter;
    mealFilter?: SavedRecipeMealFilter;
    extraFilter?: SavedRecipeExtraFilter;
    dietFilter?: PreferredDiet | null;
  }
): RecipeRow[] {
  const mealFilter = options.mealFilter ?? "Todas";
  const extraFilter = options.extraFilter ?? "Ninguno";
  const dietFilter = options.dietFilter ?? null;
  const legacyCategory = options.categoryFilter;

  return recipes.filter((recipe) => {
    const matchesSearch = matchesSavedRecipeSearch(recipe, options.searchTerm);
    if (!matchesSearch) return false;

    if (legacyCategory && !options.mealFilter && !options.extraFilter) {
      return matchesSavedRecipeCategory(recipe, legacyCategory);
    }

    return (
      matchesSavedRecipeMeal(recipe, mealFilter) &&
      matchesSavedRecipeExtra(recipe, extraFilter) &&
      matchesSavedRecipeDiet(recipe, dietFilter)
    );
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
  if (includesAnyKeyword(blob, SNACK_TITLE_HINTS)) return "Snack";
  if (includesAnyKeyword(blob, DESSERT_TITLE_HINTS)) return "Postre";
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
  tags?: unknown;
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

  const blob = normalizeSearchText(source.title);
  if (filter === "Airfryer") {
    return Boolean(source.is_airfryer) || blob.includes("airfryer") || blob.includes("air fryer");
  }
  if (filter === "Sin Harinas") {
    return Boolean(source.is_flourless) || blob.includes("sin harinas") || blob.includes("sin harina");
  }
  if (filter === "Snacks") {
    const resolved = resolveSavedRecipeMealFilter(source);
    return resolved === "Snacks" || resolved === "Postres";
  }
  return resolveSavedRecipeMealFilter(source) === filter;
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
 * Etiqueta de tipo de comida en la lista: prioriza `meal_type` persistido.
 * El origen (Escaneado / Registrada) se muestra aparte en la tarjeta.
 * Solo usa heurística por título/ingredientes en recetas legacy sin ese campo.
 */
export function getRecipeCardLabel(recipe: RecipeRow): string | null {
  const resolved = resolveSavedRecipeMealFilter(recipe);
  if (resolved === "Desayunos") return "Desayuno";
  if (resolved === "Almuerzos") return "Almuerzo";
  if (resolved === "Cenas") return "Cena";
  if (resolved === "Snacks") return "Snack";
  if (resolved === "Postres") return "Postre";

  return resolveRecipeCardLabelFromKeywords(buildRecipeSearchBlob(recipe), recipe);
}
