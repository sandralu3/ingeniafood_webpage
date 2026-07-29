import { MEAL_TYPES, WEEK_DAYS, type MealType, type WeekDay } from "@/lib/plan/constants";
import {
  formatWeekDateLabel,
  getDateForWeekDay,
  getMondayOfWeek,
  getWeekDayFromDate,
  isSameCalendarDay,
  toISODateString
} from "@/lib/plan/week-utils";
import type { PlanDay, PlanDaySlots } from "@/lib/plan/types";
import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { Database, Json } from "@/types/database.types";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { pickRandomRecipe } from "@/lib/plan/match-meal-type";
import {
  enrichPlanMealWithNutrition,
  EMPTY_DAY_PLAN_NUTRITION,
  summarizeDayPlanNutrition
} from "@/lib/plan/plan-nutrition";
import { resolveExternalMealBadge } from "@/lib/plan/external-meal";
import {
  fetchSnacksForWeek,
  groupSnacksByDay
} from "@/lib/plan/snack-service";
import type { PlanSnack } from "@/lib/plan/snack-presets";

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

type PlanRecipeBase = Pick<
  RecipeRow,
  | "id"
  | "title"
  | "image_url"
  | "instagram_url"
  | "cooking_time"
  | "is_airfryer"
  | "is_flourless"
>;

type PlanRecipeNutrition = Pick<
  RecipeRow,
  "id" | "title" | "macros" | "ingredients" | "is_airfryer" | "is_flourless"
> & {
  tags?: Json | null;
};

type PlanRowWithRecipe = PlanRow & {
  recipes: (PlanRecipeBase & Partial<PlanRecipeNutrition>) | null;
};

const PLAN_BASE_RECIPE_FIELDS = `
    id,
    title,
    image_url,
    instagram_url,
    cooking_time,
    is_airfryer,
    is_flourless
  `;

const PLAN_SELECT = `
  id,
  user_id,
  semana_inicio,
  dia_semana,
  tipo_comida,
  recipe_id,
  created_at,
  recipes (${PLAN_BASE_RECIPE_FIELDS})
`;

function emptySlots(): PlanDaySlots {
  return { Desayuno: null, Almuerzo: null, Cena: null };
}

function mapMealType(value: string): MealType {
  if (value === "Comida") return "Almuerzo";
  if (MEAL_TYPES.includes(value as MealType)) return value as MealType;
  return "Almuerzo";
}

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

async function fetchRecipeNutritionByIds(
  recipeIds: string[]
): Promise<Map<string, PlanRecipeNutrition>> {
  if (!recipeIds.length) return new Map();

  const supabase = createSupabaseClient();

  const full = await supabase
    .from("recipes")
    .select("id, title, macros, ingredients, tags, is_airfryer, is_flourless")
    .in("id", recipeIds);

  if (!full.error) {
    return new Map((full.data ?? []).map((row) => [row.id, row as PlanRecipeNutrition]));
  }

  if (isMissingColumnError(full.error)) {
    const withoutTags = await supabase
      .from("recipes")
      .select("id, title, macros, ingredients, is_airfryer, is_flourless")
      .in("id", recipeIds);

    if (!withoutTags.error) {
      return new Map((withoutTags.data ?? []).map((row) => [row.id, row as PlanRecipeNutrition]));
    }

    if (isMissingColumnError(withoutTags.error)) {
      const ingredientsOnly = await supabase
        .from("recipes")
        .select("id, title, ingredients, is_airfryer, is_flourless")
        .in("id", recipeIds);

      if (!ingredientsOnly.error) {
        return new Map(
          (ingredientsOnly.data ?? []).map((row) => [row.id, row as PlanRecipeNutrition])
        );
      }
    }

    console.warn(
      "[plan] No se pudieron cargar campos nutricionales de recetas:",
      withoutTags.error?.message ?? full.error.message
    );
    return new Map();
  }

  console.warn("[plan] No se pudieron cargar campos nutricionales de recetas:", full.error.message);
  return new Map();
}

async function enrichPlanRowsWithNutrition(rows: PlanRowWithRecipe[]): Promise<PlanRowWithRecipe[]> {
  const recipeIds = Array.from(new Set(rows.map((row) => row.recipe_id).filter(Boolean)));
  const nutritionById = await fetchRecipeNutritionByIds(recipeIds);

  if (!nutritionById.size) return rows;

  return rows.map((row) => {
    const nutrition = nutritionById.get(row.recipe_id);
    if (!row.recipes || !nutrition) return row;

    return {
      ...row,
      recipes: {
        ...row.recipes,
        ...nutrition
      }
    };
  });
}

function toPlanMeal(row: PlanRowWithRecipe): PlanMeal {
  const recipe = row.recipes;
  const baseMeal: PlanMeal = {
    id: row.id,
    recipeId: row.recipe_id,
    title: recipe?.title ?? "Receta sin título",
    mealType: mapMealType(row.tipo_comida),
    imageUrl: recipe?.image_url ?? null,
    instagramUrl: recipe?.instagram_url ?? null,
    isSocialVideo: Boolean(recipe?.instagram_url && !recipe?.image_url),
    prepMinutes: recipe?.cooking_time ?? undefined,
    calories: recipe?.cooking_time ?? undefined,
    isAirfryer: recipe?.is_airfryer ?? false,
    isFlourless: recipe?.is_flourless ?? false
  };

  if (!recipe) return baseMeal;

  try {
    const enriched = enrichPlanMealWithNutrition(baseMeal, {
      ingredients: recipe.ingredients,
      macros: recipe.macros,
      tags: recipe.tags,
      is_airfryer: recipe.is_airfryer,
      is_flourless: recipe.is_flourless,
      title: recipe.title
    });
    return {
      ...enriched,
      externalBadge: resolveExternalMealBadge(recipe.tags)
    };
  } catch (error) {
    console.warn("[plan] Error analizando nutrición de receta:", recipe.id, error);
    return {
      ...baseMeal,
      externalBadge: resolveExternalMealBadge(recipe.tags)
    };
  }
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
      slots: emptySlots(),
      snacks: [],
      nutrition: EMPTY_DAY_PLAN_NUTRITION
    };
  });
}

export function groupPlanRowsIntoDays(
  rows: PlanRowWithRecipe[],
  weekStart: Date,
  snacksByDay?: Record<string, PlanSnack[]>
): PlanDay[] {
  const today = new Date();

  return WEEK_DAYS.map((label, index) => {
    const date = getDateForWeekDay(weekStart, index);
    const slots = emptySlots();
    const snacks = snacksByDay?.[label] ?? [];

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
      slots,
      snacks,
      nutrition: summarizeDayPlanNutrition(slots, snacks)
    };
  });
}

export async function fetchWeeklyPlan(
  userId: string,
  weekStartDate: Date = getMondayOfWeek()
): Promise<{
  weekStart: string;
  days: PlanDay[];
}> {
  const supabase = createSupabaseClient();
  const weekStart = weekStartDate;
  const semanaInicio = toISODateString(weekStart);

  const [{ data, error }, snacks] = await Promise.all([
    supabase
      .from("plan_semanal")
      .select(PLAN_SELECT)
      .eq("user_id", userId)
      .eq("semana_inicio", semanaInicio),
    fetchSnacksForWeek(userId, semanaInicio).catch((snackError) => {
      console.warn("[plan] snacks omitidos:", snackError);
      return [] as PlanSnack[];
    })
  ]);

  if (error) {
    throw error;
  }

  const rows = await enrichPlanRowsWithNutrition((data ?? []) as PlanRowWithRecipe[]);
  const snacksByDay = groupSnacksByDay(snacks);
  return {
    weekStart: semanaInicio,
    days: groupPlanRowsIntoDays(rows, weekStart, snacksByDay)
  };
}

export async function fetchRecipesForPicker(userId: string): Promise<RecipePickerItem[]> {
  const supabase = createSupabaseClient();

  const withTags = await supabase
    .from("recipes")
    .select(
      "id, title, image_url, instagram_url, cooking_time, is_airfryer, is_flourless, created_at, tags"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!withTags.error) {
    return ((withTags.data ?? []) as Array<RecipePickerItem & { tags?: unknown }>).filter(
      (recipe) => resolveExternalMealBadge(recipe.tags) == null
    );
  }

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
  semanaInicioISO?: string;
  weekStartDate?: Date;
}): Promise<PlanMeal | null> {
  const supabase = createSupabaseClient();
  const semanaInicio =
    params.semanaInicioISO ??
    toISODateString(params.weekStartDate ?? getMondayOfWeek());

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

  const [enrichedRow] = await enrichPlanRowsWithNutrition([data as PlanRowWithRecipe]);

  return toPlanMeal(enrichedRow);
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
    .select("id, title, description, instructions, image_url, cooking_time, meal_type")
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

  const [enrichedRow] = await enrichPlanRowsWithNutrition([updated as PlanRowWithRecipe]);
  return toPlanMeal(enrichedRow);
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

/**
 * Rellena slots vacíos (desayuno/almuerzo/cena) de un día concreto con recetas sugeridas.
 * Solo escribe en slots vacíos salvo `forceReplace`.
 */
export async function fillDayPlanWithSuggestions(params: {
  userId: string;
  dayLabel: WeekDay;
  semanaInicioISO: string;
  forceReplace?: boolean;
}): Promise<{ assigned: number; dayLabel: WeekDay }> {
  const supabase = createSupabaseClient();
  const { dayLabel, semanaInicioISO } = params;

  const { data: existingRows, error: existingError } = await supabase
    .from("plan_semanal")
    .select("id, tipo_comida, recipe_id")
    .eq("user_id", params.userId)
    .eq("semana_inicio", semanaInicioISO)
    .eq("dia_semana", dayLabel);

  if (existingError) {
    console.error("[plan] Error leyendo plan del día:", existingError);
    throw existingError;
  }

  const filledTypes = new Set(
    (existingRows ?? [])
      .filter((row) => row.recipe_id)
      .map((row) => mapMealType(row.tipo_comida as string))
  );

  const slotsToFill = MEAL_TYPES.filter(
    (mealType) => params.forceReplace || !filledTypes.has(mealType)
  );
  if (slotsToFill.length === 0) {
    return { assigned: 0, dayLabel };
  }

  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select("id, title, description, instructions, image_url, cooking_time, meal_type")
    .or(`user_id.eq.${params.userId},is_public.eq.true`)
    .limit(80);

  if (recipesError || !recipes?.length) {
    console.error("[plan] Error buscando recetas para menú del día:", recipesError);
    throw recipesError ?? new Error("No hay recetas disponibles");
  }

  const usedIds = new Set<string>(
    (existingRows ?? []).map((row) => row.recipe_id).filter(Boolean) as string[]
  );
  let assigned = 0;

  for (const mealType of slotsToFill) {
    const available = recipes.filter((recipe) => !usedIds.has(recipe.id));
    const recipe = pickRandomRecipe(available, mealType, "");
    if (!recipe) continue;

    usedIds.add(recipe.id);
    const meal = await assignRecipeToPlan({
      userId: params.userId,
      diaSemana: dayLabel,
      tipoComida: mealType,
      recipeId: recipe.id,
      semanaInicioISO
    });
    if (meal) assigned += 1;
  }

  return { assigned, dayLabel };
}

/**
 * Rellena los 3 slots del día de hoy con recetas sugeridas.
 * Solo escribe en slots vacíos salvo `forceReplace`.
 */
export async function fillTodayPlanWithSuggestions(params: {
  userId: string;
  forceReplace?: boolean;
}): Promise<{ assigned: number; dayLabel: WeekDay }> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return fillDayPlanWithSuggestions({
    userId: params.userId,
    dayLabel: getWeekDayFromDate(today),
    semanaInicioISO: toISODateString(getMondayOfWeek(today)),
    forceReplace: params.forceReplace
  });
}
