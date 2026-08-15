import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractGeminiTokenUsage, logAiUsage } from "@/lib/ai/log-ai-usage";
import { getUserIsPremium } from "@/lib/auth/user-premium";
import { fetchUserNutritionGoals } from "@/lib/nutrition/nutrition-profile";
import {
  buildPreferredDietPromptClause,
  preferredDietLabel,
  type PreferredDiet
} from "@/lib/nutrition/preferred-diet";
import { MEAL_TYPES, type MealType } from "@/lib/plan/constants";
import {
  pickMealSuggestionFromCatalog,
  rankMealCandidates,
  toMealSuggestion,
  type MealSuggestion,
  type MealSuggestionCandidate,
  type RemainingMacros
} from "@/lib/plan/meal-suggestion";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  mealType?: string;
  excludeRecipeIds?: string[];
  remainingMacros?: Partial<RemainingMacros>;
  preferAi?: boolean;
};

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function parseMealType(value: unknown): MealType | null {
  if (typeof value !== "string") return null;
  return (MEAL_TYPES as readonly string[]).includes(value) ? (value as MealType) : null;
}

function parseRemaining(raw: Body["remainingMacros"]): RemainingMacros {
  return {
    calories: Math.max(0, Number(raw?.calories) || 2000),
    protein: Math.max(0, Number(raw?.protein) || 90),
    carbs: Math.max(0, Number(raw?.carbs) || 220),
    fat: Math.max(0, Number(raw?.fat) || 65)
  };
}

async function rankWithGemini(
  shortlist: MealSuggestionCandidate[],
  mealType: MealType,
  remaining: RemainingMacros,
  preferredDiet: PreferredDiet,
  userId?: string | null
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey || shortlist.length === 0) return null;

  try {
    const modelName =
      process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || "gemini-2.0-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 120,
        responseMimeType: "application/json"
      }
    });

    const catalog = shortlist.map((item, index) => ({
      index,
      id: item.id,
      title: item.title
    }));

    const dietClause = buildPreferredDietPromptClause(preferredDiet);
    const dietLine = dietClause
      ? `\nPreferencia de alimentación del usuario (${preferredDietLabel(preferredDiet)}): ${dietClause}`
      : "";

    const prompt = `Eres coach de nutrición de IngeniaFood. Elige UNA receta del catálogo para ${mealType}.
Reglas de coherencia (obligatorias):
- Desayuno: SOLO platos de desayuno.
- Almuerzo: platos de almuerzo o cena (intercambiables).
- Cena: platos de cena o almuerzo (intercambiables).
- Nunca elijas postre.
El catálogo YA está filtrado por esas reglas: elige solo entre estos IDs.
Macros restantes del día (aprox): ${remaining.calories} kcal, ${remaining.protein}g proteína, ${remaining.carbs}g carbs, ${remaining.fat}g grasas.${dietLine}
Catálogo:
${JSON.stringify(catalog, null, 2)}

Devuelve SOLO JSON: { "recipeId": "uuid-del-catalogo" }
El recipeId DEBE ser uno de la lista.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const tokens = extractGeminiTokenUsage(result.response);
    void logAiUsage({
      userId,
      feature: "meal_suggestion",
      provider: "gemini",
      model: modelName,
      inputTokens: tokens.inputTokens,
      outputTokens: tokens.outputTokens
    });
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { recipeId?: string };
    const id = typeof parsed.recipeId === "string" ? parsed.recipeId.trim() : "";
    return shortlist.some((item) => item.id === id) ? id : null;
  } catch (error) {
    console.warn(
      "[meal-suggestion] Gemini rank fallback:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient();
    if (!supabase) {
      return jsonResponse({ error: "Supabase no configurado.", code: "NO_SUPABASE" }, 500);
    }

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "No autenticado.", code: "UNAUTHORIZED" }, 401);
    }

    const { isPremium, error: premiumError } = await getUserIsPremium(
      supabase,
      user.id,
      user.email
    );

    if (premiumError) {
      return jsonResponse({ error: premiumError, code: "PREMIUM_CHECK_FAILED" }, 500);
    }

    if (!isPremium) {
      return jsonResponse(
        {
          error: "Las sugerencias inteligentes de recetas son exclusivas de Premium.",
          code: "PREMIUM_REQUIRED"
        },
        403
      );
    }

    let body: Body = {};
    try {
      body = (await request.json()) as Body;
    } catch {
      body = {};
    }

    const mealType = parseMealType(body.mealType);
    if (!mealType) {
      return jsonResponse({ error: "mealType inválido.", code: "INVALID_MEAL" }, 400);
    }

    const excludeRecipeIds = Array.isArray(body.excludeRecipeIds)
      ? body.excludeRecipeIds.map(String).filter(Boolean).slice(0, 20)
      : [];
    const remaining = parseRemaining(body.remainingMacros);
    const goals = await fetchUserNutritionGoals(user.id, supabase);
    const preferredDiet = goals.preferredDiet;

    const { data: recipes, error } = await supabase
      .from("recipes")
      .select(
        "id, title, description, instructions, image_url, macros, meal_type, tags, is_airfryer, is_flourless, cuisine_style"
      )
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .limit(100);

    if (error) {
      console.error("[meal-suggestion] fetch:", error);
      return jsonResponse({ error: "No se pudieron cargar recetas.", code: "FETCH_FAILED" }, 500);
    }

    const candidates = (recipes ?? []) as MealSuggestionCandidate[];
    if (candidates.length === 0) {
      return jsonResponse({ error: "Sin recetas disponibles.", code: "EMPTY" }, 404);
    }

    const ranked = rankMealCandidates(
      candidates,
      mealType,
      remaining,
      excludeRecipeIds,
      undefined,
      preferredDiet
    );
    if (ranked.length === 0) {
      return jsonResponse(
        {
          error:
            mealType === "Desayuno"
              ? "No hay recetas de desayuno disponibles para sugerir."
              : "No hay recetas coherentes con esta comida para sugerir.",
          code: "NO_COMPATIBLE"
        },
        404
      );
    }

    let suggestion: MealSuggestion | null = null;
    const preferAi = body.preferAi !== false;
    if (preferAi) {
      const shortlist = ranked.slice(0, 8);
      const aiId = await rankWithGemini(
        shortlist,
        mealType,
        remaining,
        preferredDiet,
        user.id
      );
      const aiPick = aiId ? shortlist.find((item) => item.id === aiId) : null;
      if (aiPick) {
        suggestion = toMealSuggestion(aiPick, mealType, "ai-ranked");
      }
    }

    if (!suggestion) {
      suggestion = pickMealSuggestionFromCatalog(
        ranked,
        mealType,
        remaining,
        excludeRecipeIds,
        undefined,
        preferredDiet
      );
    }

    if (!suggestion) {
      return jsonResponse({ error: "Sin sugerencia.", code: "EMPTY" }, 404);
    }

    return jsonResponse({
      ok: true,
      suggestion,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[meal-suggestion]", error);
    return jsonResponse({ error: "Error generando sugerencia.", code: "UNEXPECTED" }, 500);
  }
}
