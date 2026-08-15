import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractGeminiTokenUsage, logAiUsage } from "@/lib/ai/log-ai-usage";
import { buildDeterministicIntelligentDose } from "@/lib/premium-stories/build-deterministic-intelligent-dose";
import {
  buildNutritionFactsForPrompt,
  type IntelligentDoseReport,
  type IntelligentDoseUserContext
} from "@/lib/premium-stories/intelligent-dose-context";
import {
  buildDoseSuggestedRecipe,
  computeDayBalanceLevel,
  extractIdeaFromActionText,
  inferIngredientsFromIdea,
  type DoseSuggestedRecipe
} from "@/lib/premium-stories/dose-suggested-recipe";
import type { MealType } from "@/lib/plan/constants";
import type { RecipeMealType } from "@/lib/recipes/premium-recipe-filters";

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

/** Quita vocativos tipo "Sandra, ..." al inicio (anti-repetición). */
function stripLeadingName(text: string, firstName: string | null | undefined): string {
  const name = firstName?.trim();
  if (!name || !text) return text;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(`^\\s*¡?\\s*${escaped}\\s*[,!:\\-–—]?\\s*`, "i"), "")
    .replace(/^\s*[a-z]/, (ch) => ch.toUpperCase())
    .trim();
}

function buildPrompt(context: IntelligentDoseUserContext): string {
  const name = context.firstName?.trim() || null;
  const nameRule = name
    ? `El nombre de pila del usuario es "${name}". PROHIBIDO usarlo en tuEstrellaDeHoy, oportunidadParaCrecer, tuRetoParaManana o previewHeadline. El saludo con nombre lo pone la UI, no tú.`
    : `No uses vocativos ni nombres propios al inicio de las frases.`;

  const today = context.mealsPlannedToday;
  const facts = buildNutritionFactsForPrompt(context);

  return `Eres Sandra Vergara, coach de nutrición de IngeniaFood. Escribes como una profesional humana cercana (nunca robótica ni tecnológica).
Tono: cálido, motivador, entusiasta y analítico. Habla en primera persona del plural ("analizamos", "nos encanta") o como coach dedicado ("tú" / "te sugerimos").

${nameRule}

PROHIBIDO usar estas palabras o ideas: "IA", "inteligencia artificial", "algoritmo", "bot", "sistema", "generado por", "modelo", "prompt".

${facts}

CONTEXTO ADICIONAL (JSON; no contradigas los HECHOS de arriba):
${JSON.stringify(
  {
    dateKey: context.dateKey,
    mealsPlannedToday: {
      mealCount: today.mealCount,
      totalCalories: today.totalCalories,
      totalProtein: today.totalProtein,
      totalCarbs: today.totalCarbs,
      totalFat: today.totalFat,
      hasProtein: today.hasProtein,
      hasVegetables: today.hasVegetables,
      isLowCalorieDay: today.isLowCalorieDay,
      isLikelyLiquidOnly: today.isLikelyLiquidOnly,
      isIncompleteMenu: today.isIncompleteMenu,
      mealTitles: today.mealTitles,
      mealTypesFilled: today.mealTypesFilled,
      dishes: today.dishes
    },
    mealsPlannedYesterday: {
      mealCount: context.mealsPlannedYesterday.mealCount,
      totalCalories: context.mealsPlannedYesterday.totalCalories,
      totalProtein: context.mealsPlannedYesterday.totalProtein,
      hasProtein: context.mealsPlannedYesterday.hasProtein,
      hasVegetables: context.mealsPlannedYesterday.hasVegetables,
      isIncompleteMenu: context.mealsPlannedYesterday.isIncompleteMenu
    },
    weeklyStats: context.weeklyStats,
    nutritionGoals: context.nutritionGoals
  },
  null,
  2
)}

REGLAS DE ANÁLISIS (obligatorias; si las incumples el informe es inválido):
1) NUNCA felicites por "proteína", "verduras", "vegetales", "balance" o macros que hasSignificantProtein/hasSignificantVegetables marquen false.
2) Si isLowCalorieDay=true OR isLikelyLiquidOnly=true OR isIncompleteMenu=true OR totalCalories < 60% de calorieTarget (${Math.round((context.nutritionGoals?.calorieTarget ?? 2000) * 0.6)} kcal):
   - tuEstrellaDeHoy: felicita SOLO el hábito de registrar (ej: "Registraste tu plan de hoy, ¡buen paso de organización!").
   - oportunidadParaCrecer: señala el déficit con el número real vs meta personalizada (ej: "~${today.totalCalories} kcal vs meta ~${context.nutritionGoals?.calorieTarget ?? 2000} kcal").
   - tuRetoParaManana: pide un plato completo con proteína real (pollo, huevos o legumbres).
3) Si totalCalories está entre 60% y 85% de calorieTarget (fuera del rango ideal ±15%):
   - PROHIBIDO decir "excelente balance" o felicitar como si la meta estuviera cumplida.
   - tuEstrellaDeHoy: puedes reconocer proteína/vegetales SI son true, PERO menciona que aún falta energía vs meta (~${today.totalCalories} / ~${context.nutritionGoals?.calorieTarget ?? 2000} kcal).
   - oportunidadParaCrecer: OBLIGATORIO hablar del hueco calórico (~${Math.max(0, (context.nutritionGoals?.calorieTarget ?? 2000) - today.totalCalories)} kcal restantes) como prioridad #1.
   - tuRetoParaManana: plato que ayude a cerrar ese hueco.
4) Si totalCalories > 115% de calorieTarget: aviso de exceso en oportunidadParaCrecer (sin alarmismo). PROHIBIDO "excelente balance".
5) Solo si totalCalories está en ±15% de calorieTarget puedes hablar de "excelente balance" energético.
6) Usa los números exactos de totalCalories / totalProtein / totalCarbs / totalFat y calorieTarget. No inventes platos ni ingredientes.

SECCIONES (contenido limpio, SIN saludo ni vocativo al inicio):
1) "tuEstrellaDeHoy": 2 frases máx. NUNCA contradiga la oportunidad de crecer.
2) "oportunidadParaCrecer": 2 frases máx. Análisis concreto con datos reales.
3) "tuRetoParaManana": UNA recomendación concreta de nutricionista amigo que nombre un plato concreto.
4) "previewHeadline": titular corto (máx 12 palabras), SIN nombre y SIN mencionar tecnología.
5) "recetaSugerida": objeto con idea de plato para generar mañana (OBLIGATORIO si hay plan):
   - "idea": título corto del plato (ej. "Pollo a la plancha con verduras asadas")
   - "ingredientes": 2–5 ingredientes principales en español
   - "tipoComida": "Desayuno" | "Almuerzo" | "Cena"

Devuelve SOLO JSON válido:
{
  "previewHeadline": "string",
  "tuEstrellaDeHoy": "string",
  "oportunidadParaCrecer": "string",
  "tuRetoParaManana": "string",
  "recetaSugerida": {
    "idea": "string",
    "ingredientes": ["string"],
    "tipoComida": "Almuerzo"
  }
}`;
}

function mentionsUnsupportedMacros(
  text: string,
  today: IntelligentDoseUserContext["mealsPlannedToday"],
  calorieWarning?: "low" | "below" | "above" | "high" | null
): boolean {
  // Solo bloquea FELICITACIONES por macros no respaldados (mencionar un déficit de proteína sí es válido).
  const proteinPraise =
    /(excelente.{0,40}prote|buen aporte de prote|cumpliste prote|balance.{0,30}prote|incluiste prote|prote[ií]na y veget)/i;
  const vegetablePraise =
    /(excelente.{0,40}verdura|excelente.{0,40}veget|buen aporte de veget|meta de verdura|vegetales en tu men[uú])/i;
  const overallExcellent =
    /(excelente balance|en excelente camino|¡a por todas!|cumpliste tu meta energ)/i;

  if (!today.hasProtein && proteinPraise.test(text)) return true;
  if (!today.hasVegetables && vegetablePraise.test(text)) return true;

  if (
    (today.isLowCalorieDay || today.isLikelyLiquidOnly || today.isIncompleteMenu) &&
    /(excelente balance|cumpliste prote|meta de verdura|prote[ií]na y veget)/i.test(text)
  ) {
    return true;
  }

  // Si estás fuera del ±15% de la meta, no permitir felicitaciones de "excelente balance".
  if (
    (calorieWarning === "low" ||
      calorieWarning === "below" ||
      calorieWarning === "above" ||
      calorieWarning === "high") &&
    overallExcellent.test(text)
  ) {
    return true;
  }

  return false;
}

function planMealToRecipeMeal(meal: MealType): RecipeMealType {
  if (meal === "Desayuno") return "desayuno";
  if (meal === "Cena") return "cena";
  return "almuerzo";
}

function parseSuggestedRecipe(
  raw: unknown,
  fallback: DoseSuggestedRecipe | null | undefined,
  action: string,
  context: IntelligentDoseUserContext
): DoseSuggestedRecipe | null {
  const base = fallback ?? buildDoseSuggestedRecipe(context.mealsPlannedToday);

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const idea = String(obj.idea ?? obj.titulo ?? "").trim();
    const rawIngredients = obj.ingredientes ?? obj.ingredients;
    const ingredients = Array.isArray(rawIngredients)
      ? rawIngredients.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
      : [];
    const tipoRaw = String(obj.tipoComida ?? obj.mealType ?? "").trim();
    const planMealType: MealType =
      tipoRaw === "Desayuno" || tipoRaw === "Cena" || tipoRaw === "Almuerzo"
        ? tipoRaw
        : base.planMealType;

    if (idea) {
      return {
        idea: idea.slice(0, 120),
        ingredients: ingredients.length > 0 ? ingredients : inferIngredientsFromIdea(idea),
        planMealType,
        recipeMealType: planMealToRecipeMeal(planMealType)
      };
    }
  }

  const fromAction = extractIdeaFromActionText(action);
  if (fromAction) {
    return {
      ...base,
      idea: fromAction,
      ingredients: inferIngredientsFromIdea(fromAction)
    };
  }

  return base;
}

function normalizeAiReport(
  raw: unknown,
  fallback: IntelligentDoseReport,
  context: IntelligentDoseUserContext
): IntelligentDoseReport {
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  const firstName = context.firstName;
  const headline = stripLeadingName(
    String(obj.previewHeadline ?? obj.titular ?? "").trim(),
    firstName
  );
  const highlight = stripLeadingName(
    String(obj.tuEstrellaDeHoy ?? obj.loQueDestaco ?? obj.highlight ?? "").trim(),
    firstName
  );
  const improve = stripLeadingName(
    String(obj.oportunidadParaCrecer ?? obj.aMejorar ?? obj.improve ?? "").trim(),
    firstName
  );
  const action = stripLeadingName(
    String(obj.tuRetoParaManana ?? obj.planDeAccion ?? obj.action ?? "").trim(),
    firstName
  );

  if (!highlight || !improve || !action) return fallback;

  const today = context.mealsPlannedToday;
  const balance = computeDayBalanceLevel(today, {
    calorieTarget: context.nutritionGoals?.calorieTarget
  });
  if (
    mentionsUnsupportedMacros(highlight, today, balance.calorieWarning) ||
    mentionsUnsupportedMacros(improve, today, balance.calorieWarning) ||
    mentionsUnsupportedMacros(headline, today, balance.calorieWarning)
  ) {
    return fallback;
  }

  // Si hay hueco claro vs meta, el improve debe mencionarlo; si no, usamos el determinista.
  const mustMentionTarget =
    balance.calorieWarning === "low" ||
    balance.calorieWarning === "below" ||
    balance.calorieWarning === "above" ||
    balance.calorieWarning === "high";
  const mentionsTarget =
    /kcal|meta|objetivo|energ/i.test(improve) ||
    String(balance.calorieTarget).length > 0 &&
      improve.includes(String(balance.calorieTarget));
  if (mustMentionTarget && !mentionsTarget) {
    return fallback;
  }

  const suggestedRecipe = parseSuggestedRecipe(
    obj.recetaSugerida ?? obj.suggestedRecipe,
    fallback.suggestedRecipe,
    action,
    context
  );

  return {
    hasPlanData: fallback.hasPlanData,
    previewHeadline: (headline || fallback.previewHeadline).slice(0, 140),
    highlight: highlight.slice(0, 420),
    improve: improve.slice(0, 420),
    action: action.slice(0, 280),
    suggestedRecipe
  };
}

export async function generateIntelligentDoseReport(
  context: IntelligentDoseUserContext,
  options?: { userId?: string | null }
): Promise<{ report: IntelligentDoseReport; source: "ai" | "fallback" }> {
  const fallback = buildDeterministicIntelligentDose(context);
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    return { report: fallback, source: "fallback" };
  }

  try {
    const modelName =
      process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || "gemini-2.0-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 900,
        responseMimeType: "application/json"
      }
    });
    const result = await model.generateContent(buildPrompt(context));
    const text = result.response.text();
    const tokens = extractGeminiTokenUsage(result.response);
    void logAiUsage({
      userId: options?.userId,
      feature: "intelligent_dose",
      provider: "gemini",
      model: modelName,
      inputTokens: tokens.inputTokens,
      outputTokens: tokens.outputTokens
    });
    const jsonText = extractJsonObject(text) ?? text;
    const parsed = JSON.parse(jsonText) as unknown;
    return {
      report: normalizeAiReport(parsed, fallback, context),
      source: "ai"
    };
  } catch (error) {
    console.warn(
      "[intelligent-dose] AI fallback:",
      error instanceof Error ? error.message : error
    );
    return { report: fallback, source: "fallback" };
  }
}
