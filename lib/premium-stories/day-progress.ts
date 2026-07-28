import type { HoyPageData } from "@/lib/gamification/hoy-page-data";

/**
 * % de meta del día (0–100) a partir del menú planificado + balance veg/prot + hábitos.
 * No duplica el detalle de "Tu menú"; es un resumen visual para el widget Premium.
 */
export function computeDayProgressPercent(data: HoyPageData | null): number {
  if (!data) return 0;

  const planned = Math.min(3, Math.max(0, data.todayPlanNutrition.plannedMealCount));
  const mealScore = (planned / 3) * 45;

  const vegScore = data.todayPlanNutrition.hasVegetables ? 15 : 0;
  const proteinScore = data.todayPlanNutrition.hasProtein ? 15 : 0;

  const active = data.activeChallenges?.length ?? 0;
  const done = (data.todayCompletedIds ?? []).length;
  const habitScore = active > 0 ? (Math.min(done, active) / active) * 25 : 0;

  return Math.round(Math.min(100, mealScore + vegScore + proteinScore + habitScore));
}
