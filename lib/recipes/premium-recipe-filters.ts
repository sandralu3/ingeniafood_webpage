export const RECIPE_MEAL_TYPES = [
  { id: "almuerzo", label: "Almuerzo", premium: false },
  { id: "desayuno", label: "Desayuno", premium: true },
  { id: "cena", label: "Cena", premium: true },
  { id: "postre", label: "Postre", premium: true }
] as const;

export const RECIPE_CUISINE_STYLES = [
  { id: "estandar", label: "Estándar / Mediterránea", shortLabel: "Mediterránea", premium: false },
  { id: "asiatica", label: "Asiática", shortLabel: "Asiática", premium: true },
  { id: "india", label: "India", shortLabel: "India", premium: true },
  { id: "fusion", label: "Fusión", shortLabel: "Fusión", premium: true },
  { id: "italiana", label: "Italiana", shortLabel: "Italiana", premium: true }
] as const;

export type RecipeMealType = (typeof RECIPE_MEAL_TYPES)[number]["id"];
export type RecipeCuisineStyle = (typeof RECIPE_CUISINE_STYLES)[number]["id"];

export const FREE_DEFAULT_MEAL_TYPE: RecipeMealType = "almuerzo";
export const FREE_DEFAULT_CUISINE_STYLE: RecipeCuisineStyle = "estandar";

const MEAL_TYPE_IDS = new Set<RecipeMealType>(RECIPE_MEAL_TYPES.map((item) => item.id));
const CUISINE_STYLE_IDS = new Set<RecipeCuisineStyle>(
  RECIPE_CUISINE_STYLES.map((item) => item.id)
);

const PREMIUM_MEAL_TYPES = new Set<RecipeMealType>(
  RECIPE_MEAL_TYPES.filter((item) => item.premium).map((item) => item.id)
);

const PREMIUM_CUISINE_STYLES = new Set<RecipeCuisineStyle>(
  RECIPE_CUISINE_STYLES.filter((item) => item.premium).map((item) => item.id)
);

export function parseRecipeMealType(raw: unknown): RecipeMealType | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return MEAL_TYPE_IDS.has(normalized as RecipeMealType)
    ? (normalized as RecipeMealType)
    : null;
}

export function parseRecipeCuisineStyle(raw: unknown): RecipeCuisineStyle | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return CUISINE_STYLE_IDS.has(normalized as RecipeCuisineStyle)
    ? (normalized as RecipeCuisineStyle)
    : null;
}

export function isPremiumMealType(mealType: RecipeMealType): boolean {
  return PREMIUM_MEAL_TYPES.has(mealType);
}

export function isPremiumCuisineStyle(cuisineStyle: RecipeCuisineStyle): boolean {
  return PREMIUM_CUISINE_STYLES.has(cuisineStyle);
}

export type ResolvedRecipeFilters = {
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
  sanitized: boolean;
};

export type AppliedRecipeFilters = Pick<ResolvedRecipeFilters, "mealType" | "cuisineStyle">;

export function getRecipeMealTypeLabel(mealType: RecipeMealType): string {
  return RECIPE_MEAL_TYPES.find((item) => item.id === mealType)?.label ?? mealType;
}

export function getRecipeCuisineStyleLabel(cuisineStyle: RecipeCuisineStyle): string {
  return RECIPE_CUISINE_STYLES.find((item) => item.id === cuisineStyle)?.label ?? cuisineStyle;
}

export function getRecipeCuisineStyleShortLabel(cuisineStyle: RecipeCuisineStyle): string {
  return RECIPE_CUISINE_STYLES.find((item) => item.id === cuisineStyle)?.shortLabel ?? cuisineStyle;
}

export function resolveRecipeFilters(options: {
  isPremium: boolean;
  requestedMealType?: unknown;
  requestedCuisineStyle?: unknown;
}): ResolvedRecipeFilters {
  const parsedMealType = parseRecipeMealType(options.requestedMealType) ?? FREE_DEFAULT_MEAL_TYPE;
  const parsedCuisineStyle =
    parseRecipeCuisineStyle(options.requestedCuisineStyle) ?? FREE_DEFAULT_CUISINE_STYLE;

  if (options.isPremium) {
    return {
      mealType: parsedMealType,
      cuisineStyle: parsedCuisineStyle,
      sanitized: false
    };
  }

  const mealType = isPremiumMealType(parsedMealType) ? FREE_DEFAULT_MEAL_TYPE : parsedMealType;
  const cuisineStyle = isPremiumCuisineStyle(parsedCuisineStyle)
    ? FREE_DEFAULT_CUISINE_STYLE
    : parsedCuisineStyle;

  return {
    mealType,
    cuisineStyle,
    sanitized: mealType !== parsedMealType || cuisineStyle !== parsedCuisineStyle
  };
}

export function buildMealTypePromptClause(mealType: RecipeMealType): string {
  const label = RECIPE_MEAL_TYPES.find((item) => item.id === mealType)?.label ?? mealType;

  switch (mealType) {
    case "desayuno":
      return `TIPO DE PLATO: genera una receta ideal para ${label}. Busca la mejor opción de mañana/brunch con los ingredientes disponibles (creativo pero realista).`;
    case "cena":
      return `TIPO DE PLATO: genera una receta ideal para ${label}. Equilibrada, reconfortante y apropiada para la noche.`;
    case "postre":
      return `TIPO DE PLATO: genera una receta de ${label}. Debe ser dulce o de repostería saludable, adaptando creativamente el ingrediente principal escaneado.`;
    case "almuerzo":
    default:
      return `TIPO DE PLATO: genera una receta ideal para ${label}. Plato principal de mediodía, nutritivo y práctico.`;
  }
}

export function buildCuisineStylePromptClause(cuisineStyle: RecipeCuisineStyle): string {
  switch (cuisineStyle) {
    case "asiatica":
      return "ESTILO CULINARIO: Asiática. Usa técnicas y sabores típicos (salteado, sésamo, jengibre, soja ligera, hierbas frescas) adaptados a los ingredientes del usuario.";
    case "india":
      return "ESTILO CULINARIO: India. Inspírate en especias aromáticas (comino, cúrcuma, cilantro, garam masala suave) y técnicas como salteado o guiso, sin inventar ingredientes no disponibles.";
    case "fusion":
      return "ESTILO CULINARIO: Fusión. Combina técnicas o sabores de distintas cocinas de forma creativa pero coherente con los ingredientes reales del usuario.";
    case "italiana":
      return "ESTILO CULINARIO: Italiana. Prioriza sabores mediterráneos italianos (aceite de oliva, hierbas, tomate, ajo) y preparaciones sencillas y reconfortantes.";
    case "estandar":
    default:
      return "ESTILO CULINARIO: Estándar / Mediterránea. Receta saludable, equilibrada y accesible, con técnicas cotidianas y perfil mediterráneo suave.";
  }
}

export function buildRecipeFiltersPromptClause(filters: {
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
}): string {
  return `${buildMealTypePromptClause(filters.mealType)} ${buildCuisineStylePromptClause(filters.cuisineStyle)}`;
}
