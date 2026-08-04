import { clampGlassesDrunk, clampWaterGlassesGoal } from "@/lib/hydration/water-intake";

export type WaterIntakeTone = "empty" | "low" | "good" | "perfect";

export type WaterIntakeStatus = {
  goal: number;
  drunk: number;
  percent: number;
  tone: WaterIntakeTone;
};

/**
 * Nivel de hidratación respecto a la meta personalizada.
 * null = el usuario no configuró vasos (no mostrar en informe).
 */
export function resolveWaterIntakeStatus(
  glassesDrunk: number,
  glassesGoal: number | null | undefined
): WaterIntakeStatus | null {
  const goal = clampWaterGlassesGoal(glassesGoal);
  if (goal == null) return null;

  const drunk = clampGlassesDrunk(glassesDrunk, goal);
  const percent = Math.round((drunk / goal) * 100);

  let tone: WaterIntakeTone;
  if (drunk <= 0) tone = "empty";
  else if (percent >= 100) tone = "perfect";
  else if (percent >= 50) tone = "good";
  else tone = "low";

  return { goal, drunk, percent, tone };
}

export function waterToneBadgeClass(tone: WaterIntakeTone): string {
  switch (tone) {
    case "perfect":
    case "good":
      return "bg-[#E8F0E4] text-[#3E5A3A]";
    case "low":
      return "bg-[#E8F4FA] text-[#3D7A9A]";
    case "empty":
    default:
      return "bg-stone-100 text-stone-500";
  }
}

export function waterToneBarClass(tone: WaterIntakeTone): string {
  switch (tone) {
    case "perfect":
      return "bg-[#3E5A3A]";
    case "good":
      return "bg-[#4FA3C7]";
    case "low":
      return "bg-[#7EB8D4]";
    case "empty":
    default:
      return "bg-stone-300";
  }
}
