import type { PlanMeal } from "@/components/plan/plan-meal-card";
import { MEAL_TYPES } from "@/lib/plan/constants";
import type { PlanDay } from "@/lib/plan/types";
import type { UserNutritionGoals } from "@/lib/nutrition/nutrition-profile";
import { preferredDietLabel } from "@/lib/nutrition/preferred-diet";

/** Tolerancia ±15 % frente al objetivo diario. */
export const WEEKLY_TARGET_TOLERANCE = 0.15;

export type WeeklyNutritionDayBreakdown = {
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  mealCount: number;
  hasVegetables: boolean;
  hasProtein: boolean;
  calorieStatus: "low" | "on_target" | "high" | "empty";
};

export type WeeklyNutritionBasis = "consumed" | "planned";

export type WeeklyNutritionRecommendation = {
  id: string;
  tone: "highlight" | "improve" | "action";
  /** Clave i18n bajo Hoy (weeklyReportRec*). */
  messageKey: string;
  values?: Record<string, string | number>;
};

export type WeeklyNutritionReport = {
  weekStartISO: string;
  basis: WeeklyNutritionBasis;
  daysTracked: number;
  daysWithMeals: number;
  daysOnCalorieTarget: number;
  daysWithVegetables: number;
  daysWithProtein: number;
  totalKcal: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
  avgDailyKcal: number;
  avgDailyProteinGrams: number;
  avgDailyCarbsGrams: number;
  avgDailyFatGrams: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  goalsComplete: boolean;
  preferredDietLabel: string;
  calorieAdherencePercent: number | null;
  proteinAdherencePercent: number | null;
  dayBreakdown: WeeklyNutritionDayBreakdown[];
  recommendations: WeeklyNutritionRecommendation[];
};

function classifyCalorieDay(
  kcal: number,
  mealCount: number,
  calorieTarget: number
): WeeklyNutritionDayBreakdown["calorieStatus"] {
  if (mealCount <= 0 || kcal <= 0) return "empty";
  const low = calorieTarget * (1 - WEEKLY_TARGET_TOLERANCE);
  const high = calorieTarget * (1 + WEEKLY_TARGET_TOLERANCE);
  if (kcal < low) return "low";
  if (kcal > high) return "high";
  return "on_target";
}

function sumDayMacros(
  day: PlanDay,
  basis: WeeklyNutritionBasis
): {
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  mealCount: number;
  hasVegetables: boolean;
  hasProtein: boolean;
} {
  const meals: PlanMeal[] = MEAL_TYPES.flatMap((type) => day.slots[type] ?? []);
  const selected =
    basis === "consumed" ? meals.filter((meal) => Boolean(meal.consumido)) : meals;

  const snackKcal = day.snacks.reduce((sum, snack) => sum + (snack.kcal ?? 0), 0);
  const snackProtein = day.snacks.reduce(
    (sum, snack) => sum + (snack.proteinGrams ?? 0),
    0
  );
  const snackCarbs = day.snacks.reduce((sum, snack) => sum + (snack.carbsGrams ?? 0), 0);
  const snackFat = day.snacks.reduce((sum, snack) => sum + (snack.fatGrams ?? 0), 0);

  const mealKcal = selected.reduce((sum, meal) => sum + (meal.kcal ?? 0), 0);
  const mealProtein = selected.reduce((sum, meal) => sum + (meal.proteinGrams ?? 0), 0);
  const mealCarbs = selected.reduce((sum, meal) => sum + (meal.carbsGrams ?? 0), 0);
  const mealFat = selected.reduce((sum, meal) => sum + (meal.fatGrams ?? 0), 0);

  const includeSnacks = basis === "planned" || selected.length > 0 || day.snacks.length > 0;
  // En modo consumido: snacks cuentan siempre (son registros); platos solo si «Ya comí».
  const snacksKcal = includeSnacks ? snackKcal : 0;
  const snacksP = includeSnacks ? snackProtein : 0;
  const snacksC = includeSnacks ? snackCarbs : 0;
  const snacksF = includeSnacks ? snackFat : 0;

  const mealCount = selected.length + (includeSnacks ? day.snacks.length : 0);

  return {
    kcal: mealKcal + snacksKcal,
    proteinGrams: mealProtein + snacksP,
    carbsGrams: mealCarbs + snacksC,
    fatGrams: mealFat + snacksF,
    mealCount,
    hasVegetables: selected.some((meal) => Boolean(meal.hasVegetables)),
    hasProtein:
      selected.some((meal) => Boolean(meal.hasProtein)) || snacksP >= 12
  };
}

function countConsumedMeals(days: PlanDay[]): number {
  return days.reduce((sum, day) => {
    return (
      sum +
      MEAL_TYPES.reduce(
        (daySum, type) =>
          daySum + (day.slots[type] ?? []).filter((meal) => meal.consumido).length,
        0
      )
    );
  }, 0);
}

function buildRecommendations(input: {
  basis: WeeklyNutritionBasis;
  goalsComplete: boolean;
  daysWithMeals: number;
  daysOnCalorieTarget: number;
  daysWithVegetables: number;
  daysWithProtein: number;
  avgDailyKcal: number;
  avgDailyProteinGrams: number;
  calorieTarget: number;
  proteinTarget: number;
}): WeeklyNutritionRecommendation[] {
  const recs: WeeklyNutritionRecommendation[] = [];
  const {
    basis,
    goalsComplete,
    daysWithMeals,
    daysOnCalorieTarget,
    daysWithVegetables,
    daysWithProtein,
    avgDailyKcal,
    avgDailyProteinGrams,
    calorieTarget,
    proteinTarget
  } = input;

  if (!goalsComplete) {
    recs.push({
      id: "complete-goals",
      tone: "action",
      messageKey: "weeklyReportRecCompleteGoals"
    });
  }

  if (daysWithMeals === 0) {
    recs.push({
      id: "empty-week",
      tone: "action",
      messageKey: "weeklyReportRecEmptyWeek"
    });
    return recs;
  }

  if (basis === "planned") {
    recs.push({
      id: "basis-planned",
      tone: "highlight",
      messageKey: "weeklyReportRecBasisPlanned"
    });
  } else {
    recs.push({
      id: "basis-consumed",
      tone: "highlight",
      messageKey: "weeklyReportRecBasisConsumed"
    });
  }

  const calLow = calorieTarget * (1 - WEEKLY_TARGET_TOLERANCE);
  const calHigh = calorieTarget * (1 + WEEKLY_TARGET_TOLERANCE);

  if (avgDailyKcal > 0 && avgDailyKcal < calLow) {
    recs.push({
      id: "kcal-low",
      tone: "improve",
      messageKey: "weeklyReportRecKcalLow",
      values: {
        avg: Math.round(avgDailyKcal),
        target: calorieTarget
      }
    });
  } else if (avgDailyKcal > calHigh) {
    recs.push({
      id: "kcal-high",
      tone: "improve",
      messageKey: "weeklyReportRecKcalHigh",
      values: {
        avg: Math.round(avgDailyKcal),
        target: calorieTarget
      }
    });
  } else if (avgDailyKcal > 0) {
    recs.push({
      id: "kcal-ok",
      tone: "highlight",
      messageKey: "weeklyReportRecKcalOk",
      values: { avg: Math.round(avgDailyKcal), target: calorieTarget }
    });
  }

  const protLow = proteinTarget * (1 - WEEKLY_TARGET_TOLERANCE);
  if (avgDailyProteinGrams < protLow) {
    recs.push({
      id: "protein-low",
      tone: "improve",
      messageKey: "weeklyReportRecProteinLow",
      values: {
        avg: Math.round(avgDailyProteinGrams),
        target: proteinTarget
      }
    });
  } else if (avgDailyProteinGrams > 0) {
    recs.push({
      id: "protein-ok",
      tone: "highlight",
      messageKey: "weeklyReportRecProteinOk",
      values: {
        avg: Math.round(avgDailyProteinGrams),
        target: proteinTarget
      }
    });
  }

  if (daysWithMeals >= 3 && daysWithVegetables / daysWithMeals < 0.5) {
    recs.push({
      id: "veg-low",
      tone: "improve",
      messageKey: "weeklyReportRecVegLow",
      values: { days: daysWithVegetables, tracked: daysWithMeals }
    });
  }

  if (daysWithMeals >= 3 && daysWithProtein / daysWithMeals < 0.5) {
    recs.push({
      id: "protein-days",
      tone: "improve",
      messageKey: "weeklyReportRecProteinDays",
      values: { days: daysWithProtein, tracked: daysWithMeals }
    });
  }

  if (daysWithMeals < 5) {
    recs.push({
      id: "fill-plan",
      tone: "action",
      messageKey: "weeklyReportRecFillPlan",
      values: { days: daysWithMeals }
    });
  } else if (daysOnCalorieTarget < Math.ceil(daysWithMeals * 0.4)) {
    recs.push({
      id: "balance-days",
      tone: "action",
      messageKey: "weeklyReportRecBalanceDays",
      values: { onTarget: daysOnCalorieTarget, tracked: daysWithMeals }
    });
  }

  // Máximo 5 recomendaciones para no saturar.
  return recs.slice(0, 5);
}

/**
 * Informe nutricional de la semana frente a objetivos del perfil.
 * Usa platos marcados «Ya comí» si hay al menos uno; si no, el plan completo.
 */
export function buildWeeklyNutritionReport(
  days: PlanDay[],
  goals: UserNutritionGoals,
  weekStartISO: string
): WeeklyNutritionReport {
  const consumedCount = countConsumedMeals(days);
  const basis: WeeklyNutritionBasis = consumedCount > 0 ? "consumed" : "planned";

  const dayBreakdown: WeeklyNutritionDayBreakdown[] = days.map((day) => {
    const macros = sumDayMacros(day, basis);
    return {
      dayLabel: day.label,
      dateLabel: day.dateLabel,
      isToday: Boolean(day.isToday),
      kcal: Math.round(macros.kcal),
      proteinGrams: Math.round(macros.proteinGrams),
      carbsGrams: Math.round(macros.carbsGrams),
      fatGrams: Math.round(macros.fatGrams),
      mealCount: macros.mealCount,
      hasVegetables: macros.hasVegetables,
      hasProtein: macros.hasProtein,
      calorieStatus: classifyCalorieDay(
        macros.kcal,
        macros.mealCount,
        goals.calorieTarget
      )
    };
  });

  const activeDays = dayBreakdown.filter((day) => day.mealCount > 0);
  const daysWithMeals = activeDays.length;
  const totalKcal = activeDays.reduce((sum, day) => sum + day.kcal, 0);
  const totalProteinGrams = activeDays.reduce((sum, day) => sum + day.proteinGrams, 0);
  const totalCarbsGrams = activeDays.reduce((sum, day) => sum + day.carbsGrams, 0);
  const totalFatGrams = activeDays.reduce((sum, day) => sum + day.fatGrams, 0);

  const avgDailyKcal = daysWithMeals > 0 ? totalKcal / daysWithMeals : 0;
  const avgDailyProteinGrams =
    daysWithMeals > 0 ? totalProteinGrams / daysWithMeals : 0;
  const avgDailyCarbsGrams = daysWithMeals > 0 ? totalCarbsGrams / daysWithMeals : 0;
  const avgDailyFatGrams = daysWithMeals > 0 ? totalFatGrams / daysWithMeals : 0;

  const daysOnCalorieTarget = activeDays.filter(
    (day) => day.calorieStatus === "on_target"
  ).length;
  const daysWithVegetables = activeDays.filter((day) => day.hasVegetables).length;
  const daysWithProtein = activeDays.filter((day) => day.hasProtein).length;

  const calorieAdherencePercent =
    goals.calorieTarget > 0 && avgDailyKcal > 0
      ? Math.round((avgDailyKcal / goals.calorieTarget) * 100)
      : null;
  const proteinAdherencePercent =
    goals.proteinTarget > 0 && avgDailyProteinGrams > 0
      ? Math.round((avgDailyProteinGrams / goals.proteinTarget) * 100)
      : null;

  const recommendations = buildRecommendations({
    basis,
    goalsComplete: goals.isComplete,
    daysWithMeals,
    daysOnCalorieTarget,
    daysWithVegetables,
    daysWithProtein,
    avgDailyKcal,
    avgDailyProteinGrams,
    calorieTarget: goals.calorieTarget,
    proteinTarget: goals.proteinTarget
  });

  return {
    weekStartISO,
    basis,
    daysTracked: days.length,
    daysWithMeals,
    daysOnCalorieTarget,
    daysWithVegetables,
    daysWithProtein,
    totalKcal: Math.round(totalKcal),
    totalProteinGrams: Math.round(totalProteinGrams),
    totalCarbsGrams: Math.round(totalCarbsGrams),
    totalFatGrams: Math.round(totalFatGrams),
    avgDailyKcal: Math.round(avgDailyKcal),
    avgDailyProteinGrams: Math.round(avgDailyProteinGrams),
    avgDailyCarbsGrams: Math.round(avgDailyCarbsGrams),
    avgDailyFatGrams: Math.round(avgDailyFatGrams),
    calorieTarget: goals.calorieTarget,
    proteinTarget: goals.proteinTarget,
    carbsTarget: goals.carbsTarget,
    fatTarget: goals.fatTarget,
    goalsComplete: goals.isComplete,
    preferredDietLabel: preferredDietLabel(goals.preferredDiet),
    calorieAdherencePercent,
    proteinAdherencePercent,
    dayBreakdown,
    recommendations
  };
}
