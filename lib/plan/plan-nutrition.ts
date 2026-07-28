import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { MealType } from "@/lib/plan/constants";
import { MEAL_TYPES } from "@/lib/plan/constants";
import type { PlanDaySlots } from "@/lib/plan/types";
import { categorizeShoppingIngredient } from "@/lib/plan/shopping-list-categories";
import {
  estimateRecipeMacrosFromContent,
  parseMacrosFromJson,
  type RecipeMacros
} from "@/lib/recipes/recipe-macros";
import { resolveRecipeTags } from "@/lib/recipes/recipe-tags";
import { normalizeIngredientsJson } from "@/lib/recipes/structured-ingredients";
import type { Json } from "@/types/database.types";

export type PlanRecipeNutritionInput = {
  ingredients?: Json | null;
  macros?: Json | null;
  tags?: unknown;
  is_flourless?: boolean;
  is_airfryer?: boolean;
  title?: string;
};

export type PlanMealNutritionProfile = {
  kcal: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  ingredientNames: string[];
  hasVegetables: boolean;
  hasProtein: boolean;
  macrosAreEstimated: boolean;
  isLikelyLiquidOnly: boolean;
};

export type DayPlanNutritionSummary = {
  totalKcal: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
  plannedMealCount: number;
  hasVegetables: boolean;
  hasProtein: boolean;
  hasProteinBreakfast: boolean;
};

export type TodayPlanMealSummary = {
  mealType: MealType;
  title: string;
  kcal: number | null;
  hasVegetables: boolean;
  hasProtein: boolean;
  imageUrl: string | null;
  recipeId?: string | null;
};

const PROTEIN_TAG_PATTERN = /alto en prote/i;
const VEGETABLE_TITLE_PATTERN =
  /veget|verdura|ensalada|brocoli|espinaca|calabac|coliflor|acelga|pimiento|zanahoria/i;
const PROTEIN_TITLE_PATTERN =
  /pollo|huevo|salmon|atun|pescado|ternera|prote|pechuga|yogur|queso|lenteja|garbanzo|tofu/i;
const PROTEIN_INGREDIENT_PATTERN =
  /huevo|clara|yogur|reques|atun|salmon|pollo|ternera|cerdo|pavo|lenteja|garbanzo|tofu|tempeh|seitan|prote|pescado|caballa|sardina|queso|jam[oó]n/i;
const LIQUID_MEAL_PATTERN =
  /infusi[oó]n|tisana|t[eé]\b|t[eé]\s|caf[eé]|mate\b|caldo|consom[eé]|agua de|bebida|smoothie\b|batido\b|jugo\b|zumo\b/i;
/** Hierbas/condimentos que no cuentan como “verdura significativa”. */
const GARNISH_VEGETABLE_PATTERN =
  /cilantro|perejil|hierbabuena|menta|albahaca|oregano|or[eé]gano|laurel|tomillo|romero|especias?|semillas? de|lim[oó]n|lima|jengibre/i;
const PROTEIN_THRESHOLD_G = 12;
const PROTEIN_CATEGORIES = new Set(["proteinas", "frios"]);

function resolveRecipeMacros(input: PlanRecipeNutritionInput): {
  macros: RecipeMacros | null;
  estimated: boolean;
} {
  const parsed = parseMacrosFromJson(input.macros ?? null);
  if (parsed) return { macros: parsed, estimated: false };

  const ingredientCount = normalizeIngredientsJson(input.ingredients ?? []).length;
  if (ingredientCount === 0) return { macros: null, estimated: false };

  return {
    macros: estimateRecipeMacrosFromContent(ingredientCount),
    estimated: true
  };
}

export function isLikelyLiquidMealTitle(title: string): boolean {
  return LIQUID_MEAL_PATTERN.test(title.trim());
}

function hasSignificantVegetableIngredient(name: string): boolean {
  const category = categorizeShoppingIngredient(name);
  if (category !== "verduras_frutas") return false;
  return !GARNISH_VEGETABLE_PATTERN.test(name);
}

export function analyzePlanRecipeNutrition(input: PlanRecipeNutritionInput): PlanMealNutritionProfile {
  const { macros, estimated } = resolveRecipeMacros(input);
  const ingredients = normalizeIngredientsJson(input.ingredients ?? []);
  const ingredientNames = ingredients
    .map((item) => item.name.trim())
    .filter(Boolean)
    .slice(0, 24);
  const tags = resolveRecipeTags(input);
  const title = input.title?.trim() ?? "";
  const titleLower = title.toLowerCase();
  const liquidOnly = isLikelyLiquidMealTitle(title);

  let hasVegetables =
    !liquidOnly && VEGETABLE_TITLE_PATTERN.test(titleLower);
  let hasProtein =
    !liquidOnly &&
    (PROTEIN_TITLE_PATTERN.test(titleLower) ||
      tags.some((tag) => PROTEIN_TAG_PATTERN.test(tag)));

  if (!liquidOnly) {
    for (const ingredient of ingredients) {
      if (hasSignificantVegetableIngredient(ingredient.name)) {
        hasVegetables = true;
      }
      const category = categorizeShoppingIngredient(ingredient.name);
      if (PROTEIN_CATEGORIES.has(category) || PROTEIN_INGREDIENT_PATTERN.test(ingredient.name)) {
        hasProtein = true;
      }
    }
  }

  // Solo macros reales (no heurística) pueden marcar proteína por gramos.
  if (!estimated && macros && macros.proteinas_g >= PROTEIN_THRESHOLD_G && !liquidOnly) {
    hasProtein = true;
  }

  return {
    kcal: macros?.calorias ?? null,
    proteinGrams: estimated ? null : (macros?.proteinas_g ?? null),
    carbsGrams: estimated ? null : (macros?.carbohidratos_g ?? null),
    fatGrams: estimated ? null : (macros?.grasas_g ?? null),
    ingredientNames,
    hasVegetables,
    hasProtein,
    macrosAreEstimated: estimated,
    isLikelyLiquidOnly: liquidOnly
  };
}

export function enrichPlanMealWithNutrition(
  meal: Omit<PlanMeal, "kcal" | "prepMinutes" | "hasVegetables" | "hasProtein"> & {
    prepMinutes?: number;
    kcal?: number;
    hasVegetables?: boolean;
    hasProtein?: boolean;
  },
  recipeInput: PlanRecipeNutritionInput
): PlanMeal {
  const nutrition = analyzePlanRecipeNutrition({
    ...recipeInput,
    title: meal.title
  });

  return {
    ...meal,
    prepMinutes: meal.prepMinutes,
    kcal: nutrition.kcal ?? meal.kcal,
    proteinGrams: nutrition.proteinGrams ?? undefined,
    carbsGrams: nutrition.carbsGrams ?? undefined,
    fatGrams: nutrition.fatGrams ?? undefined,
    ingredientNames: nutrition.ingredientNames,
    hasVegetables: nutrition.hasVegetables,
    hasProtein: nutrition.hasProtein
  };
}

export function summarizeDayPlanNutrition(slots: PlanDaySlots): DayPlanNutritionSummary {
  const meals = MEAL_TYPES.flatMap((mealType) => {
    const meal = slots[mealType];
    return meal ? [{ mealType, meal }] : [];
  });

  return {
    totalKcal: meals.reduce((sum, entry) => sum + (entry.meal.kcal ?? 0), 0),
    totalProteinGrams: meals.reduce((sum, entry) => sum + (entry.meal.proteinGrams ?? 0), 0),
    totalCarbsGrams: meals.reduce((sum, entry) => sum + (entry.meal.carbsGrams ?? 0), 0),
    totalFatGrams: meals.reduce((sum, entry) => sum + (entry.meal.fatGrams ?? 0), 0),
    plannedMealCount: meals.length,
    hasVegetables: meals.some((entry) => entry.meal.hasVegetables),
    hasProtein: meals.some((entry) => entry.meal.hasProtein),
    hasProteinBreakfast: meals.some(
      (entry) => entry.mealType === "Desayuno" && entry.meal.hasProtein
    )
  };
}

export function buildTodayPlanMealSummaries(slots: PlanDaySlots): TodayPlanMealSummary[] {
  return MEAL_TYPES.flatMap((mealType) => {
    const meal = slots[mealType];
    if (!meal) return [];

    return [
      {
        mealType,
        title: meal.title,
        kcal: meal.kcal ?? null,
        hasVegetables: Boolean(meal.hasVegetables),
        hasProtein: Boolean(meal.hasProtein),
        imageUrl: meal.imageUrl?.trim() || null,
        recipeId: meal.recipeId ?? null
      }
    ];
  });
}

/** Tres slots del día (vacíos o con receta) para el menú visual de Hoy. */
export function buildTodayPlanMealSlots(
  slots: PlanDaySlots | null | undefined
): Array<{ mealType: MealType; meal: TodayPlanMealSummary | null }> {
  const filled = new Map(
    buildTodayPlanMealSummaries(slots ?? emptySlotsForNutrition()).map((meal) => [
      meal.mealType,
      meal
    ])
  );

  return MEAL_TYPES.map((mealType) => ({
    mealType,
    meal: filled.get(mealType) ?? null
  }));
}

function emptySlotsForNutrition(): PlanDaySlots {
  return { Desayuno: null, Almuerzo: null, Cena: null };
}

export const EMPTY_DAY_PLAN_NUTRITION: DayPlanNutritionSummary = {
  totalKcal: 0,
  totalProteinGrams: 0,
  totalCarbsGrams: 0,
  totalFatGrams: 0,
  plannedMealCount: 0,
  hasVegetables: false,
  hasProtein: false,
  hasProteinBreakfast: false
};
