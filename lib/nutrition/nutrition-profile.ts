import {
  resolveNutritionTargets,
  type ActivityLevel,
  type BiologicalSex,
  type NutritionGoalType,
  type ResolvedNutritionTargets
} from "@/lib/nutrition/tdee";
import { DEFAULT_DAY_BUDGET } from "@/lib/plan/meal-suggestion";
import { createSupabaseClient } from "@/lib/supabaseClient";

export type NutritionProfileRow = {
  weight_kg: number | null;
  height_cm: number | null;
  age_years: number | null;
  biological_sex: BiologicalSex | null;
  activity_level: ActivityLevel | null;
  nutrition_goal: NutritionGoalType | null;
  calorie_goal_override: number | null;
  protein_goal_override: number | null;
};

export type UserNutritionGoals = {
  isComplete: boolean;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  source: "profile" | "default";
  bmr: number | null;
  tdee: number | null;
  nutritionGoal: NutritionGoalType | null;
  calorieSource: "calculated" | "override" | "default";
  proteinSource: "calculated" | "override" | "default";
  profile: NutritionProfileRow | null;
};

export const NUTRITION_PROFILE_SELECT =
  "weight_kg, height_cm, age_years, biological_sex, activity_level, nutrition_goal, calorie_goal_override, protein_goal_override" as const;

export function isNutritionProfileComplete(
  profile: Partial<NutritionProfileRow> | null | undefined
): boolean {
  if (!profile) return false;
  return (
    typeof profile.weight_kg === "number" &&
    profile.weight_kg > 0 &&
    typeof profile.height_cm === "number" &&
    profile.height_cm > 0 &&
    typeof profile.age_years === "number" &&
    profile.age_years > 0 &&
    (profile.biological_sex === "female" || profile.biological_sex === "male") &&
    Boolean(profile.activity_level) &&
    Boolean(profile.nutrition_goal)
  );
}

export function defaultNutritionGoals(): UserNutritionGoals {
  return {
    isComplete: false,
    calorieTarget: DEFAULT_DAY_BUDGET.calories,
    proteinTarget: DEFAULT_DAY_BUDGET.protein,
    carbsTarget: DEFAULT_DAY_BUDGET.carbs,
    fatTarget: DEFAULT_DAY_BUDGET.fat,
    source: "default",
    bmr: null,
    tdee: null,
    nutritionGoal: null,
    calorieSource: "default",
    proteinSource: "default",
    profile: null
  };
}

export function resolveUserNutritionGoals(
  profile: NutritionProfileRow | null | undefined
): UserNutritionGoals {
  if (!isNutritionProfileComplete(profile) || !profile) {
    return {
      ...defaultNutritionGoals(),
      profile: profile ?? null
    };
  }

  const targets: ResolvedNutritionTargets = resolveNutritionTargets({
    weightKg: profile.weight_kg as number,
    heightCm: profile.height_cm as number,
    ageYears: profile.age_years as number,
    biologicalSex: profile.biological_sex as BiologicalSex,
    activityLevel: profile.activity_level as ActivityLevel,
    nutritionGoal: profile.nutrition_goal as NutritionGoalType,
    calorieGoalOverride: profile.calorie_goal_override,
    proteinGoalOverride: profile.protein_goal_override
  });

  return {
    isComplete: true,
    calorieTarget: targets.calorieTarget,
    proteinTarget: targets.proteinTarget,
    carbsTarget: targets.carbsTarget,
    fatTarget: targets.fatTarget,
    source: "profile",
    bmr: targets.bmr,
    tdee: targets.tdee,
    nutritionGoal: targets.nutritionGoal,
    calorieSource: targets.calorieSource,
    proteinSource: targets.proteinSource,
    profile
  };
}

export async function fetchUserNutritionGoals(
  userId: string
): Promise<UserNutritionGoals> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(NUTRITION_PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return defaultNutritionGoals();
    }

    return resolveUserNutritionGoals(data as NutritionProfileRow);
  } catch {
    return defaultNutritionGoals();
  }
}
