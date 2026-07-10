import type { DailyChallenge } from "@/lib/gamification/challenges";
import { addDays, getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";

export type WeekConsistencyDay = {
  label: string;
  isoDate: string;
  completed: boolean;
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
  completions: Array<{ completado_at: string }>,
  today = toISODateString(new Date())
): WeekConsistencyDay[] {
  const monday = getMondayOfWeek(new Date(`${today}T12:00:00`));
  const activeDays = new Set(completions.map((row) => row.completado_at));

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const isoDate = toISODateString(date);

    return {
      label: WEEKDAY_SHORT[index],
      isoDate,
      completed: activeDays.has(isoDate),
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
