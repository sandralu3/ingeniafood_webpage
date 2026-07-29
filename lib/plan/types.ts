import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import type { PlanSnack } from "@/lib/plan/snack-presets";

export type PlanDaySlots = Record<MealType, PlanMeal | null>;

export type PlanDayNutritionSummary = {
  totalKcal: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
  plannedMealCount: number;
  hasVegetables: boolean;
  hasProtein: boolean;
  hasProteinBreakfast: boolean;
};

export type PlanDay = {
  id: string;
  label: WeekDay;
  dateLabel: string;
  isToday?: boolean;
  slots: PlanDaySlots;
  snacks: PlanSnack[];
  nutrition: PlanDayNutritionSummary;
};
