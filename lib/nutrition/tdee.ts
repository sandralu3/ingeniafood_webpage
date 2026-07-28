/**
 * Mifflin–St Jeor BMR + TDEE y metas calóricas/proteicas.
 */

export type BiologicalSex = "female" | "male";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type NutritionGoalType = "deficit" | "maintenance" | "surplus";

export type NutritionProfileInput = {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  biologicalSex: BiologicalSex;
  activityLevel: ActivityLevel;
  nutritionGoal: NutritionGoalType;
  /** Si se define, sustituye la kcal calculada. */
  calorieGoalOverride?: number | null;
  /** Si se define, sustituye la proteína calculada. */
  proteinGoalOverride?: number | null;
};

export type ResolvedNutritionTargets = {
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  calorieSource: "calculated" | "override";
  proteinSource: "calculated" | "override";
  nutritionGoal: NutritionGoalType;
};

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const PROTEIN_G_PER_KG: Record<NutritionGoalType, number> = {
  deficit: 1.8,
  maintenance: 1.6,
  surplus: 1.8
};

/** Ajuste calórico relativo al TDEE. */
const GOAL_CALORIE_DELTA: Record<NutritionGoalType, number> = {
  deficit: -0.18,
  maintenance: 0,
  surplus: 0.12
};

/** Suelo de seguridad (kcal/día) según sexo. */
function calorieFloor(sex: BiologicalSex): number {
  return sex === "female" ? 1200 : 1500;
}

/**
 * BMR Mifflin–St Jeor (kcal/día).
 * Mujeres: 10w + 6.25h − 5a − 161
 * Hombres: 10w + 6.25h − 5a + 5
 */
export function computeMifflinStJeorBmr(params: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  biologicalSex: BiologicalSex;
}): number {
  const base =
    10 * params.weightKg + 6.25 * params.heightCm - 5 * params.ageYears;
  const bmr = params.biologicalSex === "female" ? base - 161 : base + 5;
  return Math.round(Math.max(800, bmr));
}

export function computeTdee(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);
}

function distributeMacros(
  calorieTarget: number,
  proteinTarget: number
): { carbsTarget: number; fatTarget: number } {
  const proteinKcal = proteinTarget * 4;
  const remaining = Math.max(0, calorieTarget - proteinKcal);
  // ~45% carbs / 35% fat del remanente energético tras proteína.
  const carbsKcal = remaining * 0.55;
  const fatKcal = remaining * 0.45;
  return {
    carbsTarget: Math.round(carbsKcal / 4),
    fatTarget: Math.round(fatKcal / 9)
  };
}

export function resolveNutritionTargets(
  input: NutritionProfileInput
): ResolvedNutritionTargets {
  const bmr = computeMifflinStJeorBmr(input);
  const tdee = computeTdee(bmr, input.activityLevel);

  const calculatedCalories = Math.round(
    tdee * (1 + GOAL_CALORIE_DELTA[input.nutritionGoal])
  );
  const floored = Math.max(calorieFloor(input.biologicalSex), calculatedCalories);

  const hasCalOverride =
    typeof input.calorieGoalOverride === "number" &&
    Number.isFinite(input.calorieGoalOverride) &&
    input.calorieGoalOverride >= 1000;

  const calorieTarget = hasCalOverride
    ? Math.round(input.calorieGoalOverride as number)
    : floored;

  const calculatedProtein = Math.round(
    input.weightKg * PROTEIN_G_PER_KG[input.nutritionGoal]
  );

  const hasProtOverride =
    typeof input.proteinGoalOverride === "number" &&
    Number.isFinite(input.proteinGoalOverride) &&
    input.proteinGoalOverride >= 30;

  const proteinTarget = hasProtOverride
    ? Math.round(input.proteinGoalOverride as number)
    : Math.min(220, Math.max(40, calculatedProtein));

  const { carbsTarget, fatTarget } = distributeMacros(
    calorieTarget,
    proteinTarget
  );

  return {
    bmr,
    tdee,
    calorieTarget,
    proteinTarget,
    carbsTarget,
    fatTarget,
    calorieSource: hasCalOverride ? "override" : "calculated",
    proteinSource: hasProtOverride ? "override" : "calculated",
    nutritionGoal: input.nutritionGoal
  };
}

/** Ratio kcal del día vs meta (±15% = en rango). */
export function calorieTargetRatio(
  consumedCalories: number,
  calorieTarget: number
): number {
  if (!calorieTarget || calorieTarget <= 0) return 0;
  return consumedCalories / calorieTarget;
}

export function isWithinCalorieSweetSpot(ratio: number): boolean {
  return ratio >= 0.85 && ratio <= 1.15;
}

/** Fuera del sweet spot por debajo, sin llegar a déficit severo. */
export function isModeratelyUnderCalorieTarget(ratio: number): boolean {
  return ratio < 0.85 && ratio >= 0.6;
}

/** Fuera del sweet spot por encima, sin llegar a exceso severo. */
export function isModeratelyOverCalorieTarget(ratio: number): boolean {
  return ratio > 1.15 && ratio <= 1.3;
}

export function isSeverelyUnderCalorieTarget(ratio: number): boolean {
  return ratio < 0.6;
}

export function isSeverelyOverCalorieTarget(ratio: number): boolean {
  return ratio > 1.3;
}

export function remainingCaloriesToTarget(
  consumedCalories: number,
  calorieTarget: number
): number {
  return Math.max(0, Math.round(calorieTarget - consumedCalories));
}
