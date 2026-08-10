import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { fetchUserNutritionGoals } from "@/lib/nutrition/nutrition-profile";
import {
  hasRecipeDietAssignment,
  stampPreferredDietOntoTags
} from "@/lib/recipes/recipe-diet-tags";
import {
  resolveSavedRecipeMealFilter,
  type SavedRecipeMealFilter
} from "@/lib/recipes/saved-recipes-filter";
import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";
import { parseRecipeMealType, type RecipeMealType } from "@/lib/recipes/premium-recipe-filters";
import { isScannerDraftRecipe } from "@/lib/recipes/scanner-draft";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

const DEFAULT_LIMIT = 40;

function mealFilterToType(filter: SavedRecipeMealFilter): RecipeMealType | null {
  switch (filter) {
    case "Desayunos":
      return "desayuno";
    case "Almuerzos":
      return "almuerzo";
    case "Cenas":
      return "cena";
    case "Snacks":
      return "snack";
    case "Postres":
      return "postre";
    default:
      return null;
  }
}

function withMealMomentTag(tags: string[], mealType: RecipeMealType): string[] {
  const moment = /^(desayuno|cena|snack|almuerzo|postre)$/i;
  const cleaned = tags.filter((tag) => !moment.test(tag));
  if (cleaned.some((tag) => tag.toLowerCase() === mealType)) return cleaned;
  return [...cleaned, mealType];
}

export type EnrichOwnedRecipesResult = {
  processed: number;
  updated: number;
  remaining: number;
};

/**
 * Completa meal_type y dietas en recetas propias del usuario (Mías / Fuera),
 * sin IA: infiere tipo por título/tags y sella la dieta del perfil.
 */
export async function enrichOwnedRecipesMissingMetadata(
  supabase: SupabaseClient<Database>,
  userId: string,
  options?: { limit?: number }
): Promise<EnrichOwnedRecipesResult> {
  const limit = Math.min(80, Math.max(1, options?.limit ?? DEFAULT_LIMIT));
  const goals = await fetchUserNutritionGoals(userId, supabase);
  const preferredDiet = goals.preferredDiet;

  const { data, error } = await supabase
    .from("recipes")
    .select("id,title,meal_type,tags,user_id,is_sandra_recipe,description")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) {
    console.error("[enrich-owned-recipes] list:", error);
    throw new Error("No pudimos cargar tus recetas para completar filtros.");
  }

  const candidates = (data ?? []).filter((row) => {
    if (isScannerDraftRecipe(row as RecipeRow)) return false;
    if ((row as { is_sandra_recipe?: boolean }).is_sandra_recipe) return false;
    const needsMeal = !parseRecipeMealType(row.meal_type);
    const needsDiet = !hasRecipeDietAssignment(row.tags);
    return needsMeal || needsDiet;
  });

  const batch = candidates.slice(0, limit);
  let updated = 0;

  for (const row of batch) {
    const needsMeal = !parseRecipeMealType(row.meal_type);
    const needsDiet = !hasRecipeDietAssignment(row.tags);
    if (!needsMeal && !needsDiet) continue;

    const patch: {
      meal_type?: string;
      tags?: string[];
      updated_at: string;
    } = { updated_at: new Date().toISOString() };

    let nextTags = normalizeRecipeTags(row.tags);

    if (needsMeal) {
      const resolved = resolveSavedRecipeMealFilter({
        title: row.title,
        meal_type: row.meal_type,
        tags: row.tags
      });
      // Sin señal clara → almuerzo (mismo criterio que comidas fuera sin tipo).
      const mealType = (resolved ? mealFilterToType(resolved) : null) ?? "almuerzo";
      patch.meal_type = mealType;
      nextTags = withMealMomentTag(nextTags, mealType);
    }

    if (needsDiet) {
      nextTags = stampPreferredDietOntoTags(nextTags, preferredDiet);
    }

    if (needsDiet || needsMeal) {
      patch.tags = nextTags;
    }

    const { error: updateError } = await supabase
      .from("recipes")
      .update(patch)
      .eq("id", row.id)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[enrich-owned-recipes] update:", updateError);
      continue;
    }
    updated += 1;
  }

  const remaining = Math.max(0, candidates.length - updated);
  return {
    processed: batch.length,
    updated,
    remaining
  };
}

export async function countOwnedRecipesNeedingEnrichment(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id,title,meal_type,tags,is_sandra_recipe,description")
    .eq("user_id", userId)
    .limit(400);

  if (error) return 0;

  return (data ?? []).filter((row) => {
    if (isScannerDraftRecipe(row as RecipeRow)) return false;
    if ((row as { is_sandra_recipe?: boolean }).is_sandra_recipe) return false;
    return !parseRecipeMealType(row.meal_type) || !hasRecipeDietAssignment(row.tags);
  }).length;
}
