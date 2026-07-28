import type { DayPlanNutritionSummary } from "@/lib/plan/plan-nutrition";

export type NutritionImpactMetrics = {
  vegetables: number;
  protein: number;
  totalKcal: number;
  plannedMealCount: number;
  planHasVegetables: boolean;
  planHasProteinBreakfast: boolean;
};

export function calculateNutritionImpact(
  planNutrition: DayPlanNutritionSummary
): NutritionImpactMetrics {
  return {
    vegetables: planNutrition.hasVegetables ? 100 : 0,
    protein: planNutrition.hasProteinBreakfast ? 100 : 0,
    totalKcal: planNutrition.totalKcal,
    plannedMealCount: planNutrition.plannedMealCount,
    planHasVegetables: planNutrition.hasVegetables,
    planHasProteinBreakfast: planNutrition.hasProteinBreakfast
  };
}
