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
};

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
  alimentos: ExternalMealFoodItem[]
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
    ...evaluateExternalMealBalance(next)
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
  /ensalada|verdura|vegetal|brocoli|brócoli|espinaca|tomate|lechuga|pepino|zanahoria|pimiento|aguacate|edamame|alga|nori|col|kale|rúcula|rucula|champi|seta|cebolla|ajo|calabaza|berenjena|apio|remolacha/i;

const HEAVY_NAME_RE =
  /fritura|frito|nugget|bacon|beicon|salchicha|pizza|burger|hamburg|donut|helado|nata|crema|mayo|queso fundido|patatas fritas|chips|refresco|cola|cerveza|alcohol/i;

/**
 * Evalúa si el menú parece equilibrado y sugiere complementos o avisos.
 * Se usa como fallback de la IA y al editar porciones en el cliente.
 */
export function evaluateExternalMealBalance(input: {
  calorias_est: number;
  proteinas_est_g: number;
  tiene_vegetales: boolean;
  alimentos?: ExternalMealFoodItem[];
}): Pick<ExternalMealEstimate, "balance" | "recomendaciones" | "tiene_vegetales"> {
  const alimentos = input.alimentos ?? [];
  const names = alimentos.map((item) => item.nombre).join(" ");
  const hasVeggies =
    input.tiene_vegetales ||
    alimentos.some((item) => VEGGIE_NAME_RE.test(item.nombre));
  const looksHeavy = HEAVY_NAME_RE.test(names);

  const kcal = input.calorias_est;
  const protein = input.proteinas_est_g;
  const tips: string[] = [];

  if (!hasVeggies) {
    tips.push(
      "Le falta verdura: añade una ensalada, crudités o un acompañamiento de vegetales."
    );
  }
  if (protein < 15) {
    tips.push(
      "La proteína es baja: complementa con huevo, yogur griego, legumbres, tofu o un poco más de carne/pescado."
    );
  }
  if (kcal >= 900) {
    tips.push(
      "Es una ración muy calórica: reduce un poco la porción o reparte el resto en otra comida del día."
    );
  } else if (kcal >= 700 && protein < 25) {
    tips.push(
      "Hay bastantes calorías y poca proteína: prioriza el alimento proteico y baja un poco el acompañamiento."
    );
  }
  if (looksHeavy) {
    tips.push(
      "Incluye alimentos poco recomendables a diario: disfrútalo como excepción y equilibra el resto del día."
    );
  }

  let balance: ExternalMealBalance = "equilibrado";
  if (tips.length >= 2 || (looksHeavy && (!hasVeggies || protein < 15))) {
    balance = "poco_saludable";
  } else if (tips.length >= 1 || !hasVeggies || protein < 18 || kcal >= 750) {
    balance = "mejorable";
  }

  if (balance === "equilibrado") {
    tips.push(
      "Buen equilibrio de nutrientes. Mantén vegetales y proteína en una porción similar la próxima vez."
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
      "Es un snack bastante calórico: reduce un poco la porción o elige una opción más ligera entre comidas."
    );
  } else if (kcal >= 280 && protein < 8) {
    tips.push(
      "Hay bastantes calorías y poca proteína: combina con yogur, un puñado de frutos secos o un poco de queso para más saciedad."
    );
  } else if (protein < 5 && kcal >= 120) {
    tips.push(
      "Si te quedas con hambre pronto, añade un toque de proteína (yogur, huevo, frutos secos o queso)."
    );
  }

  if (looksHeavy || sugary) {
    tips.push(
      "Es un tentempié indulgente: disfrútalo con moderación y equilibra el resto del día con comidas más ligeras."
    );
  }

  if (kcal > 0 && kcal < 60 && protein < 3) {
    tips.push(
      "Es muy ligero: perfecto si solo quieres un bocado, o súmale fruta/yogur si necesitas más energía."
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
    tips.push(
      "Buen snack entre horas: tamaño razonable y encaja bien como tentempié."
    );
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
  options?: { preferAi?: boolean }
): ExternalMealEstimate {
  const local = evaluateExternalMealBalance(estimate);
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
    recomendaciones: preferAi ? aiTips : local.recomendaciones
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
    recomendaciones: preferAi ? aiTips : local.recomendaciones
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
