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
  hasVegetables: boolean;
  hasProtein: boolean;
};

export type DayPlanNutritionSummary = {
  totalKcal: number;
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
};

const PROTEIN_TAG_PATTERN = /alto en prote/i;
const VEGETABLE_TITLE_PATTERN = /veget|verdura|ensalada|brocoli|espinaca|calabac|coliflor|acelga|pimiento|zanahoria/i;
const PROTEIN_TITLE_PATTERN = /pollo|huevo|salmon|atun|pescado|ternera|prote|pechuga|yogur|queso/i;
const PROTEIN_THRESHOLD_G = 12;

const PROTEIN_CATEGORIES = new Set(["proteinas", "frios"]);

function resolveRecipeMacros(input: PlanRecipeNutritionInput): RecipeMacros | null {
  const parsed = parseMacrosFromJson(input.macros ?? null);
  if (parsed) return parsed;

  const ingredientCount = normalizeIngredientsJson(input.ingredients ?? []).length;
  if (ingredientCount === 0) return null;

  return estimateRecipeMacrosFromContent(ingredientCount);
}

export function analyzePlanRecipeNutrition(input: PlanRecipeNutritionInput): PlanMealNutritionProfile {
  const macros = resolveRecipeMacros(input);
  const ingredients = normalizeIngredientsJson(input.ingredients ?? []);
  const tags = resolveRecipeTags(input);
  const title = input.title?.toLowerCase() ?? "";

  let hasVegetables = VEGETABLE_TITLE_PATTERN.test(title);
  let hasProtein = PROTEIN_TITLE_PATTERN.test(title) || tags.some((tag) => PROTEIN_TAG_PATTERN.test(tag));

  for (const ingredient of ingredients) {
    const category = categorizeShoppingIngredient(ingredient.name);
    if (category === "verduras_frutas") hasVegetables = true;
    if (PROTEIN_CATEGORIES.has(category)) hasProtein = true;
    if (/huevo|clara|yogur|reques|atun|salmon|pollo|ternera|cerdo|pavo|lenteja|garbanzo|tofu|tempeh|seitan|prote/i.test(ingredient.name)) {
      hasProtein = true;
    }
  }

  if (macros && macros.proteinas_g >= PROTEIN_THRESHOLD_G) {
    hasProtein = true;
  }

  return {
    kcal: macros?.calorias ?? null,
    proteinGrams: macros?.proteinas_g ?? null,
    hasVegetables,
    hasProtein
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
        hasProtein: Boolean(meal.hasProtein)
      }
    ];
  });
}

export const EMPTY_DAY_PLAN_NUTRITION: DayPlanNutritionSummary = {
  totalKcal: 0,
  plannedMealCount: 0,
  hasVegetables: false,
  hasProtein: false,
  hasProteinBreakfast: false
};
