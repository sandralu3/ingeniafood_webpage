import type { DailyChallenge } from "@/lib/gamification/challenges";

export type NutritionImpactMetrics = {
  hydration: number;
  vegetables: number;
  protein: number;
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
  completedIds: string[]
): NutritionImpactMetrics {
  const completedSet = new Set(completedIds);
  const fallbackRatio =
    challenges.length === 0 ? 0 : completedSet.size / challenges.length;

  return {
    hydration: categoryProgress(challenges, completedSet, HYDRATION_PATTERN, fallbackRatio),
    vegetables: categoryProgress(challenges, completedSet, VEGETABLES_PATTERN, fallbackRatio),
    protein: categoryProgress(challenges, completedSet, PROTEIN_PATTERN, fallbackRatio)
  };
}
