import { addDays, getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";
import type { DailyChallenge } from "@/lib/gamification/challenges";
import { getCurrentStreakDateSet } from "@/lib/gamification/weekly-metrics";

export type WeekConsistencyDay = {
  label: string;
  isoDate: string;
  /** Hubo actividad ese día (reto, agua, comida registrada o escáner) */
  active: boolean;
  /** Forma parte de la racha consecutiva actual */
  inCurrentStreak: boolean;
  isToday: boolean;
};

export type DailyPointsEntry = {
  label: string;
  isoDate: string;
  points: number;
  isToday: boolean;
};

type CompletionRow = {
  reto_id: string;
  completado_at: string;
};

const WEEKDAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

export function buildWeekConsistencyDays(
  weekCompletions: Array<{ completado_at: string }>,
  today = toISODateString(new Date()),
  streakCompletions: Array<{ completado_at: string }> = weekCompletions
): WeekConsistencyDay[] {
  const monday = getMondayOfWeek(new Date(`${today}T12:00:00`));
  const activeDays = new Set(weekCompletions.map((row) => row.completado_at));
  const streakDates = getCurrentStreakDateSet(streakCompletions, today);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const isoDate = toISODateString(date);
    const active = activeDays.has(isoDate);

    return {
      label: WEEKDAY_SHORT[index],
      isoDate,
      active,
      inCurrentStreak: streakDates.has(isoDate),
      isToday: isoDate === today
    };
  });
}

export function buildDailyPointsHistory(params: {
  completions: CompletionRow[];
  challenges: DailyChallenge[];
  today?: string;
}): DailyPointsEntry[] {
  const today = params.today ?? toISODateString(new Date());
  const monday = getMondayOfWeek(new Date(`${today}T12:00:00`));
  const pointsMap = new Map(params.challenges.map((challenge) => [challenge.id, challenge.points]));

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const isoDate = toISODateString(date);
    const points = params.completions
      .filter((row) => row.completado_at === isoDate)
      .reduce((sum, row) => sum + (pointsMap.get(row.reto_id) ?? 0), 0);

    return {
      label: new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(date),
      isoDate,
      points,
      isToday: isoDate === today
    };
  });
}
