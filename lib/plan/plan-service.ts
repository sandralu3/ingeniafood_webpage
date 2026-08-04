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
  computeRemainingMacros,
  pickMealSuggestionFromCatalog,
  subtractSuggestionFromRemaining,
  type MealSuggestionCandidate,
  type RemainingMacros
} from "@/lib/plan/meal-suggestion";
import { fetchUserNutritionGoals } from "@/lib/nutrition/nutrition-profile";
import { parseMacrosFromJson } from "@/lib/recipes/recipe-macros";
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

type PlanRowWithRecipe = Omit<PlanRow, "orden"> & {
  orden?: number;
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
  orden,
  created_at,
  recipes (${PLAN_BASE_RECIPE_FIELDS})
`;

const PLAN_SELECT_LEGACY = `
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
  return { Desayuno: [], Almuerzo: [], Cena: [] };
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
      .sort((a, b) => {
        const ordenA = typeof a.orden === "number" ? a.orden : 0;
        const ordenB = typeof b.orden === "number" ? b.orden : 0;
        if (ordenA !== ordenB) return ordenA - ordenB;
        return a.created_at.localeCompare(b.created_at);
      })
      .forEach((row) => {
        const mealType = mapMealType(row.tipo_comida);
        slots[mealType].push(toPlanMeal(row));
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

  const [planResult, snacks] = await Promise.all([
    (async () => {
      const primary = await supabase
        .from("plan_semanal")
        .select(PLAN_SELECT)
        .eq("user_id", userId)
        .eq("semana_inicio", semanaInicio);

      if (!primary.error || !isMissingColumnError(primary.error)) {
        return primary;
      }

      return supabase
        .from("plan_semanal")
        .select(PLAN_SELECT_LEGACY)
        .eq("user_id", userId)
        .eq("semana_inicio", semanaInicio);
    })(),
    fetchSnacksForWeek(userId, semanaInicio).catch((snackError) => {
      console.warn("[plan] snacks omitidos:", snackError);
      return [] as PlanSnack[];
    })
  ]);

  if (planResult.error) {
    throw planResult.error;
  }

  const rows = await enrichPlanRowsWithNutrition(
    (planResult.data ?? []) as PlanRowWithRecipe[]
  );
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

  const orden = await nextSlotOrden({
    userId: params.userId,
    semanaInicio,
    diaSemana: params.diaSemana,
    tipoComida: params.tipoComida
  });

  const insertWithOrden = await supabase
    .from("plan_semanal")
    .insert({
      user_id: params.userId,
      semana_inicio: semanaInicio,
      dia_semana: params.diaSemana,
      tipo_comida: params.tipoComida,
      recipe_id: params.recipeId,
      orden
    })
    .select(PLAN_SELECT)
    .single();

  let data = insertWithOrden.data as PlanRowWithRecipe | null;
  let error = insertWithOrden.error;

  if (error && isMissingColumnError(error)) {
    const legacy = await supabase
      .from("plan_semanal")
      .insert({
        user_id: params.userId,
        semana_inicio: semanaInicio,
        dia_semana: params.diaSemana,
        tipo_comida: params.tipoComida,
        recipe_id: params.recipeId
      })
      .select(PLAN_SELECT_LEGACY)
      .single();
    data = legacy.data as PlanRowWithRecipe | null;
    error = legacy.error;
  }

  if (error || !data) {
    console.error("[plan] Error asignando receta al plan:", error);
    return null;
  }

  const [enrichedRow] = await enrichPlanRowsWithNutrition([data as PlanRowWithRecipe]);

  return toPlanMeal(enrichedRow);
}

async function nextSlotOrden(params: {
  userId: string;
  semanaInicio: string;
  diaSemana: WeekDay;
  tipoComida: MealType;
}): Promise<number> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("plan_semanal")
    .select("orden")
    .eq("user_id", params.userId)
    .eq("semana_inicio", params.semanaInicio)
    .eq("dia_semana", params.diaSemana)
    .eq("tipo_comida", params.tipoComida)
    .order("orden", { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingColumnError(error)) return 0;
    console.warn("[plan] No se pudo leer orden del slot:", error.message);
    return 0;
  }

  const maxOrden = data?.[0]?.orden;
  return typeof maxOrden === "number" ? maxOrden + 1 : 0;
}

/** Reemplaza la receta de una entrada concreta del plan (editar plato elegido). */
export async function replacePlanMealRecipe(params: {
  userId: string;
  planEntryId: string;
  recipeId: string;
}): Promise<PlanMeal | null> {
  const supabase = createSupabaseClient();

  const withOrden = await supabase
    .from("plan_semanal")
    .update({ recipe_id: params.recipeId })
    .eq("id", params.planEntryId)
    .eq("user_id", params.userId)
    .select(PLAN_SELECT)
    .maybeSingle();

  let data = withOrden.data as PlanRowWithRecipe | null;
  let error = withOrden.error;

  if (error && isMissingColumnError(error)) {
    const legacy = await supabase
      .from("plan_semanal")
      .update({ recipe_id: params.recipeId })
      .eq("id", params.planEntryId)
      .eq("user_id", params.userId)
      .select(PLAN_SELECT_LEGACY)
      .maybeSingle();
    data = legacy.data as PlanRowWithRecipe | null;
    error = legacy.error;
  }

  if (error || !data) {
    console.error("[plan] Error reemplazando receta del plan:", error);
    return null;
  }

  const [enrichedRow] = await enrichPlanRowsWithNutrition([data]);
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
 * Por defecto NUNCA reemplaza comidas ya asignadas. Solo con `forceReplace: true`
 * sobrescribe slots ocupados.
 *
 * Las recetas se eligen acercándose a la meta calórica/proteica del perfil
 * (reparto ~28/40/32 entre Desayuno/Almuerzo/Cena, renormalizado si faltan slots).
 */
export async function fillDayPlanWithSuggestions(params: {
  userId: string;
  dayLabel: WeekDay;
  semanaInicioISO: string;
  forceReplace?: boolean;
}): Promise<{ assigned: number; dayLabel: WeekDay; skippedOccupied: number }> {
  const supabase = createSupabaseClient();
  const { dayLabel, semanaInicioISO } = params;
  const forceReplace = params.forceReplace === true;

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

  const occupiedByType = new Map<MealType, string>();
  for (const row of existingRows ?? []) {
    if (!row.recipe_id) continue;
    const mealType = mapMealType(row.tipo_comida as string);
    // Conservar el primer recipe_id visto por tipo de comida.
    if (!occupiedByType.has(mealType)) {
      occupiedByType.set(mealType, row.recipe_id);
    }
  }

  const slotsToFill = MEAL_TYPES.filter(
    (mealType) => forceReplace || !occupiedByType.has(mealType)
  );
  const skippedOccupied = MEAL_TYPES.length - slotsToFill.length;

  if (slotsToFill.length === 0) {
    return { assigned: 0, dayLabel, skippedOccupied };
  }

  const [goals, occupiedMacrosRows, daySnacks] = await Promise.all([
    fetchUserNutritionGoals(params.userId),
    occupiedByType.size > 0
      ? supabase
          .from("recipes")
          .select("id, macros")
          .in("id", Array.from(occupiedByType.values()))
          .then(({ data }) => data ?? [])
      : Promise.resolve([] as Array<{ id: string; macros: Json | null }>),
    fetchSnacksForWeek(params.userId, semanaInicioISO)
      .then((snacks) => snacks.filter((snack) => snack.dayLabel === dayLabel))
      .catch(() => [] as PlanSnack[])
  ]);

  const consumed = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  };

  for (const row of occupiedMacrosRows) {
    const macros = parseMacrosFromJson(row.macros);
    if (!macros) continue;
    consumed.calories += macros.calorias;
    consumed.protein += macros.proteinas_g;
    consumed.carbs += macros.carbohidratos_g;
    consumed.fat += macros.grasas_g;
  }

  for (const snack of daySnacks) {
    consumed.calories += snack.kcal ?? 0;
    consumed.protein += snack.proteinGrams ?? 0;
    consumed.carbs += snack.carbsGrams ?? 0;
    consumed.fat += snack.fatGrams ?? 0;
  }

  let remaining: RemainingMacros = computeRemainingMacros(consumed, {
    calories: goals.calorieTarget,
    protein: goals.proteinTarget,
    carbs: goals.carbsTarget,
    fat: goals.fatTarget
  });

  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select(
      "id, title, description, instructions, image_url, cooking_time, meal_type, macros, tags, is_airfryer, is_flourless, cuisine_style"
    )
    .or(`user_id.eq.${params.userId},is_public.eq.true`)
    .limit(120);

  if (recipesError || !recipes?.length) {
    console.error("[plan] Error buscando recetas para menú del día:", recipesError);
    throw recipesError ?? new Error("No hay recetas disponibles");
  }

  const candidates = recipes as MealSuggestionCandidate[];
  const usedIds = new Set<string>(Array.from(occupiedByType.values()));
  let assigned = 0;
  let activeSlots = [...slotsToFill];

  for (const mealType of slotsToFill) {
    const suggestion = pickMealSuggestionFromCatalog(
      candidates,
      mealType,
      remaining,
      Array.from(usedIds),
      activeSlots,
      goals.preferredDiet
    );

    const recipeId =
      suggestion?.recipeId ??
      pickRandomRecipe(
        candidates.filter((recipe) => !usedIds.has(recipe.id)),
        mealType,
        ""
      )?.id;

    if (!recipeId) {
      activeSlots = activeSlots.filter((slot) => slot !== mealType);
      continue;
    }

    if (!forceReplace) {
      const meal = await assignRecipeToEmptyPlanSlot({
        userId: params.userId,
        diaSemana: dayLabel,
        tipoComida: mealType,
        recipeId,
        semanaInicioISO
      });

      if (meal) {
        usedIds.add(recipeId);
        assigned += 1;
        if (suggestion) {
          remaining = subtractSuggestionFromRemaining(remaining, suggestion);
        } else {
          const assignedMacros = parseMacrosFromJson(
            (candidates.find((item) => item.id === recipeId)?.macros as Json | null | undefined) ??
              null
          );
          if (assignedMacros) {
            remaining = subtractSuggestionFromRemaining(remaining, {
              kcal: assignedMacros.calorias,
              proteinGrams: assignedMacros.proteinas_g,
              carbsGrams: assignedMacros.carbohidratos_g,
              fatGrams: assignedMacros.grasas_g
            });
          }
        }
      }

      activeSlots = activeSlots.filter((slot) => slot !== mealType);
      continue;
    }

    usedIds.add(recipeId);

    if (occupiedByType.has(mealType)) {
      await supabase
        .from("plan_semanal")
        .delete()
        .eq("user_id", params.userId)
        .eq("semana_inicio", semanaInicioISO)
        .eq("dia_semana", dayLabel)
        .eq("tipo_comida", mealType);
    }

    const meal = await assignRecipeToPlan({
      userId: params.userId,
      diaSemana: dayLabel,
      tipoComida: mealType,
      recipeId,
      semanaInicioISO
    });

    if (meal) {
      assigned += 1;
      if (suggestion) {
        remaining = subtractSuggestionFromRemaining(remaining, suggestion);
      } else {
        const assignedMacros = parseMacrosFromJson(
          (candidates.find((item) => item.id === recipeId)?.macros as Json | null | undefined) ??
            null
        );
        if (assignedMacros) {
          remaining = subtractSuggestionFromRemaining(remaining, {
            kcal: assignedMacros.calorias,
            proteinGrams: assignedMacros.proteinas_g,
            carbsGrams: assignedMacros.carbohidratos_g,
            fatGrams: assignedMacros.grasas_g
          });
        }
      }
    }

    activeSlots = activeSlots.filter((slot) => slot !== mealType);
  }

  return { assigned, dayLabel, skippedOccupied };
}

/**
 * Asigna una receta solo si ese tiempo de comida aún no tiene ninguna receta.
 * Usado por "proponer menú" para no tocar secciones ya rellenadas.
 */
async function assignRecipeToEmptyPlanSlot(params: {
  userId: string;
  diaSemana: WeekDay;
  tipoComida: MealType;
  recipeId: string;
  semanaInicioISO: string;
}): Promise<PlanMeal | null> {
  const supabase = createSupabaseClient();

  const { data: existing, error: existingError } = await supabase
    .from("plan_semanal")
    .select("id")
    .eq("user_id", params.userId)
    .eq("semana_inicio", params.semanaInicioISO)
    .eq("dia_semana", params.diaSemana)
    .eq("tipo_comida", params.tipoComida)
    .limit(1);

  if (existingError) {
    console.error("[plan] Error comprobando slot vacío:", existingError);
    return null;
  }

  if ((existing?.length ?? 0) > 0) {
    return null;
  }

  return assignRecipeToPlan({
    userId: params.userId,
    diaSemana: params.diaSemana,
    tipoComida: params.tipoComida,
    recipeId: params.recipeId,
    semanaInicioISO: params.semanaInicioISO
  });
}

/**
 * Rellena los slots vacíos del día de hoy con recetas sugeridas.
 * No reemplaza comidas ya asignadas salvo `forceReplace`.
 */
export async function fillTodayPlanWithSuggestions(params: {
  userId: string;
  forceReplace?: boolean;
}): Promise<{ assigned: number; dayLabel: WeekDay; skippedOccupied: number }> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return fillDayPlanWithSuggestions({
    userId: params.userId,
    dayLabel: getWeekDayFromDate(today),
    semanaInicioISO: toISODateString(getMondayOfWeek(today)),
    forceReplace: params.forceReplace
  });
}

export type PlanSlotRef = {
  dayLabel: WeekDay;
  mealType: MealType;
};

export type MovePlanMealResult = {
  planEntryId: string;
  source: PlanSlotRef;
  target: PlanSlotRef;
  meal: PlanMeal;
};

/**
 * Mueve una comida concreta a otro día/tiempo (se añade a esa sección).
 * No intercambia ni reemplaza las recetas ya presentes en el destino.
 */
export async function movePlanMeal(params: {
  userId: string;
  semanaInicioISO: string;
  planEntryId: string;
  from: PlanSlotRef;
  to: PlanSlotRef;
}): Promise<MovePlanMealResult | null> {
  const { userId, semanaInicioISO, planEntryId, from, to } = params;

  if (from.dayLabel === to.dayLabel && from.mealType === to.mealType) {
    return null;
  }

  const supabase = createSupabaseClient();
  const orden = await nextSlotOrden({
    userId,
    semanaInicio: semanaInicioISO,
    diaSemana: to.dayLabel,
    tipoComida: to.mealType
  });

  const updateWithOrden = await supabase
    .from("plan_semanal")
    .update({
      dia_semana: to.dayLabel,
      tipo_comida: to.mealType,
      orden
    })
    .eq("id", planEntryId)
    .eq("user_id", userId)
    .eq("semana_inicio", semanaInicioISO)
    .select(PLAN_SELECT)
    .maybeSingle();

  let moved = updateWithOrden.data as PlanRowWithRecipe | null;
  let moveError = updateWithOrden.error;

  if (moveError && isMissingColumnError(moveError)) {
    const legacy = await supabase
      .from("plan_semanal")
      .update({
        dia_semana: to.dayLabel,
        tipo_comida: to.mealType
      })
      .eq("id", planEntryId)
      .eq("user_id", userId)
      .eq("semana_inicio", semanaInicioISO)
      .select(PLAN_SELECT_LEGACY)
      .maybeSingle();
    moved = legacy.data as PlanRowWithRecipe | null;
    moveError = legacy.error;
  }

  if (moveError || !moved) {
    console.error("[plan] Error moviendo comida:", moveError);
    return null;
  }

  const [enriched] = await enrichPlanRowsWithNutrition([moved as PlanRowWithRecipe]);
  const meal = { ...toPlanMeal(enriched), mealType: to.mealType };

  return {
    planEntryId,
    source: from,
    target: to,
    meal
  };
}
