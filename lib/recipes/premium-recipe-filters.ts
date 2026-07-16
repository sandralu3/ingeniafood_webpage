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

export const RECIPE_SERVINGS_OPTIONS = [
  { value: 1, label: "1 persona", premium: true },
  { value: 2, label: "2 personas", premium: false },
  { value: 3, label: "3 personas", premium: true },
  { value: 4, label: "4 personas", premium: true },
  { value: 6, label: "6 personas", premium: true },
  { value: 8, label: "8 personas", premium: true }
] as const;

export type RecipeServings = (typeof RECIPE_SERVINGS_OPTIONS)[number]["value"];
export const FREE_DEFAULT_SERVINGS: RecipeServings = 2;

const SERVINGS_VALUES = new Set<RecipeServings>(
  RECIPE_SERVINGS_OPTIONS.map((item) => item.value)
);

const PREMIUM_SERVINGS = new Set<RecipeServings>(
  RECIPE_SERVINGS_OPTIONS.filter((item) => item.premium).map((item) => item.value)
);

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

export function parseRecipeServings(raw: unknown): RecipeServings | null {
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim().length > 0
        ? Number(raw.trim())
        : NaN;

  if (!Number.isInteger(value)) return null;
  return SERVINGS_VALUES.has(value as RecipeServings) ? (value as RecipeServings) : null;
}

export function isPremiumServings(servings: RecipeServings): boolean {
  return PREMIUM_SERVINGS.has(servings);
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
  servings: RecipeServings;
  sanitized: boolean;
};

export type AppliedRecipeFilters = Pick<
  ResolvedRecipeFilters,
  "mealType" | "cuisineStyle" | "servings"
>;

export function getRecipeMealTypeLabel(mealType: RecipeMealType): string {
  return RECIPE_MEAL_TYPES.find((item) => item.id === mealType)?.label ?? mealType;
}

export function getRecipeCuisineStyleLabel(cuisineStyle: RecipeCuisineStyle): string {
  return RECIPE_CUISINE_STYLES.find((item) => item.id === cuisineStyle)?.label ?? cuisineStyle;
}

export function getRecipeCuisineStyleShortLabel(cuisineStyle: RecipeCuisineStyle): string {
  return RECIPE_CUISINE_STYLES.find((item) => item.id === cuisineStyle)?.shortLabel ?? cuisineStyle;
}

export function getRecipeServingsLabel(servings: RecipeServings): string {
  return RECIPE_SERVINGS_OPTIONS.find((item) => item.value === servings)?.label ?? `${servings} personas`;
}

export function getRecipeServingsShortLabel(servings: RecipeServings): string {
  return servings === 1 ? "1 porción" : `${servings} porciones`;
}

export function resolveRecipeFilters(options: {
  isPremium: boolean;
  requestedMealType?: unknown;
  requestedCuisineStyle?: unknown;
  requestedServings?: unknown;
}): ResolvedRecipeFilters {
  const parsedMealType = parseRecipeMealType(options.requestedMealType) ?? FREE_DEFAULT_MEAL_TYPE;
  const parsedCuisineStyle =
    parseRecipeCuisineStyle(options.requestedCuisineStyle) ?? FREE_DEFAULT_CUISINE_STYLE;
  const parsedServings = parseRecipeServings(options.requestedServings) ?? FREE_DEFAULT_SERVINGS;

  if (options.isPremium) {
    return {
      mealType: parsedMealType,
      cuisineStyle: parsedCuisineStyle,
      servings: parsedServings,
      sanitized: false
    };
  }

  const mealType = isPremiumMealType(parsedMealType) ? FREE_DEFAULT_MEAL_TYPE : parsedMealType;
  const cuisineStyle = isPremiumCuisineStyle(parsedCuisineStyle)
    ? FREE_DEFAULT_CUISINE_STYLE
    : parsedCuisineStyle;
  const servings = isPremiumServings(parsedServings) ? FREE_DEFAULT_SERVINGS : parsedServings;

  return {
    mealType,
    cuisineStyle,
    servings,
    sanitized:
      mealType !== parsedMealType ||
      cuisineStyle !== parsedCuisineStyle ||
      servings !== parsedServings
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

export function buildServingsPromptClause(servings: RecipeServings): string {
  const peopleLabel = servings === 1 ? "1 persona" : `${servings} personas`;
  return (
    `PORCIONES (obligatorio): la receta debe estar calculada EXACTAMENTE para ${peopleLabel} (${servings} ${servings === 1 ? "porción" : "porciones"}). ` +
    `Escala todas las cantidades de ingredientes_detallados e ingredientes_estructurados para ese número de comensales. ` +
    `No generes cantidades para 1-2 porciones genéricas: deben corresponder a ${servings} porción(es) completas. ` +
    `Los pasos pueden referirse a "porciones" o "raciones" usando el número ${servings}.`
  );
}

export function buildIngredientQuantityPromptClause(servings: RecipeServings): string {
  const portionLabel = servings === 1 ? "1 porción" : `${servings} porciones`;
  return (
    `FORMATO OBLIGATORIO DE INGREDIENTES (${portionLabel}): cada ingrediente DEBE incluir cantidad y unidad escalada para ${portionLabel}. ` +
    "En ingredientes_detallados usa strings como '1/2 taza de avena en hojuelas', '200 g de yogur natural', '30 g de chocolate negro'. " +
    "Unidades permitidas: g, kg, ml, l, cdita, cda, taza, ud. Para condimentos sin medida exacta: 'Sal (al gusto)'. " +
    "PROHIBIDO devolver solo el nombre del ingrediente sin cantidad. " +
    "Además incluye ingredientes_estructurados: [{\"name\": string, \"amount\": number, \"unit\": string, \"optional\": boolean}] con amount ya escalado al total de porciones.\n\n"
  );
}

export const MACRO_ESTIMATION_PROMPT_CLAUSE =
  "MACRONUTRIENTES (obligatorio): incluye el objeto macronutrientes con estimación REAL por 1 porción de la receta, basada en ingredientes y cantidades totales divididas entre el número de porciones. " +
  'Formato: {"proteinas_g": number, "carbohidratos_g": number, "grasas_g": number, "calorias": number}. ' +
  "proteinas_g, carbohidratos_g y grasas_g en gramos enteros; calorias en kcal enteras coherentes con 4×proteínas + 4×carbohidratos + 9×grasas (±10%). " +
  "No inventes valores decorativos: deben reflejar el plato generado.\n\n";

export function buildRecipeFiltersPromptClause(filters: {
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
  servings: RecipeServings;
}): string {
  return `${buildMealTypePromptClause(filters.mealType)} ${buildCuisineStylePromptClause(filters.cuisineStyle)} ${buildServingsPromptClause(filters.servings)}`;
}
