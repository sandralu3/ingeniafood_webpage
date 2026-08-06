import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import { getRouteUser } from "@/lib/auth/get-route-user";
import { getUserIsPremium } from "@/lib/auth/user-premium";
import {
  EXTERNAL_MEAL_BADGE,
  applyExternalMealAdvice,
  applySnackAdvice,
  createExternalMealFoodItem,
  evaluateExternalMealBalance,
  isExternalMealBadge,
  normalizeExistingMealItems,
  sumExternalMealFoodMacros,
  type ExistingMealItem,
  type ExternalMealBalance,
  type ExternalMealEstimate,
  type ExternalMealFoodItem
} from "@/lib/plan/external-meal";
import { fetchUserNutritionGoals } from "@/lib/nutrition/nutrition-profile";
import { preferredDietLabel } from "@/lib/nutrition/preferred-diet";
import {
  commaSeparationErrorMessage,
  foodDescriptionRejectionMessage,
  descriptionNeedsCommaSeparation,
  isLikelyFoodOrDrinkDescription
} from "@/lib/plan/food-description-validation";
import {
  countCommaSeparatedFoods,
  descriptionHasExplicitQuantities,
  estimateMealFromOpenText
} from "@/lib/plan/text-meal-estimate";

export const maxDuration = 60;
export const runtime = "nodejs";

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif"
]);

type EstimatePayload = {
  mode?: "photo" | "text";
  /** meal = plato principal / comida fuera; snack = tentempié */
  context?: "meal" | "snack";
  /** Momento del plan: desayuno | almuerzo | cena | snack */
  mealType?: string;
  description?: string;
  imageBase64?: string;
  mimeType?: string;
  locale?: string;
  /** Platos/ingredientes ya registrados en el mismo bloque de comida. */
  existingMealItems?: ExistingMealItem[];
};

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status });
}

function buildModelCandidates(configured?: string): string[] {
  // Alineado con generate-recipe / detect-ingredients (evita 1.5 retirados y 2.0 free-tier agotado).
  const defaults = [
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash"
  ];
  const all = configured?.trim() ? [configured.trim(), ...defaults] : defaults;
  return Array.from(new Set(all.filter((model) => model.length > 0)));
}

function isRetryableModelError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  return (
    message.includes("429") ||
    lower.includes("quota") ||
    lower.includes("too many requests") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("503") ||
    lower.includes("unavailable") ||
    message.includes("404") ||
    lower.includes("is not found") ||
    lower.includes("not supported for generatecontent") ||
    lower.includes("not found for api version") ||
    lower.includes("no longer available")
  );
}

/** Cuota/rate-limit: no tiene sentido seguir probando más modelos free-tier. */
function isQuotaExhaustedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  return (
    message.includes("429") ||
    lower.includes("quota") ||
    lower.includes("too many requests") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    lower.includes("rate-limit") ||
    lower.includes("rate limit")
  );
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Limpia y parsea JSON tolerante (comillas tipográficas, trailing commas, fences). */
function parseLooseJson(rawText: string): unknown | null {
  let text = rawText.trim();
  if (!text) return null;

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    text = fence[1].trim();
  }

  // Comillas tipográficas → ASCII
  text = text
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  const objectMatch = text.match(/\{[\s\S]*\}/);
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  let candidate = objectMatch?.[0] ?? arrayMatch?.[0] ?? text;

  // Quitar comas colgantes antes de } o ]
  candidate = candidate.replace(/,\s*([}\]])/g, "$1").trim();

  try {
    return JSON.parse(candidate);
  } catch {
    // A veces Gemini envuelve el objeto en un array
    if (candidate.startsWith("[")) {
      try {
        const arr = JSON.parse(candidate) as unknown;
        if (Array.isArray(arr) && arr[0] && typeof arr[0] === "object") {
          return arr[0];
        }
      } catch {
        return null;
      }
    }
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeRecommendations(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    if (typeof raw === "string" && raw.trim()) return [raw.trim().slice(0, 180)];
    return [];
  }
  return raw
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((tip) => tip.length >= 8)
    .map((tip) => tip.slice(0, 180))
    .slice(0, 3);
}

function normalizeBalance(raw: unknown): ExternalMealBalance | null {
  if (raw === "equilibrado" || raw === "mejorable" || raw === "poco_saludable") {
    return raw;
  }
  if (typeof raw === "string") {
    const lower = raw.toLowerCase();
    if (lower.includes("equilibr") || lower.includes("balanced") || lower.includes("saludable")) {
      if (lower.includes("poco") || lower.includes("unhealthy") || lower.includes("malo")) {
        return "poco_saludable";
      }
      if (lower.includes("mejor") || lower.includes("improv")) return "mejorable";
      return "equilibrado";
    }
    if (lower.includes("poco") || lower.includes("unhealthy")) return "poco_saludable";
    if (lower.includes("mejor")) return "mejorable";
  }
  return null;
}

function normalizeFoodItems(raw: unknown): ExternalMealFoodItem[] {
  if (!Array.isArray(raw)) return [];

  const items: ExternalMealFoodItem[] = [];
  for (const entry of raw) {
    const obj = asRecord(entry);
    if (!obj) continue;

    const nombre =
      (typeof obj.nombre === "string" && obj.nombre.trim()) ||
      (typeof obj.name === "string" && obj.name.trim()) ||
      (typeof obj.alimento === "string" && obj.alimento.trim()) ||
      "";
    if (!nombre) continue;

    const cantidad = clampNumber(
      obj.cantidad ?? obj.quantity ?? obj.peso ?? obj.amount ?? obj.grams,
      1,
      5000,
      100
    );
    const unidadRaw =
      (typeof obj.unidad === "string" && obj.unidad.trim()) ||
      (typeof obj.unit === "string" && obj.unit.trim()) ||
      "g";
    const calorias = clampNumber(
      obj.calorias ?? obj.calories ?? obj.kcal ?? obj.calorias_est,
      0,
      1500,
      Math.max(20, Math.round(cantidad * 1.2))
    );
    const proteinas = clampNumber(
      obj.proteinas_g ?? obj.proteinas ?? obj.protein_g ?? obj.protein,
      0,
      120,
      0
    );

    items.push(
      createExternalMealFoodItem({
        nombre,
        cantidad,
        unidad: unidadRaw.slice(0, 20),
        calorias,
        proteinas_g: proteinas
      })
    );
  }

  return items.slice(0, 12);
}

function isInvalidFoodPayload(raw: unknown): boolean {
  const obj = asRecord(raw);
  if (!obj) return false;
  if (obj.error === "NOT_FOOD") return true;
  if (obj.is_valid_food === false || obj.is_valid_food === "false") return true;
  return false;
}

const NON_GASTRONOMIC_NAME_RE =
  /promocional|promoci[oó]n|captura\s+de\s+pantalla|screenshot|mockup|publicidad|banner|ingeniafood|app\s+promo|imagen\s+de\s+aplicaci/i;

function isNonGastronomicDishName(name: string): boolean {
  return NON_GASTRONOMIC_NAME_RE.test(name.trim());
}

/** Detecta respuestas donde la IA inventó un "plato" no gastronómico sin marcar is_valid_food=false. */
function looksLikeNonFoodEstimate(raw: unknown): boolean {
  if (isInvalidFoodPayload(raw)) return true;
  const root = asRecord(raw);
  if (!root) return false;
  const obj =
    asRecord(root.estimate) ??
    asRecord(root.resultado) ??
    asRecord(root.data) ??
    root;
  if (isInvalidFoodPayload(obj)) return true;

  const nameCandidates = [
    obj.nombre_plato,
    obj.dish_name,
    obj.nombre,
    obj.title,
    obj.name
  ];
  for (const candidate of nameCandidates) {
    if (typeof candidate === "string" && isNonGastronomicDishName(candidate)) {
      return true;
    }
  }

  const items = obj.alimentos ?? obj.detected_items ?? obj.foods ?? obj.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      const rec = asRecord(item);
      const itemName =
        (typeof rec?.name === "string" && rec.name) ||
        (typeof rec?.nombre === "string" && rec.nombre) ||
        "";
      if (itemName && isNonGastronomicDishName(itemName)) return true;
    }
  }
  return false;
}

function normalizeEstimate(
  raw: unknown,
  fallbackBadge: ExternalMealEstimate["badge"]
): ExternalMealEstimate | null {
  const root = asRecord(raw);
  if (!root) return null;
  if (isInvalidFoodPayload(root)) return null;

  // Algunos modelos anidan el resultado
  const obj =
    asRecord(root.estimate) ??
    asRecord(root.resultado) ??
    asRecord(root.data) ??
    root;

  if (isInvalidFoodPayload(obj)) return null;

  const nombre =
    (typeof obj.nombre_plato === "string" && obj.nombre_plato.trim()) ||
    (typeof obj.dish_name === "string" && obj.dish_name.trim()) ||
    (typeof obj.nombre === "string" && obj.nombre.trim()) ||
    (typeof obj.title === "string" && obj.title.trim()) ||
    (typeof obj.name === "string" && obj.name.trim()) ||
    "";
  if (!nombre || isNonGastronomicDishName(nombre)) return null;

  const badgeRaw = obj.badge;
  const badge = isExternalMealBadge(badgeRaw) ? badgeRaw : fallbackBadge;

  const veggiesRaw = obj.tiene_vegetales ?? obj.has_vegetables ?? obj.vegetables;
  const tieneVegetales =
    veggiesRaw === true ||
    veggiesRaw === "true" ||
    veggiesRaw === 1 ||
    (typeof veggiesRaw === "string" && /si|sí|yes/i.test(veggiesRaw));

  const alimentos = normalizeFoodItems(
    obj.alimentos ??
      obj.detected_items ??
      obj.foods ??
      obj.items ??
      obj.ingredientes ??
      obj.ingredients
  );

  if (alimentos.some((item) => isNonGastronomicDishName(item.nombre))) {
    return null;
  }

  let calorias = clampNumber(
    obj.calorias_est ??
      obj.total_calories ??
      obj.calorias ??
      obj.calories ??
      obj.kcal,
    80,
    2500,
    450
  );
  let proteinas = clampNumber(
    obj.proteinas_est_g ??
      obj.total_proteins_g ??
      obj.proteinas_g ??
      obj.proteinas ??
      obj.protein_g ??
      obj.protein,
    0,
    200,
    18
  );

  if (alimentos.length > 0) {
    const totals = sumExternalMealFoodMacros(alimentos);
    if (totals.calorias > 0) calorias = Math.min(2500, Math.max(80, totals.calorias));
    proteinas = Math.min(200, Math.max(0, totals.proteinas_g));
  }

  const recommendationTitle =
    (typeof obj.recommendation_title === "string" && obj.recommendation_title.trim()) ||
    (typeof obj.titulo_recomendacion === "string" && obj.titulo_recomendacion.trim()) ||
    undefined;
  const recommendationMessage =
    (typeof obj.recommendation_message === "string" && obj.recommendation_message.trim()) ||
    (typeof obj.mensaje_recomendacion === "string" && obj.mensaje_recomendacion.trim()) ||
    undefined;

  const recomendaciones = normalizeRecommendations(
    obj.recomendaciones ??
      obj.recommendations ??
      obj.tips ??
      obj.consejos ??
      (recommendationMessage ? [recommendationMessage] : [])
  );
  const balance =
    normalizeBalance(obj.balance ?? obj.equilibrio ?? obj.health_balance) ?? undefined;

  const base: ExternalMealEstimate = {
    nombre_plato: nombre.slice(0, 120),
    calorias_est: calorias,
    proteinas_est_g: proteinas,
    tiene_vegetales: tieneVegetales,
    badge,
    alimentos,
    balance: balance ?? "mejorable",
    recomendaciones,
    recommendation_title: recommendationTitle?.slice(0, 80)
  };

  return base;
}

/** Último recurso si la IA falla: parsea cantidades (p. ej. 200 g pechuga) y densidades. */
function fallbackTextEstimate(description: string): ExternalMealEstimate {
  const parsed = estimateMealFromOpenText(description);
  if (parsed) return parsed;

  const lower = description.toLowerCase();
  const looksHeavy =
    /pizza|burger|hamburg|pasta|risotto|tacos|burrito|fritura|frito|helado|rollo de canela|croissant|donut|pastel/.test(
      lower
    );
  const looksLight =
    /ensalada|sopa|yogurt|yogur|fruta|infusi[oó]n|t[eé]\b|caf[eé]\b|matcha/.test(lower);
  const hasVeggies = /ensalada|verdura|vegetal|brocoli|brócoli|espinaca|tomate|lechuga/.test(
    lower
  );

  let calorias = 420;
  let proteinas = 14;
  if (looksHeavy) {
    calorias = 620;
    proteinas = 18;
  } else if (looksLight) {
    calorias = 280;
    proteinas = 8;
  }
  if (/matcha|latte|caf[eé]|t[eé]/.test(lower) && /rollo|canela|croissant|pastel|galleta/.test(lower)) {
    calorias = 480;
    proteinas = 10;
  }

  const shortName =
    description.length > 70 ? `${description.slice(0, 67).trim()}…` : description.trim();

  const base: ExternalMealEstimate = {
    nombre_plato: shortName || "Comida fuera",
    calorias_est: calorias,
    proteinas_est_g: proteinas,
    tiene_vegetales: hasVeggies,
    badge: EXTERNAL_MEAL_BADGE.comida_fuera,
    alimentos: [
      createExternalMealFoodItem({
        nombre: shortName || "Comida fuera",
        cantidad: 1,
        unidad: "porción",
        calorias,
        proteinas_g: proteinas
      })
    ],
    balance: "mejorable",
    recomendaciones: []
  };

  return {
    ...base,
    ...evaluateExternalMealBalance(base)
  };
}

/**
 * Si el usuario escribió gramos/ml o varios alimentos por coma y la IA
 * devolvió un desglose pobre, preferimos el parseo local.
 */
function preferParsedTextWhenAiUndershoots(
  description: string,
  aiEstimate: ExternalMealEstimate
): ExternalMealEstimate {
  const parsed = estimateMealFromOpenText(description);
  if (!parsed || parsed.alimentos.length === 0) return aiEstimate;

  const commaFoods = countCommaSeparatedFoods(description);
  // "te matcha, café" → la IA a veces solo devuelve 1 ítem
  if (commaFoods >= 2 && parsed.alimentos.length > aiEstimate.alimentos.length) {
    return {
      ...parsed,
      badge: aiEstimate.badge,
      nombre_plato: description.trim().slice(0, 120) || parsed.nombre_plato,
      recomendaciones:
        aiEstimate.recomendaciones.length > 0
          ? aiEstimate.recomendaciones
          : parsed.recomendaciones
    };
  }

  if (!descriptionHasExplicitQuantities(description)) return aiEstimate;

  const aiLooksGeneric =
    aiEstimate.alimentos.length <= 1 &&
    aiEstimate.alimentos.every(
      (item) =>
        item.unidad === "porción" ||
        (item.cantidad <= 2 && !/^(g|ml)$/i.test(item.unidad))
    );

  const proteinGap = parsed.proteinas_est_g - aiEstimate.proteinas_est_g;
  const kcalGap = parsed.calorias_est - aiEstimate.calorias_est;

  if (aiLooksGeneric && (proteinGap >= 10 || kcalGap >= 120)) {
    return {
      ...parsed,
      badge: aiEstimate.badge,
      recomendaciones:
        aiEstimate.recomendaciones.length > 0
          ? aiEstimate.recomendaciones
          : parsed.recomendaciones
    };
  }

  if (proteinGap >= 15 && parsed.proteinas_est_g >= aiEstimate.proteinas_est_g * 1.6) {
    return {
      ...parsed,
      badge: aiEstimate.badge,
      recomendaciones:
        aiEstimate.recomendaciones.length > 0
          ? aiEstimate.recomendaciones
          : parsed.recomendaciones
    };
  }

  return aiEstimate;
}

function resolveMealMomentLabel(
  context: "meal" | "snack",
  mealType?: string
): string {
  if (context === "snack") return "Snack";
  const key = (mealType ?? "").trim().toLowerCase();
  if (key === "desayuno" || key === "breakfast") return "Desayuno";
  if (key === "cena" || key === "dinner") return "Cena";
  if (key === "almuerzo" || key === "comida" || key === "lunch") return "Almuerzo";
  if (key === "snack" || key === "tentempie" || key === "tentempié") return "Snack";
  return "Almuerzo";
}

function buildPrompt(
  mode: "photo" | "text",
  description: string,
  locale: string | undefined,
  context: "meal" | "snack",
  options: {
    mealMoment: string;
    userDietType: string;
    existingMealItems: ExistingMealItem[];
  }
): string {
  const isSnack = context === "snack";
  const { mealMoment, userDietType, existingMealItems } = options;
  const lang =
    locale === "en"
      ? "Write dish_name, detected_items names, recommendation_title and recommendation_message in clear English."
      : "Escribe dish_name, nombres de detected_items, recommendation_title y recommendation_message en español natural.";

  const validationBlock =
    "VALIDACIÓN DE COMIDA REAL (obligatoria, PRIMERO):\n" +
    "Analiza si la imagen o el texto corresponde a un plato de comida real, bebida o alimento comestible.\n" +
    "Si es captura de pantalla, texto promocional, mockup de app, publicidad, persona, objeto no comestible o imagen no gastronómica " +
    '(ej. "Imagen promocional de aplicación", banner IngeniaFood, UI de otra app):\n' +
    'responde SOLO {"is_valid_food":false,"error":"NOT_FOOD","error_message":"No hemos podido detectar alimentos reales en esta imagen. Por favor, sube una foto de tu plato o escribe lo que has comido.","dish_name":null,"total_calories":null,"total_proteins_g":null,"detected_items":[],"recommendation_title":null,"recommendation_message":null}.\n' +
    "PROHIBIDO inventar calorías, alimentos o nombres promocionales cuando is_valid_food es false.\n\n";

  const source =
    mode === "photo"
      ? isSnack
        ? "Analiza la foto de un SNACK / TENTEMPIÉ real (comida o bebida). Identifica cada alimento visible."
        : "Analiza la foto de un plato ya servido (restaurante, evento o casa). Identifica el plato y cada alimento visible."
      : isSnack
        ? `El usuario describe un snack / tentempié:\n"""${description.replace(/"/g, "'")}"""\n` +
          "Si el texto no describe comida/bebida real, is_valid_food=false. " +
          "Si usa comas, cada fragmento es un alimento distinto. Respeta cantidades explícitas (g, ml, unidades)."
        : `El usuario describe una comida consumida:\n"""${description.replace(/"/g, "'")}"""\n` +
          "Si el texto no describe comida/bebida real, is_valid_food=false. " +
          "Si usa comas, cada fragmento es un alimento distinto. Respeta cantidades explícitas (g, ml, unidades).";

  const contextBlock =
    `CONTEXTO DEL REGISTRO:\n` +
    `- meal_type / momento: ${mealMoment} (Desayuno, Almuerzo, Cena o Snack).\n` +
    `- userDietType (preferencia del usuario): ${userDietType}.\n` +
    `Evalúa el plato en función de ese momento (un snack no exige el mismo balance que un almuerzo completo) y de su estilo de alimentación.\n` +
    `Devuelve meal_type_detected coherente con el momento (${mealMoment}) salvo evidencia clara de otro tipo.\n\n`;

  const existingBlock =
    existingMealItems.length > 0
      ? "EVALUACIÓN ACUMULADA Y CONTEXTUAL (obligatoria):\n" +
        "El usuario YA registró estos platos/alimentos en la MISMA comida (mismo bloque):\n" +
        `${JSON.stringify(existingMealItems)}\n` +
        "El alimento/plato que analizas AHORA es un COMPLEMENTO o SEGUNDO PLATO de esa comida.\n" +
        "NO des recomendaciones aisladas del nuevo plato si los nutrientes faltantes ya los aportó el primer plato " +
        "(ej. si ya hay sopa vegetal / verduras, NO digas que al pollo con arroz le faltan verduras).\n" +
        "Evalúa la comida completa en su conjunto (platos previos + este complemento).\n" +
        "dish_name, total_calories, total_proteins_g y detected_items deben describir SOLO el elemento actual (el nuevo).\n" +
        "recommendation_title y recommendation_message deben basarse en la SUMA / conjunto de toda la comida.\n" +
        "Si el complemento completa nutricionalmente lo anterior (p. ej. verduras/fibra antes + proteína/carbohidratos ahora), " +
        "felicita por armar un plato redondo.\n" +
        'Ejemplo: "¡Excelente combinación! Con este plato de arroz y pollo complementas perfectamente la sopa vegetal que registraste antes, obteniendo un almuerzo muy completo en proteínas, carbohidratos y fibra."\n\n'
      : "";

  const empathyBlock =
    "RECOMENDACIONES EMPÁTICAS Y SIN CULPA (obligatorio):\n" +
    'PROHIBIDO usar tono punitivo o juicios: "Se puede mejorar", "Poco recomendable", "Prohibido", "Debes corregir", "Poco saludable", "Malo", "Evita esto".\n' +
    "Enfoque de alimentación consciente y disfrute:\n" +
    "- Si hay procesados/azúcares: valida el placer y sugiere equilibrio amable sin culpa.\n" +
    '  Ejemplo: "¡A disfrutarlo! Recuerda que todos los alimentos tienen su lugar en una vida equilibrada. Si quieres balancear el resto del día, puedes priorizar proteína o hidratación en tu próxima comida."\n' +
    `- Si está alineado a su dieta/momento: "¡Excelente elección para tu ${mealMoment.toLowerCase()}! Te aporta la energía perfecta alineada con tu estilo de alimentación."\n` +
    "recommendation_title: frase corta positiva (máx. ~8 palabras).\n" +
    "recommendation_message: 1-2 frases cálidas y prácticas" +
    (existingMealItems.length > 0
      ? " sobre el CONJUNTO de la comida (previos + actual).\n\n"
      : ".\n\n");

  const foodRange = isSnack
    ? "Incluye entre 1 y 5 alimentos en detected_items cuando sea posible.\n"
    : "Incluye entre 2 y 8 alimentos en detected_items cuando sea posible.\n";

  const badge = mode === "photo" ? "escaneado" : "comida_fuera";

  return (
    validationBlock +
    `${source}\n${lang}\n\n` +
    contextBlock +
    existingBlock +
    empathyBlock +
    "Lista cada alimento con cantidad estimada (g/ml/unidades) y macros para ESA cantidad. " +
    "Los totales del elemento actual deben coincidir con la suma de detected_items.\n" +
    "Indica tiene_vegetales si hay verdura significativa EN EL ELEMENTO ACTUAL " +
    "(si los vegetales solo están en platos previos, tiene_vegetables puede ser false; la recomendación sí debe considerar el conjunto).\n" +
    (isSnack
      ? "Esto es un TENTEMPIÉ: no exijas verdura ni equilibrio de plato principal.\n"
      : existingMealItems.length > 0
        ? "Evalúa el menú COMPLETO con tono positivo; no critiques el complemento por lo que ya aportaron los platos previos.\n"
        : "Evalúa el menú con tono positivo; si falta algo, sugiere opciones opcionales sin juzgar.\n") +
    foodRange +
    "Responde SOLO un objeto JSON válido (sin markdown) con esta forma:\n" +
    `{"is_valid_food":true,"meal_type_detected":"${mealMoment}","dish_name":"string","total_calories":510,"total_proteins_g":21,"tiene_vegetales":true,"badge":"${badge}","detected_items":[{"name":"Pan integral","quantity":2,"unit":"rebanada","calorias":160,"proteinas_g":6}],"balance":"equilibrado","recommendation_title":"¡Gran combinación de sabores!","recommendation_message":"Un plato completo y variado. Disfruta del contraste entre lo salado y lo dulce.","error_message":null}\n` +
    'balance (solo interno): "equilibrado" | "mejorable" | "poco_saludable" — sin usar esas palabras en recommendation_title/message.\n' +
    'unit preferida: g, ml, unidad, rebanada, cda, cdta, taza o porción.\n' +
    "También aceptamos claves legacy: nombre_plato, calorias_est, proteinas_est_g, alimentos, recomendaciones."
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient();
    if (!supabase) {
      return jsonResponse({ error: "No se pudo inicializar la sesión." }, 500);
    }

    const auth = await getRouteUser(supabase);
    if (auth.status === "unavailable") {
      return jsonResponse({ error: auth.message, code: "AUTH_UNAVAILABLE" }, 503);
    }
    if (auth.status !== "ok") {
      return jsonResponse({ error: "No autenticado.", code: "UNAUTHORIZED" }, 401);
    }

    const { isPremium, error: premiumError } = await getUserIsPremium(
      supabase,
      auth.user.id,
      auth.user.email
    );
    if (premiumError) {
      return jsonResponse({ error: premiumError, code: "PREMIUM_CHECK_FAILED" }, 503);
    }
    if (!isPremium) {
      return jsonResponse(
        {
          error: "Registrar comida fuera requiere Premium.",
          code: "PREMIUM_REQUIRED"
        },
        403
      );
    }

    let body: EstimatePayload;
    try {
      body = (await request.json()) as EstimatePayload;
    } catch {
      return jsonResponse(
        {
          error:
            "La foto es demasiado grande o el envío se cortó. Prueba otra imagen o vuelve a intentarlo.",
          code: "BODY_TOO_LARGE"
        },
        413
      );
    }
    const mode = body.mode === "photo" ? "photo" : "text";
    const context = body.context === "snack" ? "snack" : "meal";
    const mealMoment = resolveMealMomentLabel(
      context,
      typeof body.mealType === "string" ? body.mealType : undefined
    );
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const imageBase64 =
      typeof body.imageBase64 === "string"
        ? body.imageBase64.replace(/^data:[^;]+;base64,/, "")
        : "";
    const mimeType =
      typeof body.mimeType === "string" && body.mimeType.trim()
        ? body.mimeType.trim().toLowerCase()
        : "image/jpeg";

    const nutritionGoals = await fetchUserNutritionGoals(auth.user.id, supabase);
    const userDietType = preferredDietLabel(nutritionGoals.preferredDiet);
    const existingMealItems = normalizeExistingMealItems(body.existingMealItems);

    if (mode === "text" && description.length < 3) {
      return jsonResponse(
        {
          error:
            context === "snack"
              ? "Escribe al menos una descripción corta del snack."
              : "Escribe al menos una descripción corta de la comida."
        },
        400
      );
    }
    if (mode === "text" && !isLikelyFoodOrDrinkDescription(description)) {
      return jsonResponse(
        {
          error: "NOT_FOOD",
          code: "NOT_FOOD",
          message: foodDescriptionRejectionMessage(context)
        },
        422
      );
    }
    if (mode === "text" && descriptionNeedsCommaSeparation(description)) {
      return jsonResponse(
        {
          error: "COMMA_SEPARATION_REQUIRED",
          code: "COMMA_SEPARATION_REQUIRED",
          message: commaSeparationErrorMessage()
        },
        400
      );
    }
    if (mode === "photo") {
      if (!imageBase64) {
        return jsonResponse(
          {
            error: context === "snack" ? "Falta la imagen del snack." : "Falta la imagen del plato."
          },
          400
        );
      }
      if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
        return jsonResponse({ error: "Formato de imagen no soportado." }, 400);
      }
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
    if (!apiKey) {
      return jsonResponse(
        { error: "Falta GOOGLE_GENERATIVE_AI_API_KEY en variables de entorno." },
        500
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = buildPrompt(mode, description, body.locale, context, {
      mealMoment,
      userDietType,
      existingMealItems
    });
    const parts: Part[] =
      mode === "photo"
        ? [{ text: prompt }, { inlineData: { data: imageBase64, mimeType } }]
        : [{ text: prompt }];

    const configuredModel =
      process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || process.env.GEMINI_MODEL?.trim();
    const models = buildModelCandidates(configuredModel);
    let lastError: unknown = null;
    let lastRawText = "";
    let estimate: ExternalMealEstimate | null = null;

    const fallbackBadge =
      mode === "photo" ? EXTERNAL_MEAL_BADGE.escaneado : EXTERNAL_MEAL_BADGE.comida_fuera;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        });
        const result = await model.generateContent({
          contents: [{ role: "user", parts }]
        });
        const rawText = result.response.text()?.trim() ?? "";
        if (!rawText) {
          lastError = new Error(`Modelo ${modelName} devolvió texto vacío`);
          continue;
        }
        lastRawText = rawText;

        const parsed = parseLooseJson(rawText);
        if (parsed && typeof parsed === "object" && looksLikeNonFoodEstimate(parsed)) {
          const record = parsed as {
            error_message?: string;
            message?: string;
            mensaje?: string;
          };
          const friendly =
            (typeof record.error_message === "string" && record.error_message.trim()) ||
            (typeof record.message === "string" && record.message.trim()) ||
            (typeof record.mensaje === "string" && record.mensaje.trim()) ||
            foodDescriptionRejectionMessage(context);
          return jsonResponse(
            {
              error: "NOT_FOOD",
              code: "NOT_FOOD",
              message: friendly,
              is_valid_food: false
            },
            422
          );
        }

        const normalized = normalizeEstimate(parsed, fallbackBadge);
        if (normalized) {
          estimate = normalized;
          break;
        }

        lastError = new Error(`No se pudo normalizar respuesta de ${modelName}`);
        console.warn(
          "[estimate-external-meal] parse fail",
          modelName,
          rawText.slice(0, 400)
        );
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error ?? "");
        // Loguear como string: pasar el Error completo hace que Next.js lo trate
        // como fallo de ruta y puede remountar el cliente (cierra el modal).
        console.warn(`[estimate-external-meal] modelo ${modelName}: ${message.slice(0, 280)}`);
        // Cuota agotada: no tiene sentido seguir quemando modelos del mismo free-tier.
        if (isQuotaExhaustedError(error)) {
          break;
        }
        if (isRetryableModelError(error)) continue;
        continue;
      }
    }

    // Fallback solo si el texto ya pasó validación de alimento y la IA falló técnicamente.
    if (
      !estimate &&
      mode === "text" &&
      description.length >= 3 &&
      isLikelyFoodOrDrinkDescription(description)
    ) {
      const fallbackReason =
        lastError instanceof Error ? lastError.message : String(lastError ?? "unknown");
      console.warn(
        `[estimate-external-meal] usando fallback texto. reason: ${fallbackReason.slice(0, 280)}`
      );
      estimate = fallbackTextEstimate(description);
    }

    if (!estimate) {
      console.error("[estimate-external-meal] empty/fail:", lastError, lastRawText.slice(0, 400));
      const quota = isQuotaExhaustedError(lastError);
      return jsonResponse(
        {
          error: quota
            ? "La IA está temporalmente sin cuota. Espera un minuto e inténtalo de nuevo, o registra por texto."
            : context === "snack"
              ? "No pudimos estimar el snack. Inténtalo de nuevo."
              : "No pudimos estimar la comida. Inténtalo de nuevo.",
          code: quota ? "QUOTA_EXCEEDED" : "ESTIMATE_FAILED"
        },
        quota || isRetryableModelError(lastError) ? 429 : 502
      );
    }

    estimate.badge =
      mode === "photo" ? EXTERNAL_MEAL_BADGE.escaneado : EXTERNAL_MEAL_BADGE.comida_fuera;

    // Si la IA no devolvió desglose, crear un ítem editable con el total.
    if (!estimate.alimentos.length) {
      estimate.alimentos = [
        createExternalMealFoodItem({
          nombre: estimate.nombre_plato,
          cantidad: 1,
          unidad: "porción",
          calorias: estimate.calorias_est,
          proteinas_g: estimate.proteinas_est_g
        })
      ];
    }

    if (mode === "text") {
      estimate = preferParsedTextWhenAiUndershoots(description, estimate);
    }

    estimate = (context === "snack" ? applySnackAdvice : applyExternalMealAdvice)(estimate, {
      preferAi: estimate.recomendaciones.length > 0,
      ...(context === "meal" ? { existingMealItems } : {})
    });

    return jsonResponse({ estimate });
  } catch (error) {
    console.error("[estimate-external-meal]", error);
    return jsonResponse({ error: "Error inesperado al estimar la comida." }, 500);
  }
}
