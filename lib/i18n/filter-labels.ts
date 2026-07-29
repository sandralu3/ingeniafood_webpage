import type {
  RecipeComplexity,
  RecipeCuisineStyle,
  RecipeMealType,
  RecipeServings
} from "@/lib/recipes/premium-recipe-filters";

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

const MEAL_KEYS: Record<RecipeMealType, string> = {
  almuerzo: "mealAlmuerzo",
  desayuno: "mealDesayuno",
  cena: "mealCena",
  postre: "mealPostre"
};

const CUISINE_KEYS: Record<RecipeCuisineStyle, string> = {
  estandar: "cuisineEstandar",
  asiatica: "cuisineAsiatica",
  india: "cuisineIndia",
  fusion: "cuisineFusion",
  italiana: "cuisineItaliana"
};

const CUISINE_SHORT_KEYS: Record<RecipeCuisineStyle, string> = {
  estandar: "cuisineEstandarShort",
  asiatica: "cuisineAsiatica",
  india: "cuisineIndia",
  fusion: "cuisineFusion",
  italiana: "cuisineItaliana"
};

const COMPLEXITY_KEYS: Record<RecipeComplexity, string> = {
  facil: "complexityFacil",
  intermedio: "complexityIntermedio",
  avanzado: "complexityAvanzado"
};

/** Traduce etiquetas de filtros del escáner (namespace Scanner). */
export function translateMealType(t: Translate, mealType: RecipeMealType): string {
  return t(MEAL_KEYS[mealType]);
}

export function translateCuisineStyle(t: Translate, cuisineStyle: RecipeCuisineStyle): string {
  return t(CUISINE_KEYS[cuisineStyle]);
}

export function translateCuisineStyleShort(t: Translate, cuisineStyle: RecipeCuisineStyle): string {
  return t(CUISINE_SHORT_KEYS[cuisineStyle]);
}

export function translateComplexity(t: Translate, complexity: RecipeComplexity): string {
  return t(COMPLEXITY_KEYS[complexity]);
}

export function translateServingsPeople(t: Translate, servings: RecipeServings): string {
  return t("servingsPeople", { count: servings });
}

export function translateServingsShort(t: Translate, servings: RecipeServings): string {
  return t("servingsShort", { count: servings });
}

/** Traduce tags de receta conocidos (namespace RecipeDetail o Saved). */
export function translateRecipeTag(t: Translate, tag: string): string {
  const normalized = tag.trim().toLowerCase();

  if (/sin\s+harinas?/.test(normalized)) return t("tagFlourless");
  if (/alto\s+en\s+prote[ií]na|high\s+protein/.test(normalized)) return t("tagHighProtein");
  if (/air\s*fryer|apto para airfryer/.test(normalized)) return t("tagAirfryer");
  if (/saludable|healthy/.test(normalized)) return t("tagHealthy");
  if (normalized === "desayuno" || normalized === "breakfast") return t("tagBreakfast");
  if (normalized === "almuerzo" || normalized === "lunch") return t("tagLunch");
  if (normalized === "cena" || normalized === "dinner") return t("tagDinner");
  if (normalized === "snack") return t("tagSnack");
  if (normalized === "postre" || normalized === "dessert") return t("tagDessert");

  return tag;
}

export function translateSavedCardLabel(t: Translate, label: string | null): string | null {
  if (!label) return null;
  switch (label) {
    case "Desayuno":
      return t("tagBreakfast");
    case "Almuerzo":
      return t("tagLunch");
    case "Cena":
      return t("tagDinner");
    case "Postre":
      return t("tagDessert");
    case "Sin Harinas":
      return t("tagFlourless");
    case "Airfryer":
      return t("tagAirfryer");
    default:
      return label;
  }
}

export function translateSavedFilterChip(t: Translate, filter: string): string {
  switch (filter) {
    case "Todas":
      return t("filterAll");
    case "Airfryer":
      return t("filterAirfryer");
    case "Desayunos":
      return t("filterBreakfasts");
    case "Cenas":
      return t("filterDinners");
    case "Sin Harinas":
      return t("filterFlourless");
    default:
      return filter;
  }
}
