import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { PlanDay } from "@/lib/plan/types";
import { MEAL_TYPES, type WeekDay } from "@/lib/plan/constants";
import { isLikelyLiquidMealTitle } from "@/lib/plan/plan-nutrition";
import type { PlanSnack } from "@/lib/plan/snack-presets";
import type { DoseSuggestedRecipe } from "@/lib/premium-stories/dose-suggested-recipe";
import {
  getMondayOfWeek,
  getWeekDayFromDate,
  toISODateString
} from "@/lib/plan/week-utils";

/** Umbral de menú incompleto / bajo aporte energético. */
export const LOW_CALORIE_DAY_THRESHOLD = 800;
/** Proteína del día considerada significativa (gramos). */
export const SIGNIFICANT_DAY_PROTEIN_G = 20;
/** Proteína por plato considerada significativa (gramos). */
export const SIGNIFICANT_MEAL_PROTEIN_G = 12;

export const SNACK_MEAL_TYPE_LABEL = "Snack";

export type IntelligentDoseDish = {
  mealType: string;
  title: string;
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  ingredientNames: string[];
  isLikelyLiquidOnly: boolean;
};

export type IntelligentDoseMealSnapshot = {
  mealCount: number;
  /** Alias histórico; igual a totalCalories. */
  totalKcal: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  /** Verdura significativa en comida sólida (no hierbas de infusión). */
  hasVegetables: boolean;
  /** Proteína significativa en comida sólida. */
  hasProtein: boolean;
  mealTitles: string[];
  mealTypesFilled: string[];
  dishes: IntelligentDoseDish[];
  ingredientNames: string[];
  isLowCalorieDay: boolean;
  isLikelyLiquidOnly: boolean;
  isIncompleteMenu: boolean;
};

export type IntelligentDoseWeeklyStats = {
  daysWithAnyMeal: number;
  daysTracked: number;
  daysWithVegetables: number;
  daysWithProtein: number;
  totalMealsPlanned: number;
  planCompletionPercent: number;
  /** Media de kcal en días con al menos 1 comida. */
  avgDailyKcal: number;
  /** Días seguidos con vegetales hasta hoy (o 0). */
  consecutiveVegetableDays: number;
  /** Días seguidos con proteína hasta hoy (o 0). */
  consecutiveProteinDays: number;
  /** Cenas de fin de semana (Sáb/Dom) sin proteína clara. */
  weekendDinnersWithoutProtein: number;
  /** Títulos de platos más repetidos esta semana. */
  topRepeatedMealTitles: string[];
};

export type IntelligentDoseNutritionGoals = {
  isComplete: boolean;
  calorieTarget: number;
  proteinTarget: number;
  source: "profile" | "default";
  bmr: number | null;
  tdee: number | null;
};

export type IntelligentDoseUserContext = {
  dateKey: string;
  /** Nombre de pila para personalizar el tono. */
  firstName: string | null;
  mealsPlannedToday: IntelligentDoseMealSnapshot;
  mealsPlannedYesterday: IntelligentDoseMealSnapshot;
  weeklyStats: IntelligentDoseWeeklyStats;
  /** Metas calóricas/proteicas (perfil o default). */
  nutritionGoals: IntelligentDoseNutritionGoals;
};

export type IntelligentDoseReport = {
  hasPlanData: boolean;
  previewHeadline: string;
  highlight: string;
  improve: string;
  action: string;
  /** Sugerencia estructurada para abrir el generador de recetas. */
  suggestedRecipe?: DoseSuggestedRecipe | null;
};

function emptyMealSnapshot(): IntelligentDoseMealSnapshot {
  return {
    mealCount: 0,
    totalKcal: 0,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    hasVegetables: false,
    hasProtein: false,
    mealTitles: [],
    mealTypesFilled: [],
    dishes: [],
    ingredientNames: [],
    isLowCalorieDay: true,
    isLikelyLiquidOnly: false,
    isIncompleteMenu: true
  };
}

function buildDishFromMeal(
  mealType: string,
  meal: PlanMeal
): IntelligentDoseDish {
  const title = meal.title?.trim() || "Sin título";
  const liquid = isLikelyLiquidMealTitle(title);

  return {
    mealType,
    title,
    kcal: Math.max(0, Math.round(meal.kcal ?? 0)),
    proteinGrams: Math.max(0, Math.round(meal.proteinGrams ?? 0)),
    carbsGrams: Math.max(0, Math.round(meal.carbsGrams ?? 0)),
    fatGrams: Math.max(0, Math.round(meal.fatGrams ?? 0)),
    ingredientNames: Array.isArray(meal.ingredientNames)
      ? meal.ingredientNames.map(String).slice(0, 16)
      : [],
    isLikelyLiquidOnly: liquid
  };
}

function buildDishFromSnack(snack: PlanSnack): IntelligentDoseDish {
  const title = snack.title?.trim() || "Snack";
  const displayTitle = snack.emoji?.trim() ? `${snack.emoji.trim()} ${title}` : title;
  return {
    mealType: SNACK_MEAL_TYPE_LABEL,
    title: displayTitle,
    kcal: Math.max(0, Math.round(snack.kcal ?? 0)),
    proteinGrams: Math.max(0, Math.round(snack.proteinGrams ?? 0)),
    carbsGrams: Math.max(0, Math.round(snack.carbsGrams ?? 0)),
    fatGrams: Math.max(0, Math.round(snack.fatGrams ?? 0)),
    ingredientNames: [],
    isLikelyLiquidOnly: isLikelyLiquidMealTitle(title)
  };
}

function resolveLowCalorieThreshold(calorieTarget?: number | null): number {
  if (typeof calorieTarget === "number" && calorieTarget > 0) {
    // <60% de la meta personalizada (con suelo absoluto de seguridad).
    return Math.max(LOW_CALORIE_DAY_THRESHOLD * 0.75, Math.round(calorieTarget * 0.6));
  }
  return LOW_CALORIE_DAY_THRESHOLD;
}

function finalizeSnapshot(
  partial: {
    dishes: IntelligentDoseDish[];
    mealTypesFilled: string[];
    hasVegetables: boolean;
    hasProtein: boolean;
    /** Solo Desayuno/Almuerzo/Cena; los snacks no completan el menú principal. */
    mainMealCount: number;
  },
  calorieTarget?: number | null
): IntelligentDoseMealSnapshot {
  const { dishes, mealTypesFilled, hasVegetables, hasProtein, mainMealCount } = partial;
  const totalCalories = dishes.reduce((sum, d) => sum + d.kcal, 0);
  const totalProtein = dishes.reduce((sum, d) => sum + d.proteinGrams, 0);
  const totalCarbs = dishes.reduce((sum, d) => sum + d.carbsGrams, 0);
  const totalFat = dishes.reduce((sum, d) => sum + d.fatGrams, 0);
  const ingredientNames = Array.from(
    new Set(
      dishes
        .flatMap((d) => d.ingredientNames)
        .map((n) => n.trim())
        .filter(Boolean)
    )
  ).slice(0, 40);

  const solidDishes = dishes.filter((d) => !d.isLikelyLiquidOnly);
  const isLikelyLiquidOnly = dishes.length > 0 && solidDishes.length === 0;
  const isLowCalorieDay =
    totalCalories < resolveLowCalorieThreshold(calorieTarget);

  const proteinFromGrams =
    totalProtein >= SIGNIFICANT_DAY_PROTEIN_G ||
    solidDishes.some((d) => d.proteinGrams >= SIGNIFICANT_MEAL_PROTEIN_G);

  const significantProtein =
    !isLikelyLiquidOnly && (proteinFromGrams || (!isLowCalorieDay && hasProtein));
  const significantVegetables = !isLikelyLiquidOnly && hasVegetables;

  return {
    mealCount: mainMealCount,
    totalKcal: totalCalories,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    hasVegetables: significantVegetables,
    hasProtein: significantProtein,
    mealTitles: dishes.map((d) => d.title).slice(0, 8),
    mealTypesFilled,
    dishes,
    ingredientNames,
    isLowCalorieDay,
    isLikelyLiquidOnly,
    isIncompleteMenu:
      mainMealCount === 0 ||
      mainMealCount < 3 ||
      isLowCalorieDay ||
      isLikelyLiquidOnly
  };
}

function snapshotFromPlanDay(
  day: PlanDay | null | undefined,
  calorieTarget?: number | null
): IntelligentDoseMealSnapshot {
  if (!day) return emptyMealSnapshot();

  const dishes: IntelligentDoseDish[] = [];
  const filled: string[] = [];
  let hasVegetablesFromMeals = false;
  let hasProteinFromMeals = false;

  for (const mealType of MEAL_TYPES) {
    const meals = day.slots[mealType] ?? [];
    if (meals.length === 0) continue;
    filled.push(mealType);
    for (const meal of meals) {
      const dish = buildDishFromMeal(mealType, meal);
      dishes.push(dish);
      if (!dish.isLikelyLiquidOnly && meal.hasVegetables) {
        hasVegetablesFromMeals = true;
      }
      if (!dish.isLikelyLiquidOnly && meal.hasProtein) {
        hasProteinFromMeals = true;
      }
    }
  }

  const mainMealCount = dishes.length;

  for (const snack of day.snacks ?? []) {
    dishes.push(buildDishFromSnack(snack));
  }

  return finalizeSnapshot(
    {
      dishes,
      mealTypesFilled: filled,
      hasVegetables: hasVegetablesFromMeals,
      hasProtein: hasProteinFromMeals,
      mainMealCount
    },
    calorieTarget
  );
}

/**
 * Hechos explícitos para el prompt / fallback: nunca inventar macros no respaldados.
 */
export function buildNutritionFactsForPrompt(context: IntelligentDoseUserContext): string {
  const today = context.mealsPlannedToday;
  const dishesBlock =
    today.dishes.length === 0
      ? "- (sin platos registrados hoy)"
      : today.dishes
          .map((d) => {
            const ings =
              d.ingredientNames.length > 0
                ? d.ingredientNames.slice(0, 8).join(", ")
                : "sin ingredientes listados";
            return `- ${d.mealType}: "${d.title}" | ${d.kcal} kcal | P ${d.proteinGrams}g / C ${d.carbsGrams}g / G ${d.fatGrams}g | líquido=${d.isLikelyLiquidOnly} | ingredientes: ${ings}`;
          })
          .join("\n");

  const goals = context.nutritionGoals;
  const targetBlock = goals
    ? `- calorieTarget: ${goals.calorieTarget} kcal (source=${goals.source}, profileComplete=${goals.isComplete})${
        goals.tdee != null ? `; TDEE≈${goals.tdee}; BMR≈${goals.bmr}` : ""
      }
- proteinTarget: ${goals.proteinTarget} g`
    : `- calorieTarget: default`;

  return `HECHOS NUTRICIONALES REALES DE HOY (fuente de verdad; no inventes fuera de esto):
- totalCalories: ${today.totalCalories} kcal
- totalProtein: ${today.totalProtein} g
- totalCarbs: ${today.totalCarbs} g
- totalFat: ${today.totalFat} g
- mealCount (comidas principales): ${today.mealCount}
- snackCount: ${today.dishes.filter((d) => d.mealType === SNACK_MEAL_TYPE_LABEL).length}
- hasSignificantProtein: ${today.hasProtein}
- hasSignificantVegetables: ${today.hasVegetables}
- isLowCalorieDay: ${today.isLowCalorieDay}
- isLikelyLiquidOnly (infusiones/bebidas): ${today.isLikelyLiquidOnly}
- isIncompleteMenu: ${today.isIncompleteMenu}
${targetBlock}
PLATILLOS DE HOY (incluye snacks si los hay; suman a totalCalories/totalProtein):
${dishesBlock}`;
}

/** Empareja días del plan semanal con fechas ISO a partir del lunes de esa semana. */
export function indexPlanDaysByIso(days: PlanDay[], weekStartIso: string): Map<string, PlanDay> {
  const map = new Map<string, PlanDay>();
  const monday = new Date(`${weekStartIso}T12:00:00`);
  if (Number.isNaN(monday.getTime())) return map;

  const byLabel = new Map(days.map((day) => [day.label, day]));
  const labels = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo"
  ] as const;

  labels.forEach((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const iso = toISODateString(date);
    const day = byLabel.get(label);
    if (day) map.set(iso, day);
  });

  return map;
}

function countConsecutiveFlag(
  planDaysByIso: Map<string, PlanDay>,
  today: Date,
  flag: "hasVegetables" | "hasProtein"
): number {
  let count = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const snap = snapshotFromPlanDay(planDaysByIso.get(toISODateString(d)));
    if (snap.mealCount === 0 || !snap[flag]) break;
    count += 1;
  }
  return count;
}

function isWeekend(weekDay: WeekDay): boolean {
  return weekDay === "Sábado" || weekDay === "Domingo";
}

export function buildIntelligentDoseUserContext(params: {
  planDaysByIso: Map<string, PlanDay>;
  todayIso?: string;
  firstName?: string | null;
  nutritionGoals?: IntelligentDoseNutritionGoals | null;
}): IntelligentDoseUserContext {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayIso = params.todayIso ?? toISODateString(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = toISODateString(yesterday);

  const nutritionGoals: IntelligentDoseNutritionGoals = params.nutritionGoals ?? {
    isComplete: false,
    calorieTarget: 2000,
    proteinTarget: 90,
    source: "default",
    bmr: null,
    tdee: null
  };
  const calorieTarget = nutritionGoals.calorieTarget;

  const mealsPlannedToday = snapshotFromPlanDay(
    params.planDaysByIso.get(todayIso),
    calorieTarget
  );
  const mealsPlannedYesterday = snapshotFromPlanDay(
    params.planDaysByIso.get(yesterdayIso),
    calorieTarget
  );

  let daysWithAnyMeal = 0;
  let daysWithVegetables = 0;
  let daysWithProtein = 0;
  let totalMealsPlanned = 0;
  let kcalSum = 0;
  let weekendDinnersWithoutProtein = 0;
  const titleCounts = new Map<string, number>();

  for (let offset = 0; offset < 7; offset += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const iso = toISODateString(d);
    const day = params.planDaysByIso.get(iso);
    const snap = snapshotFromPlanDay(day, calorieTarget);
    const weekDay = getWeekDayFromDate(d);

    if (snap.mealCount > 0 || snap.totalCalories > 0) {
      daysWithAnyMeal += 1;
      totalMealsPlanned += snap.mealCount;
      kcalSum += snap.totalCalories;
    }
    if (snap.hasVegetables) daysWithVegetables += 1;
    if (snap.hasProtein) daysWithProtein += 1;

    if (
      isWeekend(weekDay) &&
      day?.slots.Cena?.length &&
      !day.slots.Cena.some((meal) => meal.hasProtein)
    ) {
      weekendDinnersWithoutProtein += 1;
    }

    for (const title of snap.mealTitles) {
      const key = title.trim().toLowerCase();
      if (!key) continue;
      titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
    }
  }

  const topRepeatedMealTitles = Array.from(titleCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title]) => title);

  const daysTracked = 7;
  const firstName = params.firstName?.trim().split(/\s+/).filter(Boolean)[0] || null;

  return {
    dateKey: todayIso,
    firstName,
    mealsPlannedToday,
    mealsPlannedYesterday,
    nutritionGoals,
    weeklyStats: {
      daysWithAnyMeal,
      daysTracked,
      daysWithVegetables,
      daysWithProtein,
      totalMealsPlanned,
      planCompletionPercent: Math.round((daysWithAnyMeal / daysTracked) * 100),
      avgDailyKcal:
        daysWithAnyMeal > 0 ? Math.round(kcalSum / daysWithAnyMeal) : 0,
      consecutiveVegetableDays: countConsecutiveFlag(
        params.planDaysByIso,
        today,
        "hasVegetables"
      ),
      consecutiveProteinDays: countConsecutiveFlag(
        params.planDaysByIso,
        today,
        "hasProtein"
      ),
      weekendDinnersWithoutProtein,
      topRepeatedMealTitles
    }
  };
}

export function mondayIsosForDoseWindow(today = new Date()): string[] {
  const todayNoon = new Date(today);
  todayNoon.setHours(12, 0, 0, 0);
  const yesterday = new Date(todayNoon);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(todayNoon);
  weekAgo.setDate(weekAgo.getDate() - 6);

  return Array.from(
    new Set([
      toISODateString(getMondayOfWeek(todayNoon)),
      toISODateString(getMondayOfWeek(yesterday)),
      toISODateString(getMondayOfWeek(weekAgo))
    ])
  );
}

export function addressName(firstName: string | null | undefined): string {
  const name = firstName?.trim();
  return name ? name : "tú";
}
