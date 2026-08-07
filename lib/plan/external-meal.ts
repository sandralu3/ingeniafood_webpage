import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";

export const EXTERNAL_MEAL_BADGE = {
  comida_fuera: "comida_fuera",
  escaneado: "escaneado"
} as const;

export type ExternalMealBadge =
  (typeof EXTERNAL_MEAL_BADGE)[keyof typeof EXTERNAL_MEAL_BADGE];

/** Unidades habituales para porciones estimadas del plato. */
export const EXTERNAL_MEAL_UNITS = [
  "g",
  "ml",
  "unidad",
  "rebanada",
  "cda",
  "cdta",
  "taza",
  "porción"
] as const;

export type ExternalMealUnit = (typeof EXTERNAL_MEAL_UNITS)[number];

export type ExternalMealFoodItem = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  calorias: number;
  proteinas_g: number;
  /** Cantidad original de la IA (para escalar macros al editar). */
  cantidad_ref: number;
  calorias_ref: number;
  proteinas_ref: number;
};

export type ExternalMealBalance = "equilibrado" | "mejorable" | "poco_saludable";

/** Platos/ingredientes ya registrados en el mismo bloque de comida (desayuno, almuerzo…). */
export type ExistingMealItem = {
  name: string;
  calories?: number;
  proteins_g?: number;
  carbs_g?: number;
  has_vegetables?: boolean;
  ingredient_names?: string[];
};

export type ExternalMealEstimate = {
  nombre_plato: string;
  calorias_est: number;
  proteinas_est_g: number;
  tiene_vegetales: boolean;
  badge: ExternalMealBadge;
  /** Alimentos detectados con porción estimada (editables por el usuario). */
  alimentos: ExternalMealFoodItem[];
  /** Evaluación de balance del menú. */
  balance: ExternalMealBalance;
  /** Consejos cortos: complementar, reducir, etc. */
  recomendaciones: string[];
  /** Título empático del aviso (opcional, viene de la IA). */
  recommendation_title?: string;
  /**
   * Solo Admin (escaneo foto): pasos de cocina para publicar como Receta de Sandra.
   * Los usuarios normales no reciben este campo.
   */
  pasos_ordenados?: string[];
  /** Tiempo estimado de preparación (p. ej. "25 min"), solo Admin. */
  tiempo_preparacion?: string;
  /** Tip de cocina de Sandra, solo Admin cuando hay pasos. */
  tip_sandra?: string;
};

export function normalizeExistingMealItems(raw: unknown): ExistingMealItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ExistingMealItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const rec = entry as Record<string, unknown>;
    const name =
      (typeof rec.name === "string" && rec.name.trim()) ||
      (typeof rec.nombre === "string" && rec.nombre.trim()) ||
      (typeof rec.title === "string" && rec.title.trim()) ||
      (typeof rec.dish_name === "string" && rec.dish_name.trim()) ||
      "";
    if (!name) continue;

    const caloriesRaw = rec.calories ?? rec.calorias ?? rec.kcal ?? rec.total_calories;
    const proteinsRaw =
      rec.proteins_g ?? rec.proteinas_g ?? rec.proteinGrams ?? rec.protein_g ?? rec.protein;
    const carbsRaw = rec.carbs_g ?? rec.carbohidratos_g ?? rec.carbsGrams ?? rec.carbs;
    const veggiesRaw = rec.has_vegetables ?? rec.tiene_vegetales ?? rec.hasVegetables;
    const ingredientRaw = rec.ingredient_names ?? rec.ingredientNames ?? rec.ingredients;

    const calories =
      typeof caloriesRaw === "number" && Number.isFinite(caloriesRaw)
        ? Math.max(0, Math.round(caloriesRaw))
        : undefined;
    const proteins_g =
      typeof proteinsRaw === "number" && Number.isFinite(proteinsRaw)
        ? Math.max(0, Math.round(proteinsRaw))
        : undefined;
    const carbs_g =
      typeof carbsRaw === "number" && Number.isFinite(carbsRaw)
        ? Math.max(0, Math.round(carbsRaw))
        : undefined;
    const has_vegetables =
      veggiesRaw === true ||
      veggiesRaw === "true" ||
      veggiesRaw === 1 ||
      (typeof veggiesRaw === "string" && /si|sí|yes/i.test(veggiesRaw))
        ? true
        : veggiesRaw === false || veggiesRaw === "false" || veggiesRaw === 0
          ? false
          : undefined;
    const ingredient_names = Array.isArray(ingredientRaw)
      ? ingredientRaw
          .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
          .map((part) => part.trim())
          .slice(0, 24)
      : undefined;

    items.push({
      name: name.slice(0, 120),
      ...(calories !== undefined ? { calories } : {}),
      ...(proteins_g !== undefined ? { proteins_g } : {}),
      ...(carbs_g !== undefined ? { carbs_g } : {}),
      ...(has_vegetables !== undefined ? { has_vegetables } : {}),
      ...(ingredient_names?.length ? { ingredient_names } : {})
    });
    if (items.length >= 12) break;
  }
  return items;
}

/** Resume platos del plan ya en el mismo slot para el análisis acumulado. */
export function planMealsToExistingItems(
  meals: Array<{
    id?: string;
    title: string;
    kcal?: number | null;
    calories?: number | null;
    proteinGrams?: number | null;
    carbsGrams?: number | null;
    hasVegetables?: boolean;
    ingredientNames?: string[];
  }>,
  options?: { excludeId?: string }
): ExistingMealItem[] {
  const excludeId = options?.excludeId?.trim();
  return normalizeExistingMealItems(
    meals
      .filter((meal) => !excludeId || meal.id !== excludeId)
      .map((meal) => ({
        name: meal.title,
        calories: meal.kcal ?? meal.calories ?? undefined,
        proteins_g: meal.proteinGrams ?? undefined,
        carbs_g: meal.carbsGrams ?? undefined,
        has_vegetables: meal.hasVegetables,
        ingredient_names: meal.ingredientNames
      }))
  );
}

export const EXTERNAL_MEAL_TAG = "comida_fuera";
export const SCANNED_MEAL_TAG = "escaneado";
export const HAS_VEGETABLES_TAG = "tiene_vegetales";

export function isExternalMealBadge(value: unknown): value is ExternalMealBadge {
  return value === "comida_fuera" || value === "escaneado";
}

export function resolveExternalMealBadge(tags: unknown): ExternalMealBadge | null {
  const list = normalizeRecipeTags(tags).map((tag) => tag.toLowerCase());
  if (list.includes(SCANNED_MEAL_TAG)) return "escaneado";
  if (list.includes(EXTERNAL_MEAL_TAG) || list.includes("comida fuera")) return "comida_fuera";
  return null;
}

/** True when the recipe is a synthetic out-of-home meal (not a cookable recipe). */
export function isExternalMeal(tags: unknown): boolean {
  return resolveExternalMealBadge(tags) != null;
}

export function externalMealBadgeLabel(badge: ExternalMealBadge): string {
  return badge === "escaneado" ? "📸 Escaneado" : "📍 Comida fuera";
}

export function buildExternalMealTags(estimate: ExternalMealEstimate): string[] {
  const tags = [EXTERNAL_MEAL_TAG];
  if (estimate.badge === "escaneado") tags.push(SCANNED_MEAL_TAG);
  if (estimate.tiene_vegetales) tags.push(HAS_VEGETABLES_TAG);
  return tags;
}

function clampPositive(value: number, fallback: number, max = 5000): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(max, Math.round(value * 10) / 10);
}

export function createExternalMealFoodItem(input: {
  nombre: string;
  cantidad: number;
  unidad?: string;
  calorias: number;
  proteinas_g: number;
  id?: string;
}): ExternalMealFoodItem {
  const cantidad = clampPositive(input.cantidad, 1, 5000);
  const calorias = Math.max(0, Math.round(input.calorias));
  const proteinas_g = Math.max(0, Math.round(input.proteinas_g));
  return {
    id:
      input.id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `food-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
    nombre: input.nombre.trim().slice(0, 80) || "Alimento",
    cantidad,
    unidad: (input.unidad?.trim() || "g").slice(0, 20),
    calorias,
    proteinas_g,
    cantidad_ref: cantidad,
    calorias_ref: calorias,
    proteinas_ref: proteinas_g
  };
}

/** Recalcula macros del ítem al cambiar cantidad (proporcional a la ref de la IA). */
export function scaleExternalMealFoodItem(
  item: ExternalMealFoodItem,
  nextCantidad: number
): ExternalMealFoodItem {
  const cantidad = clampPositive(nextCantidad, item.cantidad_ref || 1, 5000);
  const ref = item.cantidad_ref > 0 ? item.cantidad_ref : cantidad;
  const factor = cantidad / ref;
  return {
    ...item,
    cantidad,
    calorias: Math.max(0, Math.round(item.calorias_ref * factor)),
    proteinas_g: Math.max(0, Math.round(item.proteinas_ref * factor))
  };
}

export function sumExternalMealFoodMacros(items: ExternalMealFoodItem[]): {
  calorias: number;
  proteinas_g: number;
} {
  return items.reduce(
    (acc, item) => ({
      calorias: acc.calorias + Math.max(0, item.calorias),
      proteinas_g: acc.proteinas_g + Math.max(0, item.proteinas_g)
    }),
    { calorias: 0, proteinas_g: 0 }
  );
}

/** Aplica ediciones de alimentos y recalcula totales + balance del plato. */
export function withEditedExternalMealFoods(
  estimate: ExternalMealEstimate,
  alimentos: ExternalMealFoodItem[],
  options?: { existingMealItems?: ExistingMealItem[] }
): ExternalMealEstimate {
  const totals = sumExternalMealFoodMacros(alimentos);
  const next: ExternalMealEstimate = {
    ...estimate,
    alimentos,
    calorias_est: Math.min(2500, Math.max(80, totals.calorias || estimate.calorias_est)),
    proteinas_est_g: Math.min(200, Math.max(0, totals.proteinas_g))
  };
  return {
    ...next,
    ...evaluateExternalMealBalance({
      ...next,
      existingMealItems: options?.existingMealItems
    })
  };
}

export function formatExternalMealFoodLine(item: ExternalMealFoodItem): string {
  const qty =
    Number.isInteger(item.cantidad) || item.cantidad >= 10
      ? String(Math.round(item.cantidad))
      : String(item.cantidad);
  return `${qty} ${item.unidad} de ${item.nombre}`.trim();
}

const VEGGIE_NAME_RE =
  /ensalada|verdura|vegetal|brocoli|brócoli|espinaca|tomate|lechuga|pepino|zanahoria|pimiento|aguacate|edamame|alga|nori|col|kale|rúcula|rucula|champi|seta|cebolla|ajo|calabaza|berenjena|apio|remolacha|sopa/i;

const HEAVY_NAME_RE =
  /fritura|frito|nugget|bacon|beicon|salchicha|pizza|burger|hamburg|donut|helado|nata|crema|mayo|queso fundido|patatas fritas|chips|refresco|cola|cerveza|alcohol/i;

export function summarizeExistingMealItems(items: ExistingMealItem[]): {
  calories: number;
  proteins_g: number;
  has_vegetables: boolean;
  names: string[];
} {
  let calories = 0;
  let proteins_g = 0;
  let has_vegetables = false;
  const names: string[] = [];
  for (const item of items) {
    names.push(item.name);
    if (typeof item.calories === "number") calories += item.calories;
    if (typeof item.proteins_g === "number") proteins_g += item.proteins_g;
    const blob = `${item.name} ${(item.ingredient_names ?? []).join(" ")}`;
    if (item.has_vegetables || VEGGIE_NAME_RE.test(blob)) {
      has_vegetables = true;
    }
  }
  return { calories, proteins_g, has_vegetables, names };
}

/**
 * Evalúa si el menú parece equilibrado y sugiere complementos o avisos.
 * Se usa como fallback de la IA y al editar porciones en el cliente.
 * Si hay `existingMealItems`, evalúa la comida completa (platos previos + actual).
 */
export function evaluateExternalMealBalance(input: {
  calorias_est: number;
  proteinas_est_g: number;
  tiene_vegetales: boolean;
  alimentos?: ExternalMealFoodItem[];
  /** Platos ya registrados en el mismo bloque (desayuno/almuerzo/cena). */
  existingMealItems?: ExistingMealItem[];
}): Pick<ExternalMealEstimate, "balance" | "recomendaciones" | "tiene_vegetales"> {
  const alimentos = input.alimentos ?? [];
  const existing = input.existingMealItems ?? [];
  const existingSummary = summarizeExistingMealItems(existing);
  const names = [
    ...alimentos.map((item) => item.nombre),
    ...existingSummary.names,
    ...(existing.flatMap((item) => item.ingredient_names ?? []))
  ].join(" ");
  const hasVeggies =
    input.tiene_vegetales ||
    existingSummary.has_vegetables ||
    alimentos.some((item) => VEGGIE_NAME_RE.test(item.nombre)) ||
    VEGGIE_NAME_RE.test(names);
  const looksHeavy = HEAVY_NAME_RE.test(names);

  const kcal = input.calorias_est + existingSummary.calories;
  const protein = input.proteinas_est_g + existingSummary.proteins_g;
  const tips: string[] = [];
  const priorNames = existingSummary.names.slice(0, 3).join(", ");

  if (existing.length > 0 && hasVeggies && protein >= 18) {
    tips.push(
      priorNames
        ? `¡Excelente combinación! Este plato complementa muy bien lo que ya registraste (${priorNames}): un menú más completo en proteínas, carbohidratos y fibra.`
        : "¡Excelente combinación! Este plato complementa lo que ya tenías registrado y deja la comida más redonda."
    );
  } else if (!hasVeggies) {
    tips.push(
      existing.length > 0
        ? "Si quieres más frescor en el conjunto de esta comida, puedes sumar verdura o una ensalada cuando te apetezca."
        : "Si quieres más frescor, puedes acompañar con verdura o una ensalada en esta comida o en la siguiente."
    );
  }
  if (protein < 15) {
    tips.push(
      existing.length > 0
        ? "Para más saciedad en el conjunto, prueba añadir huevo, yogur, legumbres o un poco más de proteína."
        : "Para más saciedad, prueba añadir huevo, yogur, legumbres o un poco más de proteína en tu próxima comida."
    );
  }
  if (kcal >= 900) {
    tips.push(
      "¡A disfrutarlo! Si quieres equilibrar el día, reparte el resto con comidas más ligeras o prioriza hidratación."
    );
  } else if (kcal >= 700 && protein < 25) {
    tips.push(
      existing.length > 0
        ? "Gran menú en conjunto. Si buscas más equilibrio, prioriza la parte proteica cuando te apetezca."
        : "Gran plato. Si buscas más equilibrio, prioriza la parte proteica y acompaña con vegetales cuando te apetezca."
    );
  }
  if (looksHeavy && existing.length === 0) {
    tips.push(
      "¡A disfrutarlo! Todos los alimentos tienen su lugar en una vida equilibrada. Si quieres balancear el resto del día, prioriza proteína o hidratación en tu próxima comida."
    );
  }

  let balance: ExternalMealBalance = "equilibrado";
  if (tips.length >= 2 || (looksHeavy && (!hasVeggies || protein < 15))) {
    balance = "poco_saludable";
  } else if (tips.length >= 1 || !hasVeggies || protein < 18 || kcal >= 750) {
    balance = "mejorable";
  }

  // Si el complemento cierra el plato, prioriza mensaje positivo y balance bueno.
  if (existing.length > 0 && hasVeggies && protein >= 18 && kcal < 900) {
    balance = "equilibrado";
  }

  if (balance === "equilibrado" && tips.length === 0) {
    tips.push(
      existing.length > 0
        ? "¡Excelente elección! Entre este plato y lo que ya registraste, la comida queda muy completa. Disfruta."
        : "¡Excelente elección! Un plato con buen equilibrio. Disfruta y mantén ese ritmo cuando te sientas bien."
    );
  }

  return {
    tiene_vegetales: hasVeggies,
    balance,
    recomendaciones: tips.slice(0, 3)
  };
}

/**
 * Evalúa un tentempié (no una comida completa).
 * No exige verdura ni proteína de plato principal.
 */
export function evaluateSnackBalance(input: {
  calorias_est: number;
  proteinas_est_g: number;
  tiene_vegetales?: boolean;
  alimentos?: ExternalMealFoodItem[];
}): Pick<ExternalMealEstimate, "balance" | "recomendaciones" | "tiene_vegetales"> {
  const alimentos = input.alimentos ?? [];
  const names = alimentos.map((item) => item.nombre).join(" ");
  const hasVeggies =
    Boolean(input.tiene_vegetales) ||
    alimentos.some((item) => VEGGIE_NAME_RE.test(item.nombre));
  const looksHeavy = HEAVY_NAME_RE.test(names);
  const sugary = /galleta|cookie|boll|croissant|donut|helado|chuche|caramelo|refresco|cola|batido dulce|muffin|brownie|tarta|pastel/i.test(
    names
  );

  const kcal = input.calorias_est;
  const protein = input.proteinas_est_g;
  const tips: string[] = [];

  if (kcal >= 400) {
    tips.push(
      "¡A disfrutarlo! Si quieres equilibrar el día, elige opciones más ligeras en la próxima comida o prioriza hidratación."
    );
  } else if (kcal >= 280 && protein < 8) {
    tips.push(
      "Si buscas más saciedad, combina con yogur, frutos secos o un poco de queso cuando te apetezca."
    );
  } else if (protein < 5 && kcal >= 120) {
    tips.push(
      "Si te quedas con hambre pronto, un toque de proteína (yogur, huevo, frutos secos) puede ayudar."
    );
  }

  if (looksHeavy || sugary) {
    tips.push(
      "¡A disfrutarlo! Todos los alimentos tienen su lugar. Si quieres balancear el resto del día, prioriza proteína o hidratación en tu próxima comida."
    );
  }

  if (kcal > 0 && kcal < 60 && protein < 3) {
    tips.push(
      "Un bocado ligero y perfecto entre horas. Si necesitas más energía, suma fruta o yogur cuando quieras."
    );
  }

  let balance: ExternalMealBalance = "equilibrado";
  if ((looksHeavy || sugary) && kcal >= 300) {
    balance = "poco_saludable";
  } else if (tips.length >= 2 || kcal >= 350 || looksHeavy || sugary) {
    balance = "mejorable";
  } else if (tips.length >= 1) {
    balance = "mejorable";
  }

  if (balance === "equilibrado") {
    tips.push("¡Excelente snack! Tamaño razonable y encaja muy bien entre comidas.");
  }

  return {
    tiene_vegetales: hasVeggies,
    balance,
    recomendaciones: tips.slice(0, 3)
  };
}

/** Combina consejo de la IA con evaluación local (prioridad a la IA si trae tips). */
export function applyExternalMealAdvice(
  estimate: ExternalMealEstimate,
  options?: { preferAi?: boolean; existingMealItems?: ExistingMealItem[] }
): ExternalMealEstimate {
  const local = evaluateExternalMealBalance({
    ...estimate,
    existingMealItems: options?.existingMealItems
  });
  const aiTips = (estimate.recomendaciones ?? [])
    .map((tip) => tip.trim())
    .filter((tip) => tip.length >= 8)
    .slice(0, 3);
  const preferAi = options?.preferAi !== false && aiTips.length > 0;
  const aiBalance = estimate.balance;

  return {
    ...estimate,
    tiene_vegetales: estimate.tiene_vegetales || local.tiene_vegetales,
    balance: preferAi && aiBalance ? aiBalance : local.balance,
    recomendaciones: preferAi ? aiTips : local.recomendaciones,
    recommendation_title: estimate.recommendation_title
  };
}

/** Igual que applyExternalMealAdvice, pero con criterios de tentempié. */
export function applySnackAdvice(
  estimate: ExternalMealEstimate,
  options?: { preferAi?: boolean }
): ExternalMealEstimate {
  const local = evaluateSnackBalance(estimate);
  const mealCentricRe =
    /ensalada|plato completo|falta verdura|acompaña.*vegetal|men[uú] equilibrado|comida principal|equilibrar el plato/i;
  const aiTips = (estimate.recomendaciones ?? [])
    .map((tip) => tip.trim())
    .filter((tip) => tip.length >= 8 && !mealCentricRe.test(tip))
    .slice(0, 3);
  const preferAi = options?.preferAi !== false && aiTips.length > 0;
  const aiBalance = estimate.balance;

  return {
    ...estimate,
    tiene_vegetales: estimate.tiene_vegetales || local.tiene_vegetales,
    balance: preferAi && aiBalance ? aiBalance : local.balance,
    recomendaciones: preferAi ? aiTips : local.recomendaciones,
    recommendation_title: estimate.recommendation_title
  };
}

/** Aplica ediciones de alimentos y recalcula totales + consejo de snack. */
export function withEditedSnackFoods(
  estimate: ExternalMealEstimate,
  alimentos: ExternalMealFoodItem[]
): ExternalMealEstimate {
  const totals = sumExternalMealFoodMacros(alimentos);
  const next: ExternalMealEstimate = {
    ...estimate,
    alimentos,
    calorias_est: Math.min(1200, Math.max(20, totals.calorias || estimate.calorias_est)),
    proteinas_est_g: Math.min(80, Math.max(0, totals.proteinas_g))
  };
  return {
    ...next,
    ...evaluateSnackBalance(next)
  };
}

export function formatExternalMealRecommendations(
  estimate: Pick<ExternalMealEstimate, "recomendaciones">
): string {
  return (estimate.recomendaciones ?? [])
    .map((tip) => tip.trim())
    .filter(Boolean)
    .join("\n");
}
