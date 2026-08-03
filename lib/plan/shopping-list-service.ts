import type { Database, Json } from "@/types/database.types";
import { isExternalMeal } from "@/lib/plan/external-meal";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";

type PlanRow = Database["public"]["Tables"]["plan_semanal"]["Row"];
type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

type PlanRowWithRecipeIngredients = PlanRow & {
  recipes: Pick<RecipeRow, "id" | "title" | "ingredients" | "tags"> | null;
};

export type PlanRecipeIngredientsRow = {
  recipeId: string;
  title: string;
  ingredients: Json;
};

/**
 * Recetas del plan semanal para la lista de compra.
 * Excluye comidas fuera / escaneadas (ya consumidas; no hay que comprar ingredientes).
 */
export async function fetchWeeklyPlanRecipesForShoppingList(
  userId: string,
  weekStartDate: Date = getMondayOfWeek()
): Promise<PlanRecipeIngredientsRow[]> {
  const supabase = createSupabaseClient();
  const semanaInicio = toISODateString(weekStartDate);

  const { data, error } = await supabase
    .from("plan_semanal")
    .select(
      `
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

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as PlanRowWithRecipeIngredients[];

  return rows
    .map((row) => {
      if (!row.recipes) return null;
      if (isExternalMeal(row.recipes.tags)) return null;
      return {
        recipeId: row.recipes.id,
        title: row.recipes.title,
        ingredients: row.recipes.ingredients
      };
    })
    .filter((x): x is PlanRecipeIngredientsRow => Boolean(x));
}
