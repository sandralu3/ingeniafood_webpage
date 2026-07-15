import type { DailyChallenge } from "@/lib/gamification/challenges";
import { getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";

export type WeeklyHealthMetrics = {
  earnedPoints: number;
  maxPoints: number;
  percentage: number;
  completedToday: number;
  totalActiveChallenges: number;
  streakDays: number;
  activeDaysThisWeek: number;
};

type WeekCompletionRow = {
  reto_id: string;
  completado_at: string;
};

function getDaysElapsedInWeek(today = new Date()): number {
  const monday = getMondayOfWeek(today);
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const mondayStart = new Date(monday);
  mondayStart.setHours(0, 0, 0, 0);
  const diffMs = todayStart.getTime() - mondayStart.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function buildPointsMap(challenges: DailyChallenge[]): Map<string, number> {
  return new Map(challenges.map((challenge) => [challenge.id, challenge.points]));
}

function countActiveDaysInWeek(
  completions: WeekCompletionRow[],
  weekStart: string,
  today: string
): number {
  const days = new Set<string>();

  for (const row of completions) {
    if (row.completado_at >= weekStart && row.completado_at <= today) {
      days.add(row.completado_at);
    }
  }

  return days.size;
}

function getConsecutiveStreakDates(
  completions: Array<{ completado_at: string }>,
  today: string,
  lookbackDays = 30
): string[] {
  const daysWithActivity = new Set(completions.map((row) => row.completado_at));
  const cursor = new Date(`${today}T12:00:00`);

  // Si hoy aún no hay retos completados, la racha sigue viva hasta fin de día:
  // contamos desde el último día con actividad (normalmente ayer).
  if (!daysWithActivity.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  const streakDates: string[] = [];

  for (let index = 0; index < lookbackDays; index += 1) {
    const iso = toISODateString(cursor);
    if (!daysWithActivity.has(iso)) {
      break;
    }

    streakDates.push(iso);
    cursor.setDate(cursor.getDate() - 1);
  }

  return streakDates;
}

function calculateStreakDays(
  completions: Array<{ completado_at: string }>,
  today: string,
  lookbackDays = 30
): number {
  return getConsecutiveStreakDates(completions, today, lookbackDays).length;
}

export function getCurrentStreakDateSet(
  completions: Array<{ completado_at: string }>,
  today: string,
  lookbackDays = 30
): Set<string> {
  return new Set(
    getConsecutiveStreakDates(completions, today, lookbackDays)
  );
}

export function calculateWeeklyHealthMetrics(params: {
  activeChallenges: DailyChallenge[];
  allChallenges: DailyChallenge[];
  weekCompletions: WeekCompletionRow[];
  streakCompletions?: WeekCompletionRow[];
  todayCompletedIds: string[];
  today?: string;
}): WeeklyHealthMetrics {
  const today = params.today ?? toISODateString(new Date());
  const weekStart = toISODateString(getMondayOfWeek(new Date(`${today}T12:00:00`)));
  const pointsMap = buildPointsMap(params.allChallenges);

  const earnedPoints = params.weekCompletions.reduce((sum, row) => {
    if (row.completado_at < weekStart || row.completado_at > today) {
      return sum;
    }
    return sum + (pointsMap.get(row.reto_id) ?? 0);
  }, 0);

  const dailyTargetPoints = params.activeChallenges.reduce(
    (sum, challenge) => sum + challenge.points,
    0
  );
  const daysElapsed = getDaysElapsedInWeek(new Date(`${today}T12:00:00`));
  const maxPoints = dailyTargetPoints * daysElapsed;

  const percentage =
    maxPoints > 0 ? Math.min(100, Math.round((earnedPoints / maxPoints) * 100)) : 0;

  const completedToday = params.activeChallenges.filter((challenge) =>
    params.todayCompletedIds.includes(challenge.id)
  ).length;

  const streakDays = calculateStreakDays(
    params.streakCompletions ?? params.weekCompletions,
    today
  );
  const activeDaysThisWeek = countActiveDaysInWeek(params.weekCompletions, weekStart, today);

  return {
    earnedPoints,
    maxPoints,
    percentage,
    completedToday,
    totalActiveChallenges: params.activeChallenges.length,
    streakDays,
    activeDaysThisWeek
  };
}
