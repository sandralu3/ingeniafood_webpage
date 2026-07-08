import { MEAL_TYPES, WEEK_DAYS, type MealType, type WeekDay } from "@/lib/plan/constants";
import {
  formatWeekDateLabel,
  getDateForWeekDay,
  getMondayOfWeek,
  isSameCalendarDay,
  toISODateString
} from "@/lib/plan/week-utils";
import type { PlanDay, PlanDaySlots } from "@/lib/plan/types";
import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { Database } from "@/types/database.types";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { pickRandomRecipe } from "@/lib/plan/match-meal-type";

type PlanRow = Database["public"]["Tables"]["plan_semanal"]["Row"];
type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

export type RecipePickerItem = Pick<
  RecipeRow,
  | "id"
  | "title"
  | "image_url"
  | "instagram_url"
  | "cooking_time"
  | "is_airfryer"
  | "is_flourless"
  | "created_at"
>;

type PlanRowWithRecipe = PlanRow & {
  recipes: Pick<
    RecipeRow,
    "id" | "title" | "image_url" | "instagram_url" | "cooking_time" | "is_airfryer" | "is_flourless"
  > | null;
};

const PLAN_SELECT = `
  id,
  user_id,
  semana_inicio,
  dia_semana,
  tipo_comida,
  recipe_id,
  created_at,
  recipes (
    id,
    title,
    image_url,
    instagram_url,
    cooking_time,
    is_airfryer,
    is_flourless
  )
`;

function emptySlots(): PlanDaySlots {
  return { Desayuno: null, Almuerzo: null, Cena: null };
}

function mapMealType(value: string): MealType {
  if (value === "Comida") return "Almuerzo";
  if (MEAL_TYPES.includes(value as MealType)) return value as MealType;
  return "Almuerzo";
}

function toPlanMeal(row: PlanRowWithRecipe): PlanMeal {
  const recipe = row.recipes;
  return {
    id: row.id,
    recipeId: row.recipe_id,
    title: recipe?.title ?? "Receta sin título",
    mealType: mapMealType(row.tipo_comida),
    imageUrl: recipe?.image_url ?? null,
    instagramUrl: recipe?.instagram_url ?? null,
    isSocialVideo: Boolean(recipe?.instagram_url && !recipe?.image_url),
    calories: recipe?.cooking_time ?? undefined,
    isAirfryer: recipe?.is_airfryer ?? false,
    isFlourless: recipe?.is_flourless ?? false
  };
}

export function buildEmptyWeekDays(weekStart: Date): PlanDay[] {
  const today = new Date();
  return WEEK_DAYS.map((label, index) => {
    const date = getDateForWeekDay(weekStart, index);
    return {
      id: label.toLowerCase(),
      label,
      dateLabel: formatWeekDateLabel(date),
      isToday: isSameCalendarDay(date, today),
      slots: emptySlots()
    };
  });
}

export function groupPlanRowsIntoDays(rows: PlanRowWithRecipe[], weekStart: Date): PlanDay[] {
  const today = new Date();

  return WEEK_DAYS.map((label, index) => {
    const date = getDateForWeekDay(weekStart, index);
    const slots = emptySlots();

    rows
      .filter((row) => row.dia_semana === label)
      .forEach((row) => {
        const mealType = mapMealType(row.tipo_comida);
        slots[mealType] = toPlanMeal(row);
      });

    return {
      id: label.toLowerCase(),
      label,
      dateLabel: formatWeekDateLabel(date),
      isToday: isSameCalendarDay(date, today),
      slots
    };
  });
}

export async function fetchWeeklyPlan(userId: string): Promise<{
  weekStart: string;
  days: PlanDay[];
}> {
  const supabase = createSupabaseClient();
  const monday = getMondayOfWeek();
  const semanaInicio = toISODateString(monday);

  const { data, error } = await supabase
    .from("plan_semanal")
    .select(PLAN_SELECT)
    .eq("user_id", userId)
    .eq("semana_inicio", semanaInicio);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as PlanRowWithRecipe[];
  return {
    weekStart: semanaInicio,
    days: groupPlanRowsIntoDays(rows, monday)
  };
}

export async function fetchRecipesForPicker(userId: string): Promise<RecipePickerItem[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, title, image_url, instagram_url, cooking_time, is_airfryer, is_flourless, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function assignRecipeToPlan(params: {
  userId: string;
  diaSemana: WeekDay;
  tipoComida: MealType;
  recipeId: string;
}): Promise<PlanMeal | null> {
  const supabase = createSupabaseClient();
  const semanaInicio = toISODateString(getMondayOfWeek());

  const { data: existing, error: existingError } = await supabase
    .from("plan_semanal")
    .select("id")
    .eq("user_id", params.userId)
    .eq("semana_inicio", semanaInicio)
    .eq("dia_semana", params.diaSemana)
    .eq("tipo_comida", params.tipoComida)
    .maybeSingle();

  if (existingError) {
    console.error("[plan] Error comprobando slot del plan:", existingError);
    return null;
  }

  const query = existing
    ? supabase
        .from("plan_semanal")
        .update({ recipe_id: params.recipeId })
        .eq("id", existing.id)
        .eq("user_id", params.userId)
    : supabase.from("plan_semanal").insert({
        user_id: params.userId,
        semana_inicio: semanaInicio,
        dia_semana: params.diaSemana,
        tipo_comida: params.tipoComida,
        recipe_id: params.recipeId
      });

  const { data, error } = await query.select(PLAN_SELECT).single();

  if (error || !data) {
    console.error("[plan] Error asignando receta al plan:", error);
    return null;
  }

  return toPlanMeal(data as PlanRowWithRecipe);
}

export async function swapPlanMeal(params: {
  userId: string;
  planEntryId: string;
  currentRecipeId: string;
  mealType: MealType;
}): Promise<PlanMeal | null> {
  const supabase = createSupabaseClient();

  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select("id, title, description, instructions, image_url, cooking_time")
    .or(`user_id.eq.${params.userId},is_public.eq.true`)
    .neq("id", params.currentRecipeId);

  if (recipesError || !recipes?.length) {
    console.error("[plan] Error buscando recetas para swap:", recipesError);
    return null;
  }

  const replacement = pickRandomRecipe(recipes, params.mealType, params.currentRecipeId);
  if (!replacement) return null;

  const { data: updated, error: updateError } = await supabase
    .from("plan_semanal")
    .update({ recipe_id: replacement.id })
    .eq("id", params.planEntryId)
    .eq("user_id", params.userId)
    .select(PLAN_SELECT)
    .maybeSingle();

  if (updateError || !updated) {
    console.error("[plan] Error actualizando plan_semanal:", updateError);
    return null;
  }

  return toPlanMeal(updated as PlanRowWithRecipe);
}

export async function removePlanMeal(params: {
  userId: string;
  planEntryId: string;
}): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("plan_semanal")
    .delete()
    .eq("id", params.planEntryId)
    .eq("user_id", params.userId);

  if (error) {
    console.error("[plan] Error quitando receta del plan:", error);
    return false;
  }

  return true;
}
