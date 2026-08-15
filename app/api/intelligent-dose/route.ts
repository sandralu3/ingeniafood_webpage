import { NextResponse } from "next/server";
import { getUserIsPremium } from "@/lib/auth/user-premium";
import { generateIntelligentDoseReport } from "@/lib/premium-stories/generate-intelligent-dose";
import type {
  IntelligentDoseDish,
  IntelligentDoseMealSnapshot,
  IntelligentDoseNutritionGoals,
  IntelligentDoseUserContext
} from "@/lib/premium-stories/intelligent-dose-context";
import { LOW_CALORIE_DAY_THRESHOLD } from "@/lib/premium-stories/intelligent-dose-context";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";
export const maxDuration = 45;

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function parseNutritionGoals(value: unknown): IntelligentDoseNutritionGoals {
  if (!value || typeof value !== "object") {
    return {
      isComplete: false,
      calorieTarget: 2000,
      proteinTarget: 90,
      source: "default",
      bmr: null,
      tdee: null
    };
  }
  const g = value as Record<string, unknown>;
  const source = g.source === "profile" ? "profile" : "default";
  return {
    isComplete: Boolean(g.isComplete),
    calorieTarget: Math.max(1000, Math.min(5000, Number(g.calorieTarget) || 2000)),
    proteinTarget: Math.max(30, Math.min(300, Number(g.proteinTarget) || 90)),
    source,
    bmr:
      typeof g.bmr === "number" && Number.isFinite(g.bmr)
        ? Math.round(g.bmr)
        : null,
    tdee:
      typeof g.tdee === "number" && Number.isFinite(g.tdee)
        ? Math.round(g.tdee)
        : null
  };
}

function isValidMealSnapshot(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.mealCount === "number" &&
    (typeof v.totalKcal === "number" || typeof v.totalCalories === "number")
  );
}

function parseDish(value: unknown): IntelligentDoseDish | null {
  if (!value || typeof value !== "object") return null;
  const d = value as Record<string, unknown>;
  const title = String(d.title ?? "").trim();
  if (!title) return null;
  return {
    mealType: String(d.mealType ?? ""),
    title,
    kcal: Math.max(0, Number(d.kcal) || 0),
    proteinGrams: Math.max(0, Number(d.proteinGrams) || 0),
    carbsGrams: Math.max(0, Number(d.carbsGrams) || 0),
    fatGrams: Math.max(0, Number(d.fatGrams) || 0),
    ingredientNames: Array.isArray(d.ingredientNames)
      ? d.ingredientNames.map(String).slice(0, 16)
      : [],
    isLikelyLiquidOnly: Boolean(d.isLikelyLiquidOnly)
  };
}

function parseMealSnapshot(
  value: IntelligentDoseUserContext["mealsPlannedToday"] | Record<string, unknown>
): IntelligentDoseMealSnapshot {
  const v = value as Record<string, unknown>;
  const dishes = Array.isArray(v.dishes)
    ? v.dishes.map(parseDish).filter((d): d is IntelligentDoseDish => Boolean(d)).slice(0, 6)
    : [];

  const mealCount = Math.max(0, Number(v.mealCount) || dishes.length || 0);
  const totalCalories = Math.max(
    0,
    Number(v.totalCalories ?? v.totalKcal) ||
      dishes.reduce((sum, d) => sum + d.kcal, 0)
  );
  const totalProtein = Math.max(
    0,
    Number(v.totalProtein) || dishes.reduce((sum, d) => sum + d.proteinGrams, 0)
  );
  const totalCarbs = Math.max(
    0,
    Number(v.totalCarbs) || dishes.reduce((sum, d) => sum + d.carbsGrams, 0)
  );
  const totalFat = Math.max(
    0,
    Number(v.totalFat) || dishes.reduce((sum, d) => sum + d.fatGrams, 0)
  );

  const isLikelyLiquidOnly =
    typeof v.isLikelyLiquidOnly === "boolean"
      ? v.isLikelyLiquidOnly
      : mealCount > 0 && dishes.length > 0 && dishes.every((d) => d.isLikelyLiquidOnly);
  const isLowCalorieDay =
    typeof v.isLowCalorieDay === "boolean"
      ? v.isLowCalorieDay
      : totalCalories < LOW_CALORIE_DAY_THRESHOLD;
  const isIncompleteMenu =
    typeof v.isIncompleteMenu === "boolean"
      ? v.isIncompleteMenu
      : mealCount === 0 || mealCount < 3 || isLowCalorieDay || isLikelyLiquidOnly;

  return {
    mealCount,
    totalKcal: totalCalories,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    hasVegetables: Boolean(v.hasVegetables) && !isLikelyLiquidOnly,
    hasProtein: Boolean(v.hasProtein) && !isLikelyLiquidOnly,
    mealTitles: Array.isArray(v.mealTitles)
      ? v.mealTitles.map(String).slice(0, 6)
      : dishes.map((d) => d.title).slice(0, 6),
    mealTypesFilled: Array.isArray(v.mealTypesFilled)
      ? v.mealTypesFilled.map(String).slice(0, 6)
      : dishes.map((d) => d.mealType).slice(0, 6),
    dishes,
    ingredientNames: Array.isArray(v.ingredientNames)
      ? v.ingredientNames.map(String).slice(0, 40)
      : Array.from(new Set(dishes.flatMap((d) => d.ingredientNames))).slice(0, 40),
    isLowCalorieDay,
    isLikelyLiquidOnly,
    isIncompleteMenu
  };
}

function parseContext(body: unknown): IntelligentDoseUserContext | null {
  if (!body || typeof body !== "object") return null;
  const ctx = (body as { context?: unknown }).context;
  if (!ctx || typeof ctx !== "object") return null;
  const c = ctx as Record<string, unknown>;
  if (!isValidMealSnapshot(c.mealsPlannedToday) || !isValidMealSnapshot(c.mealsPlannedYesterday)) {
    return null;
  }
  if (!c.weeklyStats || typeof c.weeklyStats !== "object") return null;

  const today = c.mealsPlannedToday as IntelligentDoseUserContext["mealsPlannedToday"];
  const yesterday = c.mealsPlannedYesterday as IntelligentDoseUserContext["mealsPlannedYesterday"];
  const week = c.weeklyStats as IntelligentDoseUserContext["weeklyStats"];
  const firstNameRaw = typeof c.firstName === "string" ? c.firstName.trim() : "";
  const firstName = firstNameRaw ? firstNameRaw.split(/\s+/).filter(Boolean)[0] : null;

  return {
    dateKey: String(c.dateKey ?? ""),
    firstName,
    mealsPlannedToday: parseMealSnapshot(today),
    mealsPlannedYesterday: parseMealSnapshot(yesterday),
    nutritionGoals: parseNutritionGoals(c.nutritionGoals),
    weeklyStats: {
      daysWithAnyMeal: Math.max(0, Number(week.daysWithAnyMeal) || 0),
      daysTracked: Math.max(1, Number(week.daysTracked) || 7),
      daysWithVegetables: Math.max(0, Number(week.daysWithVegetables) || 0),
      daysWithProtein: Math.max(0, Number(week.daysWithProtein) || 0),
      totalMealsPlanned: Math.max(0, Number(week.totalMealsPlanned) || 0),
      planCompletionPercent: Math.max(
        0,
        Math.min(100, Number(week.planCompletionPercent) || 0)
      ),
      avgDailyKcal: Math.max(0, Number(week.avgDailyKcal) || 0),
      consecutiveVegetableDays: Math.max(0, Number(week.consecutiveVegetableDays) || 0),
      consecutiveProteinDays: Math.max(0, Number(week.consecutiveProteinDays) || 0),
      weekendDinnersWithoutProtein: Math.max(
        0,
        Number(week.weekendDinnersWithoutProtein) || 0
      ),
      topRepeatedMealTitles: Array.isArray(week.topRepeatedMealTitles)
        ? week.topRepeatedMealTitles.map(String).slice(0, 3)
        : []
    }
  };
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
          error: "Análisis nutricional disponible solo para Premium.",
          code: "PREMIUM_REQUIRED"
        },
        403
      );
    }

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const context = parseContext(body);
    if (!context) {
      return jsonResponse(
        { error: "Contexto de plan inválido.", code: "INVALID_CONTEXT" },
        400
      );
    }

    // Si el cliente no mandó nombre, intenta full_name del perfil.
    if (!context.firstName) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const fromProfile = profile?.full_name?.trim().split(/\s+/).filter(Boolean)[0];
      if (fromProfile) {
        context.firstName = fromProfile;
      }
    }

    const { report, source } = await generateIntelligentDoseReport(context, {
      userId: user.id
    });

    return jsonResponse({
      ok: true,
      source,
      report,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[intelligent-dose]", error);
    return jsonResponse({ error: "Error generando informe.", code: "UNEXPECTED" }, 500);
  }
}
