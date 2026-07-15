import type { DailyChallenge } from "@/lib/gamification/challenges";
import { completeDailyChallenge } from "@/lib/gamification/challenge-service";
import type { DayPlanNutritionSummary } from "@/lib/plan/plan-nutrition";

export const PLAN_LINKED_CHALLENGE_IDS = {
  vegetables: "3",
  proteinBreakfast: "6"
} as const;

export async function syncPlanLinkedChallenges(params: {
  userId: string;
  activeChallenges: DailyChallenge[];
  todayCompletedIds: string[];
  planNutrition: DayPlanNutritionSummary;
}): Promise<string[]> {
  const activeById = new Map(params.activeChallenges.map((challenge) => [challenge.id, challenge]));
  const completedIds = new Set(params.todayCompletedIds);
  const newlyCompleted: string[] = [];

  const candidates: Array<{ retoId: string; qualifies: boolean }> = [
    {
      retoId: PLAN_LINKED_CHALLENGE_IDS.vegetables,
      qualifies: params.planNutrition.hasVegetables
    },
    {
      retoId: PLAN_LINKED_CHALLENGE_IDS.proteinBreakfast,
      qualifies: params.planNutrition.hasProteinBreakfast
    }
  ];

  for (const candidate of candidates) {
    if (!candidate.qualifies || completedIds.has(candidate.retoId)) continue;

    const challenge = activeById.get(candidate.retoId);
    if (!challenge) continue;

    await completeDailyChallenge({
      userId: params.userId,
      retoId: candidate.retoId,
      points: challenge.points
    });

    completedIds.add(candidate.retoId);
    newlyCompleted.push(candidate.retoId);
  }

  return newlyCompleted;
}
