import type { Database, Json } from "@/types/database.types";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";

type PlanRow = Database["public"]["Tables"]["plan_semanal"]["Row"];
type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

type PlanRowWithRecipeIngredients = PlanRow & {
  recipes: Pick<RecipeRow, "id" | "title" | "ingredients"> | null;
};

export type PlanRecipeIngredientsRow = {
  recipeId: string;
  title: string;
  ingredients: Json;
};

export async function fetchWeeklyPlanRecipesForShoppingList(userId: string): Promise<
  PlanRecipeIngredientsRow[]
> {
  const supabase = createSupabaseClient();
  const semanaInicio = toISODateString(getMondayOfWeek());

  const { data, error } = await supabase
    .from("plan_semanal")
    .select(
      `
        recipes (
          id,
          title,
          ingredients
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
      return {
        recipeId: row.recipes.id,
        title: row.recipes.title,
        ingredients: row.recipes.ingredients
      };
    })
    .filter((x): x is PlanRecipeIngredientsRow => Boolean(x));
}

