import type { Database, Json } from "@/types/database.types";
import { isExternalMeal } from "@/lib/plan/external-meal";
import type { WeekDay } from "@/lib/plan/constants";
import { WEEK_DAYS } from "@/lib/plan/constants";
import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  getMondayOfWeek,
  isPlanDayInThePast,
  toISODateString
} from "@/lib/plan/week-utils";

type PlanRow = Database["public"]["Tables"]["plan_semanal"]["Row"];
type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

type PlanRowWithRecipeIngredients = Pick<
  PlanRow,
  "dia_semana" | "consumido"
> & {
  consumido?: boolean | null;
  recipes: Pick<RecipeRow, "id" | "title" | "ingredients" | "tags"> | null;
};

export type PlanRecipeIngredientsRow = {
  recipeId: string;
  title: string;
  ingredients: Json;
};

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function asWeekDay(value: string): WeekDay | null {
  return WEEK_DAYS.includes(value as WeekDay) ? (value as WeekDay) : null;
}

/**
 * Recetas del plan semanal para la lista de compra.
 * Excluye:
 * - comidas registradas (foto/texto) — ya consumidas
 * - platos marcados «Ya comí»
 * - días pasados (los ingredientes ya se usaron)
 */
export async function fetchWeeklyPlanRecipesForShoppingList(
  userId: string,
  weekStartDate: Date = getMondayOfWeek()
): Promise<PlanRecipeIngredientsRow[]> {
  const supabase = createSupabaseClient();
  const semanaInicio = toISODateString(weekStartDate);

  const primary = await supabase
    .from("plan_semanal")
    .select(
      `
        dia_semana,
        consumido,
        recipes (
          id,
          title,
          ingredients,
          tags
        )
      `
    )
    .eq("user_id", userId)
    .eq("semana_inicio", semanaInicio);

  let rows: PlanRowWithRecipeIngredients[] = [];

  if (primary.error && isMissingColumnError(primary.error)) {
    const legacy = await supabase
      .from("plan_semanal")
      .select(
        `
          dia_semana,
          recipes (
            id,
            title,
            ingredients,
            tags
          )
        `
      )
      .eq("user_id", userId)
      .eq("semana_inicio", semanaInicio);

    if (legacy.error) throw legacy.error;
    rows = (legacy.data ?? []) as PlanRowWithRecipeIngredients[];
  } else if (primary.error) {
    throw primary.error;
  } else {
    rows = (primary.data ?? []) as PlanRowWithRecipeIngredients[];
  }

  return rows
    .map((row) => {
      if (!row.recipes) return null;
      if (isExternalMeal(row.recipes.tags)) return null;
      if (row.consumido) return null;

      const dayLabel = asWeekDay(row.dia_semana);
      if (dayLabel && isPlanDayInThePast(semanaInicio, dayLabel)) return null;

      return {
        recipeId: row.recipes.id,
        title: row.recipes.title,
        ingredients: row.recipes.ingredients
      };
    })
    .filter((x): x is PlanRecipeIngredientsRow => Boolean(x));
}
