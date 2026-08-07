import {
  EXTERNAL_MEAL_TAG,
  SCANNED_MEAL_TAG
} from "@/lib/plan/external-meal";
import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";
import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { Json } from "@/types/database.types";

const MIN_COOKING_STEPS = 3;
const EXTERNAL_STUB_RE = /registro de comida externa|sin preparaci[oó]n/i;

function stepsFromJson(raw: Json | null | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((step): step is string => typeof step === "string" && step.trim().length > 0)
    .map((step) => step.trim());
}

function buildInstructions(steps: string[]): string {
  return steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

function stripExternalMealTags(tags: unknown): string[] {
  return normalizeRecipeTags(tags).filter((tag) => {
    const lower = tag.toLowerCase();
    return (
      lower !== EXTERNAL_MEAL_TAG &&
      lower !== SCANNED_MEAL_TAG &&
      lower !== "comida fuera"
    );
  });
}

/**
 * Promueve una receta propia de Sandra al banco global con insignia oficial.
 * Usa service role (bypass RLS) tras autenticar admin en la API.
 */
export async function publishSandraRecipe(params: {
  userId: string;
  recipeId: string;
}): Promise<{ recipeId: string; title: string }> {
  const admin = getSupabaseAdminClient();
  const recipeId = params.recipeId.trim();
  if (!recipeId) {
    throw new Error("Falta el id de la receta.");
  }

  const { data: recipe, error: fetchError } = await admin
    .from("recipes")
    .select(
      "id, user_id, title, steps, instructions, image_url, is_system_recipe, is_sandra_recipe, tags"
    )
    .eq("id", recipeId)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin/publish-sandra-recipe] fetch:", fetchError);
    throw new Error("No pudimos cargar la receta.");
  }
  if (!recipe) {
    throw new Error("No encontramos esa receta.");
  }
  if (recipe.user_id !== params.userId) {
    throw new Error("Solo puedes publicar recetas de tu cuenta.");
  }

  if (recipe.is_sandra_recipe && recipe.is_system_recipe) {
    return { recipeId: recipe.id, title: recipe.title };
  }

  const steps = normalizeRecipeSteps(stepsFromJson(recipe.steps as Json));
  const instructions =
    typeof recipe.instructions === "string" ? recipe.instructions.trim() : "";

  if (steps.length < MIN_COOKING_STEPS) {
    throw new Error(
      "La receta necesita al menos 3 pasos de preparación. Escanea el plato como Admin (foto) para generarlos, o edítalos antes de publicar."
    );
  }
  if (EXTERNAL_STUB_RE.test(instructions) && steps.length < MIN_COOKING_STEPS) {
    throw new Error(
      "Este registro de comida fuera aún no tiene preparación. Vuelve a escanear con foto como Admin."
    );
  }
  if (!recipe.image_url?.trim()) {
    throw new Error(
      "Añade una foto del plato antes de publicar la Receta de Sandra."
    );
  }

  const cleanedTags = stripExternalMealTags(recipe.tags);
  const nextInstructions =
    EXTERNAL_STUB_RE.test(instructions) || !instructions
      ? buildInstructions(steps)
      : instructions;

  const { error: updateError } = await admin
    .from("recipes")
    .update({
      steps,
      instructions: nextInstructions,
      tags: cleanedTags,
      // La foto del plato es la oficial: no marcarla como imagen de referencia.
      reference_image_url: null,
      is_system_recipe: true,
      is_sandra_recipe: true,
      is_public: true,
      updated_at: new Date().toISOString()
    })
    .eq("id", recipe.id)
    .eq("user_id", params.userId);

  if (updateError) {
    console.error("[admin/publish-sandra-recipe] update:", updateError);
    if (
      updateError.code === "42703" ||
      updateError.message?.includes("is_sandra_recipe")
    ) {
      throw new Error(
        "Falta aplicar la migración is_sandra_recipe en Supabase."
      );
    }
    throw new Error("No pudimos publicar la receta en el banco global.");
  }

  return { recipeId: recipe.id, title: recipe.title };
}
