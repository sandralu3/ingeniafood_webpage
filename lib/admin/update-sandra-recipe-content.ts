import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
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

/**
 * Actualiza ingredientes y pasos de una receta propia de Sandra (service role).
 */
export async function updateSandraRecipeContent(params: {
  userId: string;
  recipeId: string;
  ingredients: string[];
  steps: string[];
}): Promise<{ recipeId: string }> {
  const admin = getSupabaseAdminClient();
  const recipeId = params.recipeId.trim();
  if (!recipeId) {
    throw new Error("Falta el id de la receta.");
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
    .select("id, user_id")
    .eq("id", recipeId)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin/update-sandra-recipe-content] fetch:", fetchError);
    throw new Error("No pudimos cargar la receta.");
  }
  if (!recipe) {
    throw new Error("No encontramos esa receta.");
  }
  if (recipe.user_id !== params.userId) {
    throw new Error("Solo puedes editar recetas de tu cuenta.");
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
      updated_at: new Date().toISOString()
    })
    .eq("id", recipe.id)
    .eq("user_id", params.userId);

  if (updateError) {
    console.error("[admin/update-sandra-recipe-content] update:", updateError);
    throw new Error("No pudimos guardar los cambios de la receta.");
  }

  return { recipeId: recipe.id };
}
