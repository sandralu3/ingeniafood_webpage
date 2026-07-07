import { MEAL_TYPES, WEEK_DAYS, type MealType, type WeekDay } from "@/lib/plan/constants";

export type PendingPlanAssignment = {
  dayLabel: WeekDay;
  mealType: MealType;
};

const STORAGE_KEY = "ingeniafood_pending_plan_assignment";

function isWeekDay(value: string): value is WeekDay {
  return (WEEK_DAYS as readonly string[]).includes(value);
}

function isMealType(value: string): value is MealType {
  return (MEAL_TYPES as readonly string[]).includes(value);
}

export function savePendingPlanAssignment(assignment: PendingPlanAssignment): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(assignment));
}

export function readPendingPlanAssignment(): PendingPlanAssignment | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingPlanAssignment>;
    if (
      !parsed.dayLabel ||
      !parsed.mealType ||
      !isWeekDay(parsed.dayLabel) ||
      !isMealType(parsed.mealType)
    ) {
      return null;
    }

    return {
      dayLabel: parsed.dayLabel,
      mealType: parsed.mealType
    };
  } catch {
    return null;
  }
}

export function clearPendingPlanAssignment(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function formatPendingPlanAssignmentLabel(assignment: PendingPlanAssignment): string {
  return `${assignment.mealType} del ${assignment.dayLabel}`;
}
