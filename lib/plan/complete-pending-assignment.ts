import { assignRecipeToPlan } from "@/lib/plan/plan-service";
import {
  clearPendingPlanAssignment,
  readPendingPlanAssignment,
  type PendingPlanAssignment
} from "@/lib/plan/plan-pending-assignment";

export type PendingAssignmentOutcome = {
  hadPending: boolean;
  assigned: boolean;
  /** Copia del pending (antes de limpiarlo) para que la UI formatee el mensaje. */
  pending: PendingPlanAssignment | null;
};

export async function completePendingPlanAssignment(
  userId: string,
  recipeId: string
): Promise<PendingAssignmentOutcome> {
  const pending = readPendingPlanAssignment();
  if (!pending) {
    return { hadPending: false, assigned: false, pending: null };
  }

  const assigned = await assignRecipeToPlan({
    userId,
    diaSemana: pending.dayLabel,
    tipoComida: pending.mealType,
    recipeId,
    semanaInicioISO: pending.weekStartISO
  });

  clearPendingPlanAssignment();

  return {
    hadPending: true,
    assigned,
    pending
  };
}
