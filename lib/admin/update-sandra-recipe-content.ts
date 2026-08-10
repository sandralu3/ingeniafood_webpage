import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
import {
  parseRecipeMealType,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";
import {
  stringsToStructuredIngredients,
  structuredIngredientsToJson
} from "@/lib/recipes/structured-ingredients";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

function buildInstructions(steps: string[]): string {
  return steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

function cleanLines(lines: unknown): string[] {
  if (!Array.isArray(lines)) return [];
  return lines
    .filter((line): line is string => typeof line === "string")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const MEAL_MOMENT_TAG = /^(desayuno|cena|snack|almuerzo|postre)$/i;

function withMealTypeTag(tags: unknown, mealType: RecipeMealType): string[] {
  const cleaned = normalizeRecipeTags(tags).filter((tag) => !MEAL_MOMENT_TAG.test(tag));
  return [...cleaned, mealType];
}

/**
 * Actualiza ingredientes, pasos y tipo de comida de una receta de Sandra (service role).
 */
export async function updateSandraRecipeContent(params: {
  userId: string;
  recipeId: string;
  ingredients: string[];
  steps: string[];
  mealType: RecipeMealType;
}): Promise<{ recipeId: string; mealType: RecipeMealType }> {
  const admin = getSupabaseAdminClient();
  const recipeId = params.recipeId.trim();
  if (!recipeId) {
    throw new Error("Falta el id de la receta.");
  }

  const mealType = parseRecipeMealType(params.mealType);
  if (!mealType) {
    throw new Error(
      "Elige un tipo de comida válido (desayuno, almuerzo, cena, postre o snack)."
    );
  }

  const ingredients = cleanLines(params.ingredients);
  const steps = normalizeRecipeSteps(cleanLines(params.steps));

  if (ingredients.length === 0) {
    throw new Error("Añade al menos un ingrediente.");
  }
  if (steps.length === 0) {
    throw new Error("Añade al menos un paso de preparación.");
  }

  const { data: recipe, error: fetchError } = await admin
    .from("recipes")
    .select("id, user_id, is_sandra_recipe, es_instagram, is_public, tags")
    .eq("id", recipeId)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin/update-sandra-recipe-content] fetch:", fetchError);
    throw new Error("No pudimos cargar la receta.");
  }
  if (!recipe) {
    throw new Error("No encontramos esa receta.");
  }

  const isOwned = recipe.user_id === params.userId;
  const isSandraCatalog = Boolean(recipe.is_sandra_recipe);
  const isPublicInstagram = Boolean(recipe.es_instagram && recipe.is_public);
  if (!isOwned && !isSandraCatalog && !isPublicInstagram) {
    throw new Error("Solo puedes editar tus recetas o el catálogo de Sandra.");
  }

  const structured = structuredIngredientsToJson(
    stringsToStructuredIngredients(ingredients)
  );

  const { error: updateError } = await admin
    .from("recipes")
    .update({
      ingredients: structured,
      steps,
      instructions: buildInstructions(steps),
      meal_type: mealType,
      tags: withMealTypeTag(recipe.tags, mealType),
      updated_at: new Date().toISOString()
    })
    .eq("id", recipe.id);

  if (updateError) {
    console.error("[admin/update-sandra-recipe-content] update:", updateError);
    throw new Error("No pudimos guardar los cambios de la receta.");
  }

  return { recipeId: recipe.id, mealType };
}
