import type { DailyChallenge } from "@/lib/gamification/challenges";
import type { DayPlanNutritionSummary } from "@/lib/plan/plan-nutrition";

export type NutritionImpactMetrics = {
  hydration: number;
  vegetables: number;
  protein: number;
  totalKcal: number;
  plannedMealCount: number;
  planHasVegetables: boolean;
  planHasProteinBreakfast: boolean;
};

const HYDRATION_PATTERN = /agua|hidrat|líquid/i;

function hydrationProgress(
  challenges: DailyChallenge[],
  completedIds: Set<string>,
  fallbackRatio: number
): number {
  const matching = challenges.filter((challenge) => HYDRATION_PATTERN.test(challenge.label));

  if (matching.length === 0) {
    return Math.round(fallbackRatio * 100);
  }

  const completed = matching.filter((challenge) => completedIds.has(challenge.id)).length;
  return Math.round((completed / matching.length) * 100);
}

export function calculateNutritionImpact(
  challenges: DailyChallenge[],
  completedIds: string[],
  planNutrition: DayPlanNutritionSummary
): NutritionImpactMetrics {
  const completedSet = new Set(completedIds);
  const fallbackRatio =
    challenges.length === 0 ? 0 : completedSet.size / challenges.length;

  return {
    hydration: hydrationProgress(challenges, completedSet, fallbackRatio),
    vegetables: planNutrition.hasVegetables ? 100 : 0,
    protein: planNutrition.hasProteinBreakfast ? 100 : 0,
    totalKcal: planNutrition.totalKcal,
    plannedMealCount: planNutrition.plannedMealCount,
    planHasVegetables: planNutrition.hasVegetables,
    planHasProteinBreakfast: planNutrition.hasProteinBreakfast
  };
}
