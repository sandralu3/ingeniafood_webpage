import { assignRecipeToPlan } from "@/lib/plan/plan-service";
import {
  clearPendingPlanAssignment,
  formatPendingPlanAssignmentLabel,
  readPendingPlanAssignment
} from "@/lib/plan/plan-pending-assignment";

export type PendingAssignmentOutcome = {
  hadPending: boolean;
  assigned: boolean;
  message: string | null;
};

export async function completePendingPlanAssignment(
  userId: string,
  recipeId: string
): Promise<PendingAssignmentOutcome> {
  const pending = readPendingPlanAssignment();
  if (!pending) {
    return { hadPending: false, assigned: false, message: null };
  }

  const assigned = await assignRecipeToPlan({
    userId,
    diaSemana: pending.dayLabel,
    tipoComida: pending.mealType,
    recipeId
  });

  clearPendingPlanAssignment();

  if (assigned) {
    return {
      hadPending: true,
      assigned: true,
      message: `¡Receta guardada y asignada al ${formatPendingPlanAssignmentLabel(pending)}!`
    };
  }

  return {
    hadPending: true,
    assigned: false,
    message: "Receta guardada. No pudimos asignarla al plan automáticamente."
  };
}
