import {
  resolveNutritionTargets,
  type ActivityLevel,
  type BiologicalSex,
  type NutritionGoalType,
  type ResolvedNutritionTargets
} from "@/lib/nutrition/tdee";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parsePreferredDiet,
  type PreferredDiet
} from "@/lib/nutrition/preferred-diet";
import { DEFAULT_DAY_BUDGET } from "@/lib/plan/meal-suggestion";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database } from "@/types/database.types";

type NutritionSupabaseClient = SupabaseClient<Database>;

export type NutritionProfileRow = {
  weight_kg: number | null;
  height_cm: number | null;
  age_years: number | null;
  biological_sex: BiologicalSex | null;
  activity_level: ActivityLevel | null;
  nutrition_goal: NutritionGoalType | null;
  calorie_goal_override: number | null;
  protein_goal_override: number | null;
  preferred_diet: PreferredDiet | null;
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
  preferredDiet: PreferredDiet;
  calorieSource: "calculated" | "override" | "default";
  proteinSource: "calculated" | "override" | "default";
  profile: NutritionProfileRow | null;
};

export const NUTRITION_PROFILE_SELECT =
  "weight_kg, height_cm, age_years, biological_sex, activity_level, nutrition_goal, calorie_goal_override, protein_goal_override, preferred_diet" as const;

export const NUTRITION_PROFILE_SELECT_LEGACY =
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
    preferredDiet: "estandar",
    calorieSource: "default",
    proteinSource: "default",
    profile: null
  };
}

function normalizeProfileRow(
  raw: Partial<NutritionProfileRow> & { preferred_diet?: unknown }
): NutritionProfileRow {
  return {
    weight_kg: raw.weight_kg ?? null,
    height_cm: raw.height_cm ?? null,
    age_years: raw.age_years ?? null,
    biological_sex: raw.biological_sex ?? null,
    activity_level: raw.activity_level ?? null,
    nutrition_goal: raw.nutrition_goal ?? null,
    calorie_goal_override: raw.calorie_goal_override ?? null,
    protein_goal_override: raw.protein_goal_override ?? null,
    preferred_diet: raw.preferred_diet != null ? parsePreferredDiet(raw.preferred_diet) : null
  };
}

export function resolveUserNutritionGoals(
  profile: NutritionProfileRow | null | undefined
): UserNutritionGoals {
  const preferredDiet = parsePreferredDiet(profile?.preferred_diet);

  if (!isNutritionProfileComplete(profile) || !profile) {
    return {
      ...defaultNutritionGoals(),
      preferredDiet,
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
    preferredDiet,
    calorieSource: targets.calorieSource,
    proteinSource: targets.proteinSource,
    profile
  };
}

function isMissingPreferredDietColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("preferred_diet") === true
  );
}

/**
 * Lee metas nutricionales + dieta preferida.
 * En rutas API hay que pasar el `supabase` de `createSupabaseRouteClient()`
 * (con cookies de sesión); sin él el cliente browser no tiene auth y RLS
 * devuelve vacío → dieta "estandar".
 */
export async function fetchUserNutritionGoals(
  userId: string,
  supabaseClient?: NutritionSupabaseClient
): Promise<UserNutritionGoals> {
  try {
    const supabase = supabaseClient ?? createSupabaseClient();
    const primary = await supabase
      .from("profiles")
      .select(NUTRITION_PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (primary.error && isMissingPreferredDietColumn(primary.error)) {
      const legacy = await supabase
        .from("profiles")
        .select(NUTRITION_PROFILE_SELECT_LEGACY)
        .eq("id", userId)
        .maybeSingle();
      if (legacy.error || !legacy.data) {
        return defaultNutritionGoals();
      }
      return resolveUserNutritionGoals(
        normalizeProfileRow(legacy.data as Partial<NutritionProfileRow>)
      );
    }

    if (primary.error || !primary.data) {
      return defaultNutritionGoals();
    }

    return resolveUserNutritionGoals(
      normalizeProfileRow(primary.data as Partial<NutritionProfileRow>)
    );
  } catch {
    return defaultNutritionGoals();
  }
}
