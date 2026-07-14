import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { macrosToJson, type RecipeMacros } from "@/lib/recipes/recipe-macros";

type RecipesInsert = Database["public"]["Tables"]["recipes"]["Insert"];

export type SaveGeneratedRecipeInput = {
  userId: string;
  title: string;
  ingredients: Json;
  steps: string[];
  instructions: string;
  tipSandra: string;
  isAirfryer: boolean;
  isFlourless: boolean;
  macronutrientes?: RecipeMacros | null;
  imageUrl?: string | null;
};

function isMissingColumnError(
  error: { code?: string; message?: string } | null,
  column: string
): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.message?.includes(`column recipes.${column} does not exist`) === true ||
    error.message?.includes(`Could not find the '${column}' column`) === true
  );
}

function buildInsertPayload(input: SaveGeneratedRecipeInput, options?: { includeSteps?: boolean; includeMacros?: boolean; includeTip?: boolean }): RecipesInsert {
  const includeSteps = options?.includeSteps !== false;
  const includeMacros = options?.includeMacros !== false && Boolean(input.macronutrientes);
  const includeTip = options?.includeTip !== false;

  const payload: RecipesInsert = {
    user_id: input.userId,
    title: input.title,
    ingredients: input.ingredients,
    instructions: input.instructions,
    image_url: input.imageUrl ?? null,
    is_airfryer: input.isAirfryer,
    is_flourless: input.isFlourless,
    is_public: false
  };

  if (includeSteps) {
    payload.steps = input.steps;
  }

  if (includeTip) {
    payload.tip_sandra = input.tipSandra;
  }

  if (includeMacros && input.macronutrientes) {
    payload.macros = macrosToJson(input.macronutrientes);
  }

  return payload;
}

export async function saveGeneratedRecipeToLibrary(
  supabase: SupabaseClient<Database>,
  input: SaveGeneratedRecipeInput
): Promise<{ recipeId: string } | { error: string }> {
  const attempts: Array<{ includeSteps?: boolean; includeMacros?: boolean; includeTip?: boolean }> = [
    { includeSteps: true, includeMacros: true, includeTip: true },
    { includeSteps: true, includeMacros: false, includeTip: true },
    { includeSteps: false, includeMacros: false, includeTip: true },
    { includeSteps: false, includeMacros: false, includeTip: false }
  ];

  let lastError: { code?: string; message?: string } | null = null;

  for (const options of attempts) {
    const { data, error } = await supabase
      .from("recipes")
      .insert(buildInsertPayload(input, options))
      .select("id")
      .single();

    if (!error && data?.id) {
      return { recipeId: data.id };
    }

    lastError = error;

    const missingOptionalColumn =
      isMissingColumnError(error, "macros") ||
      isMissingColumnError(error, "steps") ||
      isMissingColumnError(error, "tip_sandra");

    if (!missingOptionalColumn) {
      break;
    }
  }

  console.error("[save-generated-recipe] Error insertando receta:", lastError);

  return {
    error:
      lastError?.message?.trim() ||
      "No pudimos guardar la receta. Inténtalo nuevamente."
  };
}
