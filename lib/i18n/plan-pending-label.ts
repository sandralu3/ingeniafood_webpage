import type { MealType, WeekDay } from "@/lib/plan/constants";
import type { PendingPlanAssignment } from "@/lib/plan/plan-pending-assignment";

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

/** Etiqueta localizada: "Cena del Jueves" / "Dinner on Thursday". */
export function formatPendingPlanSlot(
  assignment: PendingPlanAssignment,
  tPlan: Translate,
  tScanner: Translate
): string {
  const meal = tPlan(`meals.${assignment.mealType}` as `meals.${MealType}`);
  const day = tPlan(`days.${assignment.dayLabel}` as `days.${WeekDay}`);
  return tScanner("pendingSlot", { meal, day });
}
