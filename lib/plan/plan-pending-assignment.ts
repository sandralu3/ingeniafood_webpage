import { MEAL_TYPES, WEEK_DAYS, type MealType, type WeekDay } from "@/lib/plan/constants";

export type PendingPlanAssignment = {
  dayLabel: WeekDay;
  mealType: MealType;
  /**
   * Semana ancla (YYYY-MM-DD) del plan donde el usuario inició la asignación.
   * Opcional para mantener compatibilidad con pending antiguos.
   */
  weekStartISO?: string;
};

const STORAGE_KEY = "ingeniafood_pending_plan_assignment";
const LAST_WEEK_START_KEY = "ingeniafood_last_plan_week_start_iso";
const SCANNER_MODE_KEY = "ingeniafood_scanner_initial_mode";

export type ScannerInitialMode = "pantry" | "instagram";

function isWeekDay(value: string): value is WeekDay {
  return (WEEK_DAYS as readonly string[]).includes(value);
}

function isMealType(value: string): value is MealType {
  return (MEAL_TYPES as readonly string[]).includes(value);
}

export function savePendingPlanAssignment(assignment: PendingPlanAssignment): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(assignment));

  if (assignment.weekStartISO) {
    sessionStorage.setItem(LAST_WEEK_START_KEY, assignment.weekStartISO);
  }
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

    const weekStartISO =
      typeof parsed.weekStartISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.weekStartISO)
        ? parsed.weekStartISO
        : undefined;

    return {
      dayLabel: parsed.dayLabel,
      mealType: parsed.mealType,
      weekStartISO
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

export function readLastPlanWeekStartISO(): string | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(LAST_WEEK_START_KEY);
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function saveLastPlanWeekStartISO(weekStartISO: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LAST_WEEK_START_KEY, weekStartISO);
}

export function saveScannerInitialMode(mode: ScannerInitialMode): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SCANNER_MODE_KEY, mode);
}

export function consumeScannerInitialMode(): ScannerInitialMode | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(SCANNER_MODE_KEY);
  sessionStorage.removeItem(SCANNER_MODE_KEY);

  if (raw === "pantry" || raw === "instagram") {
    return raw;
  }

  return null;
}
