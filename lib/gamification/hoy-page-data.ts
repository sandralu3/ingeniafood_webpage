import type { DailyChallenge } from "@/lib/gamification/challenges";
import {
  fetchActiveDailyChallengesForUser,
  fetchAllChallengesForUser,
  fetchCompletionsInRange,
  fetchTodayCompletedChallengeIds
} from "@/lib/gamification/challenge-service";
import { calculateWeeklyHealthMetrics, type WeeklyHealthMetrics } from "@/lib/gamification/weekly-metrics";
import { getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";

export type HoyPageData = {
  userId: string;
  fetchedAt: string;
  metrics: WeeklyHealthMetrics;
  activeChallenges: DailyChallenge[];
  allChallenges: DailyChallenge[];
  todayCompletedIds: string[];
  weekCompletions: Array<{ reto_id: string; completado_at: string }>;
};

type InflightRequest = {
  userId: string;
  promise: Promise<HoyPageData>;
};

let inflightRequest: InflightRequest | null = null;

export async function fetchHoyPageData(
  userId: string,
  options?: { force?: boolean }
): Promise<HoyPageData> {
  if (!options?.force && inflightRequest?.userId === userId) {
    return inflightRequest.promise;
  }

  const promise = loadHoyPageData(userId);
  inflightRequest = { userId, promise };

  try {
    return await promise;
  } finally {
    if (inflightRequest?.promise === promise) {
      inflightRequest = null;
    }
  }
}

async function loadHoyPageData(userId: string): Promise<HoyPageData> {
  const today = toISODateString(new Date());
  const weekStart = toISODateString(getMondayOfWeek());
  const streakLookbackDate = toISODateString(
    new Date(new Date(`${today}T12:00:00`).setDate(new Date(`${today}T12:00:00`).getDate() - 30))
  );

  const [
    activeChallenges,
    allChallenges,
    todayCompletedIds,
    weekCompletions,
    streakCompletions
  ] = await Promise.all([
    fetchActiveDailyChallengesForUser(userId),
    fetchAllChallengesForUser(userId),
    fetchTodayCompletedChallengeIds(userId),
    fetchCompletionsInRange(userId, weekStart, today),
    fetchCompletionsInRange(userId, streakLookbackDate, today)
  ]);

  const metrics = calculateWeeklyHealthMetrics({
    activeChallenges,
    allChallenges,
    weekCompletions,
    streakCompletions,
    todayCompletedIds,
    today
  });

  return {
    userId,
    fetchedAt: new Date().toISOString(),
    metrics,
    activeChallenges,
    allChallenges,
    todayCompletedIds,
    weekCompletions
  };
}
