import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import { getRouteUser } from "@/lib/auth/get-route-user";
import { getUserIsPremium } from "@/lib/auth/user-premium";
import {
  EXTERNAL_MEAL_BADGE,
  applyExternalMealAdvice,
  createExternalMealFoodItem,
  evaluateExternalMealBalance,
  isExternalMealBadge,
  sumExternalMealFoodMacros,
  type ExternalMealBalance,
  type ExternalMealEstimate,
  type ExternalMealFoodItem
} from "@/lib/plan/external-meal";

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
  description?: string;
  imageBase64?: string;
  mimeType?: string;
  locale?: string;
};

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status });
}

function buildModelCandidates(configured?: string): string[] {
  const defaults = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-1.5-flash"
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
    lower.includes("not found for api version")
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

function normalizeEstimate(
  raw: unknown,
  fallbackBadge: ExternalMealEstimate["badge"]
): ExternalMealEstimate | null {
  const root = asRecord(raw);
  if (!root) return null;
  if (root.error === "NOT_FOOD") return null;

  // Algunos modelos anidan el resultado
  const obj =
    asRecord(root.estimate) ??
    asRecord(root.resultado) ??
    asRecord(root.data) ??
    root;

  if (obj.error === "NOT_FOOD") return null;

  const nombre =
    (typeof obj.nombre_plato === "string" && obj.nombre_plato.trim()) ||
    (typeof obj.nombre === "string" && obj.nombre.trim()) ||
    (typeof obj.dish_name === "string" && obj.dish_name.trim()) ||
    (typeof obj.title === "string" && obj.title.trim()) ||
    (typeof obj.name === "string" && obj.name.trim()) ||
    "";
  if (!nombre) return null;

  const badgeRaw = obj.badge;
  const badge = isExternalMealBadge(badgeRaw) ? badgeRaw : fallbackBadge;

  const veggiesRaw = obj.tiene_vegetales ?? obj.has_vegetables ?? obj.vegetables;
  const tieneVegetales =
    veggiesRaw === true ||
    veggiesRaw === "true" ||
    veggiesRaw === 1 ||
    (typeof veggiesRaw === "string" && /si|sí|yes/i.test(veggiesRaw));

  const alimentos = normalizeFoodItems(
    obj.alimentos ?? obj.foods ?? obj.items ?? obj.ingredientes ?? obj.ingredients
  );

  let calorias = clampNumber(
    obj.calorias_est ?? obj.calorias ?? obj.calories ?? obj.kcal,
    80,
    2500,
    450
  );
  let proteinas = clampNumber(
    obj.proteinas_est_g ?? obj.proteinas_g ?? obj.proteinas ?? obj.protein_g ?? obj.protein,
    0,
    200,
    18
  );

  if (alimentos.length > 0) {
    const totals = sumExternalMealFoodMacros(alimentos);
    if (totals.calorias > 0) calorias = Math.min(2500, Math.max(80, totals.calorias));
    proteinas = Math.min(200, Math.max(0, totals.proteinas_g));
  }

  const recomendaciones = normalizeRecommendations(
    obj.recomendaciones ?? obj.recommendations ?? obj.tips ?? obj.consejos
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
    recomendaciones
  };

  return applyExternalMealAdvice(base, { preferAi: recomendaciones.length > 0 });
}

/** Último recurso si la IA falla: no bloquea el registro por texto. */
function fallbackTextEstimate(description: string): ExternalMealEstimate {
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
  // Bebida + dulce típico
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

function buildPrompt(mode: "photo" | "text", description: string, locale?: string): string {
  const lang =
    locale === "en"
      ? "Respond with dish, foods and recommendations in English."
      : "Responde con el nombre del plato, alimentos y recomendaciones en español.";

  const source =
    mode === "photo"
      ? "Analiza la foto de un plato ya servido (restaurante, evento o casa). Identifica el plato y cada alimento visible."
      : `El usuario describe una comida consumida fuera:\n"""${description.replace(/"/g, "'")}"""\nEstima el plato y desglosa los alimentos típicos. Incluye bebidas, postres y snacks: SÍ son comida.`;

  return (
    `${source} ${lang}\n` +
    "Lista cada alimento del plato con cantidad estimada (peso en g/ml o unidades) y sus calorías/proteínas para ESA cantidad.\n" +
    "Los totales del plato deben coincidir con la suma de los alimentos.\n" +
    "Indica si incluye vegetales/verdura significativa.\n" +
    "Evalúa si el menú está equilibrado. Si falta verdura, proteína o es muy calórico/poco saludable, dilo con claridad y sugiere 1-3 recomendaciones prácticas (p. ej. añadir ensalada, yogur, reducir porción).\n" +
    "Responde SOLO un objeto JSON válido (sin markdown, sin texto extra) con exactamente estas claves:\n" +
    '{"nombre_plato":"string","calorias_est":350,"proteinas_est_g":12,"tiene_vegetales":false,"badge":"comida_fuera","alimentos":[{"nombre":"Pollo","cantidad":150,"unidad":"g","calorias":180,"proteinas_g":35}],"balance":"mejorable","recomendaciones":["Añade una ensalada para equilibrar el plato."]}\n' +
    `badge debe ser "${mode === "photo" ? "escaneado" : "comida_fuera"}".\n` +
    'balance debe ser "equilibrado", "mejorable" o "poco_saludable".\n' +
    'unidad preferida: g, ml, unidad, rebanada, cda, cdta, taza o porción.\n' +
    "Incluye entre 2 y 8 alimentos cuando sea posible.\n" +
    'Si la imagen NO es comida, responde {"error":"NOT_FOOD"}. Nunca uses NOT_FOOD para descripciones de texto con alimentos o bebidas.'
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
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const imageBase64 =
      typeof body.imageBase64 === "string"
        ? body.imageBase64.replace(/^data:[^;]+;base64,/, "")
        : "";
    const mimeType =
      typeof body.mimeType === "string" && body.mimeType.trim()
        ? body.mimeType.trim().toLowerCase()
        : "image/jpeg";

    if (mode === "text" && description.length < 3) {
      return jsonResponse({ error: "Escribe al menos una descripción corta de la comida." }, 400);
    }
    if (mode === "photo") {
      if (!imageBase64) {
        return jsonResponse({ error: "Falta la imagen del plato." }, 400);
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
    const prompt = buildPrompt(mode, description, body.locale);
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
        if (
          parsed &&
          typeof parsed === "object" &&
          (parsed as { error?: string }).error === "NOT_FOOD"
        ) {
          if (mode === "photo") {
            return jsonResponse(
              {
                error: "NOT_FOOD",
                message: "No detectamos un plato de comida en la imagen."
              },
              422
            );
          }
          // Texto: no aceptar NOT_FOOD; probar otro modelo / fallback
          lastError = new Error("Modelo marcó NOT_FOOD en modo texto");
          continue;
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
        console.warn(`[estimate-external-meal] modelo ${modelName}:`, error);
        if (isRetryableModelError(error)) continue;
        // Otros errores: aún así probar siguiente modelo
        continue;
      }
    }

    if (!estimate && mode === "text" && description.length >= 3) {
      console.warn(
        "[estimate-external-meal] usando fallback texto. lastError:",
        lastError,
        "raw:",
        lastRawText.slice(0, 300)
      );
      estimate = fallbackTextEstimate(description);
    }

    if (!estimate) {
      console.error("[estimate-external-meal] empty/fail:", lastError, lastRawText.slice(0, 400));
      return jsonResponse(
        { error: "No pudimos estimar la comida. Inténtalo de nuevo." },
        isRetryableModelError(lastError) ? 429 : 502
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

    estimate = applyExternalMealAdvice(estimate, {
      preferAi: estimate.recomendaciones.length > 0
    });

    return jsonResponse({ estimate });
  } catch (error) {
    console.error("[estimate-external-meal]", error);
    return jsonResponse({ error: "Error inesperado al estimar la comida." }, 500);
  }
}
