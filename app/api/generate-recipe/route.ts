import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";
import { normalizeRecipeMacros, type RecipeMacros } from "@/lib/recipes/recipe-macros";
import { normalizeLooseGeminiIngredients } from "@/lib/recipes/structured-ingredients";
import { consumeGeneration, getGenerationsLeft } from "@/lib/generations/quota";
import { getUserIsPremium } from "@/lib/auth/user-premium";
import { consumePremiumTrialUse } from "@/lib/auth/premium-trial";
import { usedPremiumRecipeFilters } from "@/lib/auth/premium-access";
import {
  buildIngredientQuantityPromptClause,
  buildRecipeFiltersPromptClause,
  MACRO_ESTIMATION_PROMPT_CLAUSE,
  resolveRecipeFilters
} from "@/lib/recipes/premium-recipe-filters";
import {
  buildMealTypeCompatibilityPromptClause,
  buildMealTypePantryExpansionClause
} from "@/lib/recipes/meal-type-ingredient-compatibility";
import {
  buildRecipeLanguagePromptClause,
  resolveRecipeGenerationLocale
} from "@/lib/recipes/recipe-locale-prompt";
import { generateRecipeDishImage } from "@/lib/recipes/generate-recipe-image";
import { resolveDishImageMatch } from "@/lib/recipes/resolve-dish-image-match";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import { LOCALE_COOKIE_NAME } from "@/i18n/config";
import { cookies } from "next/headers";

/** Vision + JSON + imagen Premium puede tardar más (p. ej. en Vercel). */
export const maxDuration = 60;

const PANTRY_PRIORITY_RULE =
  "REGLA ABSOLUTA DE INGREDIENTES PRINCIPALES: La receta DEBE construirse PRINCIPALMENTE con los ingredientes que el usuario proporcionó (selección manual y/o detección en imagen). " +
  "PROHIBIDO introducir ingredientes principales que no estén en esa lista. Ejemplo: si el usuario tiene arroz y tomates, NO sugieras fresas, yogur griego, salmón ni pollo. " +
  "Solo puedes añadir condimentos básicos universales: sal, pimienta, aceite de oliva, agua, ajo en polvo. " +
  "Al menos el 80% de los ingredientes_detallados deben provenir de la lista del usuario o de la imagen. " +
  "Si no hay suficientes ingredientes para una receta coherente, simplifica el plato en lugar de inventar productos nuevos.\n\n";

const HEALTHY_NUTRITION_RULE =
  "PRIORIDAD NUTRICIONAL INGENIAFOOD: Todas las recetas deben ser saludables, equilibradas y con ingredientes reales de alto valor nutricional. " +
  "PROHIBIDO inventar o añadir como ingrediente principal harina de trigo, harina blanca, harinas refinadas, azúcar refinada en gran cantidad, frituras en aceite abundante o ingredientes ultraprocesados, SALVO que el usuario los haya seleccionado explícitamente o aparezcan claramente en la imagen. " +
  "Prioriza verduras, proteínas magras, huevos, legumbres, grasas saludables (aceite de oliva, aguacate), cereales integrales (avena, arroz integral, quinoa) y preparaciones al horno, salteado ligero, plancha o airfryer. " +
  "Si los ingredientes del usuario no permiten un plato tradicional con harina, propón una versión saludable alternativa con lo que SÍ tienen (ej. queso al horno con verduras, tortilla, bowl proteico), sin inventar masas fritas ni rebozados. " +
  "Evita recetas tipo empanada, tequeños, buñuelos o frituras con harina si el usuario no aportó harina.\n\n";

const INGREDIENT_VALIDATION_RULE =
  'Antes de generar cualquier receta, analiza minuciosamente la lista de ingredientes que te envía el usuario. Si detectas que alguno de los textos enviados NO es un ingrediente, condimento, bebida o alimento comestible real (por ejemplo: frases como "esto no es un ingrediente", "eres feo", "zapatos", etc.), debes abortar inmediatamente la creación de la receta y responder ÚNICAMENTE con este objeto JSON: {"error":"ingrediente_invalido","mensaje":"Parece que hay algo en tu despensa que no es un alimento válido. ¡Revisa tus ingredientes seleccionados e inténtalo de nuevo!"}. Si todos los ingredientes son válidos, procede a generar la estructura habitual de la receta en formato JSON.\n\n';

const VISION_SYSTEM_PREFIX =
  "Tu primera tarea es analizar si la imagen contiene ingredientes, alimentos o comida. Si la imagen NO muestra nada comestible (por ejemplo: objetos, personas, paisajes, animales), debes responder ÚNICAMENTE con este código de error: { \"error\": \"NOT_FOOD\" }. No generes ninguna receta en ese caso.\nAnaliza esta imagen de una nevera o despensa. Identifica los ingredientes comestibles visibles. Úsalos como base para generar una receta que también incluya los ingredientes que el usuario haya seleccionado manualmente.\n\n";

const MACRO_ESTIMATION_RULE = MACRO_ESTIMATION_PROMPT_CLAUSE;

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif"
]);

type GenerateRecipePayload = {
  selectedIngredients?: string[];
  /** Base64 sin prefijo data URL */
  imageBase64?: string;
  mimeType?: string;
  mealType?: string;
  cuisineStyle?: string;
  servings?: number;
  complexity?: string;
  /** Idioma de interfaz / salida de la receta (es | en). */
  locale?: string;
};

type GeminiRecipe = {
  titulo: string;
  tiempo_preparacion: string;
  ingredientes_detallados: string[];
  pasos_ordenados: string[];
  tip_sandra: string;
  tags: string[];
  macronutrientes: RecipeMacros | null;
};

type LooseGeminiRecipe = Partial<GeminiRecipe> & {
  tiempo?: string;
  ingredientes?: unknown[];
  ingredientes_estructurados?: unknown[];
  pasos?: string[];
  etiquetas?: string[];
  macronutrientes?: unknown;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function maskApiKeyForDevLog(apiKey: string): string {
  if (apiKey.length <= 4) {
    return "****";
  }
  return `${apiKey.slice(0, Math.min(8, apiKey.length - 4))}****`;
}

const GEMINI_REQUEST_TIMEOUT_MS = 180_000;

type ParseOutcome =
  | { status: "ok"; recipe: GeminiRecipe; mealTypeAdvisory?: string }
  | { status: "not_food" }
  | { status: "invalid_ingredient"; message: string }
  | { status: "meal_type_mismatch"; message: string }
  | { status: "incomplete" }
  | { status: "invalid" };

function normalizeRecipePayload(recipe: LooseGeminiRecipe): GeminiRecipe {
  const tags = normalizeRecipeTags(
    Array.isArray(recipe.tags)
      ? recipe.tags
      : Array.isArray(recipe.etiquetas)
        ? recipe.etiquetas
        : []
  );

  return {
    titulo: recipe.titulo ?? "Receta Saludable de Sandra",
    tiempo_preparacion: recipe.tiempo_preparacion ?? recipe.tiempo ?? "20 min",
    ingredientes_detallados: normalizeLooseGeminiIngredients(recipe),
    pasos_ordenados: normalizeRecipeSteps(
      Array.isArray(recipe.pasos_ordenados)
        ? recipe.pasos_ordenados
        : Array.isArray(recipe.pasos)
          ? recipe.pasos
          : []
    ),
    tip_sandra:
      typeof recipe.tip_sandra === "string" && recipe.tip_sandra.trim().length > 0
        ? recipe.tip_sandra.trim()
        : "Tip de Sandra: Equilibra tu plato con proteína magra, vegetales y una grasa saludable.",
    tags,
    macronutrientes: normalizeRecipeMacros(recipe)
  };
}

/**
 * Extrae JSON con regex, valida cierre con '}' y parsea (sin streaming: texto completo de generateContent).
 */
function parseJsonResponse(rawText: string): ParseOutcome {
  let text = rawText.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    text = fence[1].trim();
  }

  const match = text.match(/\{[\s\S]*\}/);
  const jsonString = match ? match[0] : text.trim();

  if (!jsonString.trim().endsWith("}")) {
    console.error(
      "[Gemini] JSON aparentemente incompleto (no termina en '}'). Longitud:",
      jsonString.length
    );
    return { status: "incomplete" };
  }

  const cleanedResponse = jsonString.replace(/,\s*([}\]])/g, "$1").trim();

  try {
    const parsed = JSON.parse(cleanedResponse) as LooseGeminiRecipe & {
      error?: string;
      mensaje?: string;
      advertencia_ingredientes?: string;
    };
    if (parsed.error === "NOT_FOOD") {
      return { status: "not_food" };
    }
    if (parsed.error === "ingrediente_invalido") {
      const message =
        typeof parsed.mensaje === "string" && parsed.mensaje.trim().length > 0
          ? parsed.mensaje.trim()
          : "Parece que hay algo en tu despensa que no es un alimento válido. ¡Revisa tus ingredientes seleccionados e inténtalo de nuevo!";
      return { status: "invalid_ingredient", message };
    }
    if (parsed.error === "tipo_plato_incompatible") {
      const message =
        typeof parsed.mensaje === "string" && parsed.mensaje.trim().length > 0
          ? parsed.mensaje.trim()
          : "Los ingredientes no encajan con el tipo de plato seleccionado. Cambia el filtro o prueba con otros alimentos.";
      return { status: "meal_type_mismatch", message };
    }

    const mealTypeAdvisory =
      typeof parsed.advertencia_ingredientes === "string" &&
      parsed.advertencia_ingredientes.trim().length > 0
        ? parsed.advertencia_ingredientes.trim()
        : undefined;

    return { status: "ok", recipe: normalizeRecipePayload(parsed), mealTypeAdvisory };
  } catch {
    console.log("DEBUG RAW RESPONSE: " + rawText);
    return { status: "invalid" };
  }
}

function formatGeminiFailure(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isRateLimited(message: string): boolean {
  return (
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

function isServiceUnavailable(message: string): boolean {
  return (
    message.includes("503") ||
    message.includes("Service Unavailable") ||
    message.includes("UNAVAILABLE")
  );
}

function isModelNotFound(message: string): boolean {
  return (
    message.includes("404") ||
    message.includes("is not found") ||
    message.includes("not supported for generateContent")
  );
}

function isAuthConfigurationError(message: string): boolean {
  return (
    message.includes("API key not valid") ||
    message.includes("API_KEY_INVALID") ||
    message.includes("PERMISSION_DENIED") ||
    message.includes("403")
  );
}

function buildModelCandidates(configuredModel?: string): string[] {
  const defaults = ["gemini-3.1-flash-lite"];
  const all = configuredModel?.trim() ? [configuredModel.trim(), ...defaults] : defaults;
  return Array.from(new Set(all.filter((model) => model.length > 0)));
}

function stripDataUrlBase64(input: string): { base64: string; mimeType?: string } {
  const trimmed = input.trim();
  const dataUrl = trimmed.match(/^data:([^;]+);base64,([\s\S]+)$/i);
  if (dataUrl) {
    return { base64: dataUrl[2].replace(/\s/g, ""), mimeType: dataUrl[1].toLowerCase() };
  }
  return { base64: trimmed.replace(/\s/g, "") };
}

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient();
    if (!supabase) {
      return jsonResponse(
        { error: "Supabase no está configurado correctamente.", code: "CONFIG_ERROR" },
        500
      );
    }

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(
        {
          error: "Debes iniciar sesión para generar recetas.",
          code: "UNAUTHORIZED"
        },
        401
      );
    }

    const generationsLeft = await getGenerationsLeft(user.id, user.email);
    if (generationsLeft === null) {
      return jsonResponse(
        {
          error: "No pudimos verificar tu cuota de escaneos. Inténtalo de nuevo.",
          code: "QUOTA_CHECK_FAILED"
        },
        503
      );
    }

    if (generationsLeft <= 0) {
      return jsonResponse(
        {
          error:
            "Has agotado tus escaneos de hoy. Vuelve mañana o contacta con soporte si necesitas más.",
          code: "GENERATIONS_EXHAUSTED",
          generationsLeft: 0
        },
        403
      );
    }

    let body: GenerateRecipePayload;
    try {
      body = (await request.json()) as GenerateRecipePayload;
    } catch (parseError) {
      const details =
        parseError instanceof Error
          ? parseError.message
          : "No se pudo leer el body JSON de la solicitud.";
      return jsonResponse(
        {
          error:
            "No se pudo procesar la solicitud. La imagen puede ser demasiado grande o la conexión fue interrumpida.",
          code: "INVALID_REQUEST_BODY",
          details
        },
        400
      );
    }
    const selectedIngredients = Array.isArray(body.selectedIngredients)
      ? body.selectedIngredients
          .map((ingredient) => ingredient.trim())
          .filter((ingredient) => ingredient.length > 0)
      : [];

    const cookieStore = await cookies();
    const recipeLocale = resolveRecipeGenerationLocale({
      bodyLocale: body.locale,
      cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value
    });
    const languagePromptClause = buildRecipeLanguagePromptClause(recipeLocale);

    const { isPremium, access: premiumAccess, error: premiumError } = await getUserIsPremium(
      supabase,
      user.id,
      user.email
    );
    if (premiumError) {
      return jsonResponse(
        {
          error: premiumError,
          code: "PREMIUM_CHECK_FAILED"
        },
        503
      );
    }

    const hadTrialUseBeforeGeneration = premiumAccess.premiumTrialRemaining > 0;

    const resolvedFilters = resolveRecipeFilters({
      isPremium,
      requestedMealType: body.mealType,
      requestedCuisineStyle: body.cuisineStyle,
      requestedServings: body.servings,
      requestedComplexity: body.complexity
    });
    const ingredientQuantityRule = buildIngredientQuantityPromptClause(resolvedFilters.servings);
    const filtersPromptClause = buildRecipeFiltersPromptClause(resolvedFilters);
    const mealTypeCompatibilityClause = buildMealTypeCompatibilityPromptClause(
      resolvedFilters.mealType
    );
    const mealTypePantryClause = buildMealTypePantryExpansionClause(resolvedFilters.mealType);

    let imageBase64Raw =
      typeof body.imageBase64 === "string" && body.imageBase64.length > 0
        ? body.imageBase64
        : undefined;
    let mimeFromBody =
      typeof body.mimeType === "string" && body.mimeType.length > 0
        ? body.mimeType.trim().toLowerCase()
        : undefined;

    if (imageBase64Raw) {
      const stripped = stripDataUrlBase64(imageBase64Raw);
      imageBase64Raw = stripped.base64;
      if (stripped.mimeType) {
        mimeFromBody = stripped.mimeType;
      }
    }

    let imageBytes: number | null = null;
    if (imageBase64Raw) {
      try {
        imageBytes = Buffer.from(imageBase64Raw, "base64").length;
      } catch {
        return jsonResponse({ error: "La imagen no es un Base64 válido." }, 400);
      }
      if (imageBytes > MAX_IMAGE_BYTES) {
        return jsonResponse(
          {
            error:
              "La imagen es demasiado grande. Prueba con otra foto o comprime la imagen antes de subirla."
          },
          400
        );
      }
    }

    const hasImage = Boolean(imageBase64Raw && imageBytes && imageBytes > 0);
    const resolvedMime = hasImage
      ? mimeFromBody && ALLOWED_IMAGE_MIME.has(mimeFromBody)
        ? mimeFromBody
        : "image/jpeg"
      : undefined;

    if (hasImage && mimeFromBody && !ALLOWED_IMAGE_MIME.has(mimeFromBody)) {
      return jsonResponse(
        {
          error:
            "Formato de imagen no soportado. Usa JPEG, PNG, WebP o GIF."
        },
        400
      );
    }

    if (!selectedIngredients.length && !hasImage) {
      return jsonResponse(
        {
          error:
            "Selecciona al menos un ingrediente o añade una foto de tu nevera o despensa."
        },
        400
      );
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
    if (!apiKey) {
      return jsonResponse(
        { error: "Falta GOOGLE_GENERATIVE_AI_API_KEY en variables de entorno." },
        500
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[Gemini] API key cargada correctamente: ${maskApiKeyForDevLog(apiKey)}`
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const selectedList = selectedIngredients.join(", ");
    const configuredModel = process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim();
    const modelCandidates = buildModelCandidates(configuredModel);

    const manualClause = selectedIngredients.length
      ? `Usa como base OBLIGATORIA y PRINCIPAL los ingredientes seleccionados manualmente: [${selectedList}]. La receta debe girar en torno a ellos. Combínalos de forma coherente con lo visible en la imagen (si aplica). NO sustituyas ni añadas ingredientes principales ajenos a esta lista.`
      : "El usuario no seleccionó ingredientes manualmente; infiere los ingredientes únicamente desde la imagen si es posible y no inventes ingredientes principales que no se vean.";

    const jsonRules =
      languagePromptClause +
      PANTRY_PRIORITY_RULE +
      HEALTHY_NUTRITION_RULE +
      ingredientQuantityRule +
      MACRO_ESTIMATION_RULE +
      `${filtersPromptClause}\n\n${mealTypeCompatibilityClause}\n\n${mealTypePantryClause}\n\n` +
      "Solo JSON valido. Entrega receta saludable y rapida. Formato esperado: { \"titulo\": \"\", \"tiempo_preparacion\": \"X min\", \"ingredientes_detallados\": [], \"ingredientes_estructurados\": [], \"pasos_ordenados\": [], \"tip_sandra\": \"\", \"etiquetas\": [], \"advertencia_ingredientes\": \"\", \"macronutrientes\": {\"proteinas_g\": 0, \"carbohidratos_g\": 0, \"grasas_g\": 0, \"calorias\": 0} }. " +
      "advertencia_ingredientes: opcional; texto breve (en el idioma de salida) si hace falta avisar de complementos no escaneados. Si no aplica, usa \"\". " +
      "ETIQUETAS (campo etiquetas): array de 0 a 3 strings. Valores permitidos SOLO: \"Sin Harinas\", \"Apto para Airfryer\", \"Alto en Proteína\". " +
      "NO incluyas Desayuno, Cena, Snack, Almuerzo ni Postre en etiquetas (el momento del plato ya se define por filtros del usuario). " +
      "Reglas estrictas: incluye \"Sin Harinas\" solo si la receta no usa harinas ni cereales refinados; incluye \"Apto para Airfryer\" solo si la cocción principal es en airfryer; incluye \"Alto en Proteína\" solo si aplica de verdad. Si ninguna aplica, devuelve etiquetas: []. " +
      "REGLA DE ORO DE INVENTARIO (obligatoria): el ingrediente PRINCIPAL debe ser lo detectado en la imagen o seleccionado por el usuario. " +
      "Puedes añadir condimentos y complementos de despensa según el tipo de plato (ver DESPENSA AMPLIADA arriba). " +
      "Si el titulo incluye una especia o sabor (como curry o pimenton), ese ingrediente DEBE figurar en ingredientes_detallados y estar respaldado por evidencia visual o seleccion manual. " +
      "PRIORIDAD DE ATRIBUTOS: el titulo debe ser una descripcion tecnica y real de los ingredientes capturados; no inventes sabores externos para hacerlo atractivo. " +
      "VALIDACION CRUZADA obligatoria antes de responder: verifica internamente si todos los elementos del titulo estan presentes en ingredientes_detallados; si no, renombra la receta para que coincida. " +
      "AJUSTE EN TIP DE SANDRA: si consideras que falta algun ingrediente para mejorar sabor (ej. curry), NO lo agregues a la receta principal; incluyelo solo como sugerencia opcional en tip_sandra. " +
      "Genera un 'Tip de Sandra' para cada receta (máximo 2 frases) en el idioma de salida indicado arriba, con tono profesional, cercano y motivador.";

    const systemInstruction = hasImage
      ? `${INGREDIENT_VALIDATION_RULE}${ingredientQuantityRule}${VISION_SYSTEM_PREFIX}${jsonRules} ${manualClause}`
      : `${INGREDIENT_VALIDATION_RULE}${ingredientQuantityRule}Solo JSON valido. Usa ingredientes: [${selectedList}]. Entrega receta saludable y rapida con formato { "titulo": "", "tiempo_preparacion": "X min", "ingredientes_detallados": [], "ingredientes_estructurados": [], "pasos_ordenados": [], "tip_sandra": "", "etiquetas": [], "macronutrientes": {"proteinas_g": 0, "carbohidratos_g": 0, "grasas_g": 0, "calorias": 0} }. ${jsonRules}`;

    const promptTail =
      selectedIngredients.length && hasImage
        ? "Incluye en ingredientes_detallados (con cantidades) los seleccionados por el usuario más los inferidos de la imagen que uses en la receta."
        : selectedIngredients.length
          ? "Incluye en ingredientes_detallados (con cantidades) los ingredientes seleccionados por el usuario en la receta."
          : "Completa ingredientes_detallados (con cantidades) con lo que propongas para la receta.";

    const prompt =
      "Primero valida si hay comida visible. Si NO hay comida, responde solo {\"error\":\"NOT_FOOD\"} y termina sin texto adicional. " +
      "Si sí hay comida, responde exclusivamente con JSON valido (sin markdown, sin bloques de codigo) usando esta estructura exacta: " +
      '{"titulo": string, "tiempo_preparacion": string, "ingredientes_detallados": string[], "ingredientes_estructurados": [{"name": string, "amount": number, "unit": string, "optional": boolean}], "pasos_ordenados": string[], "tip_sandra": string, "etiquetas": string[], "advertencia_ingredientes": string, "macronutrientes": {"proteinas_g": number, "carbohidratos_g": number, "grasas_g": number, "calorias": number}}. ' +
      `${promptTail} No inventes ingredientes principales imposibles; prioriza exclusivamente lo visible y lo indicado arriba. El titulo debe reflejar los ingredientes reales del usuario, no sabores inventados.`;

    let rawResponse = "";

    const maxAttempts = 3;
    const baseDelayMs = 2000;
    let lastFailure = "";
    let lastTriedModel = modelCandidates[0] ?? configuredModel ?? "gemini-3.1-flash-lite";

    const contentParts: Part[] = [];
    if (hasImage && imageBase64Raw) {
      contentParts.push({
        inlineData: {
          mimeType: resolvedMime ?? "image/jpeg",
          data: imageBase64Raw
        }
      });
    }
    contentParts.push({ text: prompt });

    const callGenerateContentOnce = async (): Promise<string> => {
      let text = "";
      let failure = lastFailure;

      for (const candidateModel of modelCandidates) {
        lastTriedModel = candidateModel;
        const model = genAI.getGenerativeModel(
          {
            model: candidateModel,
            systemInstruction,
            generationConfig: {
              temperature: 0.2,
              topP: 0.9,
              // Evita truncar el JSON (PARSING_ERROR por respuesta cortada).
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            }
          },
          { timeout: GEMINI_REQUEST_TIMEOUT_MS }
        );

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            // generateContent (no stream): multimodal cuando hay imagen (orden: imagen, texto)
            const result = await model.generateContent(contentParts, {
              timeout: GEMINI_REQUEST_TIMEOUT_MS
            });
            text = result.response.text();
            break;
          } catch (error) {
            failure = `${candidateModel}: ${formatGeminiFailure(error)}`;
            const retryable = isRateLimited(failure) || isServiceUnavailable(failure);
            const modelMissing = isModelNotFound(failure);
            if (modelMissing || !retryable || attempt === maxAttempts) {
              break;
            }
            await sleep(baseDelayMs * 2 ** (attempt - 1));
          }
        }

        if (text.trim().length > 0) {
          break;
        }
      }

      lastFailure = failure;
      return text;
    };

    let parseOutcome: ParseOutcome | null = null;
    let lastRawForParse = "";

    for (let genTry = 0; genTry < 2; genTry += 1) {
      const attemptText = await callGenerateContentOnce();

      if (attemptText?.trim()) {
        lastRawForParse = attemptText;
        parseOutcome = parseJsonResponse(attemptText);
        if (parseOutcome.status === "ok") {
          rawResponse = attemptText;
          break;
        }
        if (
          genTry === 0 &&
          (parseOutcome.status === "incomplete" || parseOutcome.status === "invalid")
        ) {
          console.error(
            "[Gemini] Respuesta incompleta del servidor, reintentando generateContent una vez...",
            { status: parseOutcome.status }
          );
          continue;
        }
        rawResponse = attemptText;
        break;
      }

      if (genTry === 0) {
        break;
      }
    }

    if (!parseOutcome || parseOutcome.status !== "ok") {
      rawResponse = lastRawForParse;
    }

    if (parseOutcome?.status === "not_food") {
      return jsonResponse(
        {
          error: "NOT_FOOD",
          code: "NOT_FOOD"
        },
        422
      );
    }

    if (parseOutcome?.status === "invalid_ingredient") {
      return jsonResponse(
        {
          error: "ingrediente_invalido",
          code: "INVALID_INGREDIENT",
          mensaje: parseOutcome.message
        },
        400
      );
    }

    if (parseOutcome?.status === "meal_type_mismatch") {
      return jsonResponse(
        {
          error: "tipo_plato_incompatible",
          code: "MEAL_TYPE_MISMATCH",
          mensaje: parseOutcome.message
        },
        422
      );
    }

    if (!rawResponse?.trim() && !lastRawForParse?.trim()) {
      const quotaHit = isRateLimited(lastFailure);
      const unavailableHit = isServiceUnavailable(lastFailure);
      const missingModelHit = isModelNotFound(lastFailure);
      const authConfigHit = isAuthConfigurationError(lastFailure);

      if (missingModelHit) {
        console.error(
          `Error de configuración de modelo: Revisa que el modelo configurado esté habilitado en este proyecto. Ultimo modelo probado: ${lastTriedModel}`
        );
      }

      console.error("[Gemini] Fallo tras reintentos:", lastFailure);

      if (unavailableHit) {
        return jsonResponse(
          {
            error:
              "El servidor de Google está saturado (Demanda alta). Por favor, intenta de nuevo en unos segundos.",
            code: "SERVICE_UNAVAILABLE",
            details: lastFailure
          },
          503
        );
      }

      const statusCode = quotaHit ? 429 : 502;
      return jsonResponse(
        {
          error: authConfigHit
            ? "Error de autenticacion o permisos con Google AI. Verifica GOOGLE_GENERATIVE_AI_API_KEY y que la API Gemini este habilitada para tu proyecto."
            : missingModelHit
              ? `El modelo configurado no esta disponible para esta API key/proyecto. Modelos probados: ${modelCandidates.join(", ")}.`
              : quotaHit
                ? "Has alcanzado el límite de consultas gratuitas. Espera un momento."
                : "No pudimos contactar al modelo de IA. Verifica la API key y la configuracion del modelo.",
          code: quotaHit ? "RATE_LIMIT" : missingModelHit ? "MODEL_NOT_FOUND" : "GEMINI_ERROR",
          details: lastFailure
        },
        statusCode
      );
    }

    if (!rawResponse?.trim()) {
      return jsonResponse(
        {
          error: "Gemini respondio vacio. Verifica tu prompt o intenta con otros ingredientes.",
          details: `${lastTriedModel}: respuesta vacia del modelo`
        },
        502
      );
    }

    if (!parseOutcome || parseOutcome.status !== "ok") {
      const isIncomplete = parseOutcome?.status === "incomplete";
      console.error(
        "[Gemini] Respuesta no parseable como JSON. Raw (primeros 2000 chars):",
        rawResponse.slice(0, 2000)
      );
      return jsonResponse(
        {
          error: isIncomplete
            ? "Respuesta incompleta del servidor, reintentando..."
            : "La IA respondió pero el formato no es válido. Intenta con otros ingredientes.",
          code: isIncomplete ? "INCOMPLETE_RESPONSE" : "PARSING_ERROR",
          details: rawResponse.slice(0, 1500)
        },
        502
      );
    }
    const recipe = parseOutcome.recipe;
    const mealTypeAdvisory = parseOutcome.mealTypeAdvisory;

    const safeRecipe: GeminiRecipe = {
      titulo: recipe.titulo || "Receta Saludable de Sandra",
      tiempo_preparacion: recipe.tiempo_preparacion || "20 min",
      ingredientes_detallados: (() => {
        const normalized = normalizeLooseGeminiIngredients(recipe);
        if (normalized.length > 0) {
          return normalized;
        }
        return selectedIngredients;
      })(),
      pasos_ordenados: normalizeRecipeSteps(
        Array.isArray(recipe.pasos_ordenados) ? recipe.pasos_ordenados : []
      ),
      tip_sandra:
        typeof recipe.tip_sandra === "string" && recipe.tip_sandra.trim().length > 0
          ? recipe.tip_sandra.trim()
          : "Tip de Sandra: organiza todos tus ingredientes antes de cocinar para ganar tiempo y mantener una preparación más eficiente.",
      tags: normalizeRecipeTags(recipe.tags),
      macronutrientes: recipe.macronutrientes
    };

    const remainingGenerations = await consumeGeneration(user.id, user.email);
    if (remainingGenerations === null) {
      return jsonResponse(
        {
          error:
            "Has completado tus 5 pruebas gratuitas. ¡Gracias por formar parte de IngeniaFood! Muy pronto abriremos la versión premium.",
          code: "GENERATIONS_EXHAUSTED",
          generationsLeft: 0
        },
        403
      );
    }

    let premiumTrialRemaining = premiumAccess.premiumTrialRemaining;
    const consumedPremiumTrial =
      !premiumAccess.isPaidPremium &&
      hadTrialUseBeforeGeneration &&
      usedPremiumRecipeFilters(resolvedFilters);

    if (consumedPremiumTrial) {
      premiumTrialRemaining = await consumePremiumTrialUse(user.id);
      if (process.env.NODE_ENV !== "production") {
        console.log("[premium-trial] Consumido tras receta con filtros Premium.", {
          userId: user.id,
          premiumTrialRemaining
        });
      }
    }

    let referenceImageUrl: string | null = null;
    try {
      const referenceMatch = await resolveDishImageMatch({
        recipeTitle: safeRecipe.titulo,
        ingredients: safeRecipe.ingredientes_detallados,
        tags: safeRecipe.tags,
        mealType: resolvedFilters.mealType,
        cuisineStyle: resolvedFilters.cuisineStyle
      });
      referenceImageUrl = referenceMatch?.imageUrl ?? null;
    } catch (referenceError) {
      console.warn("[recipe-image] No se pudo resolver imagen de referencia:", referenceError);
    }

    let imageUrl: string | null = null;
    let imageGenerationError: string | undefined;
    if (premiumAccess.isPaidPremium) {
      const imageResult = await generateRecipeDishImage({
        userId: user.id,
        title: safeRecipe.titulo,
        ingredients: safeRecipe.ingredientes_detallados,
        tags: safeRecipe.tags,
        mealType: resolvedFilters.mealType,
        cuisineStyle: resolvedFilters.cuisineStyle,
        tipSandra: safeRecipe.tip_sandra
      });
      imageUrl = imageResult.imageUrl;
      imageGenerationError = imageResult.error;
    }

    return jsonResponse({
      recipe: safeRecipe,
      savedRecipe: null,
      generationsLeft: remainingGenerations,
      referenceImageUrl,
      imageUrl,
      ...(process.env.NODE_ENV !== "production" && imageGenerationError
        ? { imageGenerationError }
        : {}),
      appliedFilters: {
        mealType: resolvedFilters.mealType,
        cuisineStyle: resolvedFilters.cuisineStyle,
        servings: resolvedFilters.servings,
        complexity: resolvedFilters.complexity
      },
      ...(mealTypeAdvisory ? { mealTypeAdvisory } : {}),
      premiumTrialRemaining
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido al generar la receta.";
    console.error("[generate-recipe] Excepción no controlada:", error);
    return jsonResponse(
      {
        error: "No pudimos generar una receta con los ingredientes seleccionados. Intenta nuevamente.",
        code: "SERVER_ERROR",
        details: message
      },
      500
    );
  }
}
