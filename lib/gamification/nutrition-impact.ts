import type { DailyChallenge } from "@/lib/gamification/challenges";
import type { DayPlanNutritionSummary } from "@/lib/plan/plan-nutrition";

export type NutritionImpactMetrics = {
  hydration: number;
  vegetables: number;
  protein: number;
  totalKcal: number;
  plannedMealCount: number;
  planHasVegetables: boolean;
  planHasProtein: boolean;
};

const HYDRATION_PATTERN = /agua|hidrat|líquid/i;
const VEGETABLES_PATTERN = /vegetal|verdura|ensalada|fibra/i;
const PROTEIN_PATTERN = /proteín|protein|huevo|desayun/i;

function categoryProgress(
  challenges: DailyChallenge[],
  completedIds: Set<string>,
  pattern: RegExp,
  fallbackRatio: number
): number {
  const matching = challenges.filter((challenge) => pattern.test(challenge.label));

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

  const hydration = categoryProgress(
    challenges,
    completedSet,
    HYDRATION_PATTERN,
    fallbackRatio
  );

  const challengeVegetables = categoryProgress(
    challenges,
    completedSet,
    VEGETABLES_PATTERN,
    fallbackRatio
  );
  const challengeProtein = categoryProgress(
    challenges,
    completedSet,
    PROTEIN_PATTERN,
    fallbackRatio
  );

  return {
    hydration,
    vegetables: planNutrition.hasVegetables ? 100 : challengeVegetables,
    protein: planNutrition.hasProtein ? 100 : challengeProtein,
    totalKcal: planNutrition.totalKcal,
    plannedMealCount: planNutrition.plannedMealCount,
    planHasVegetables: planNutrition.hasVegetables,
    planHasProtein: planNutrition.hasProtein
  };
}
