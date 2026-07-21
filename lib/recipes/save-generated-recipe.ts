import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { macrosToJson, type RecipeMacros } from "@/lib/recipes/recipe-macros";
import type { AppliedRecipeFilters } from "@/lib/recipes/premium-recipe-filters";
import {
  parseRecipeComplexity,
  parseRecipeCuisineStyle,
  parseRecipeMealType,
  parseRecipeServings,
  FREE_DEFAULT_COMPLEXITY,
  FREE_DEFAULT_SERVINGS
} from "@/lib/recipes/premium-recipe-filters";
import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";

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
  tags?: string[];
  macronutrientes?: RecipeMacros | null;
  cookingTimeMinutes?: number | null;
  imageUrl?: string | null;
  referenceImageUrl?: string | null;
  appliedFilters?: AppliedRecipeFilters | null;
  mealTypeAdvisory?: string | null;
};

type InsertOptions = {
  includeSteps?: boolean;
  includeMacros?: boolean;
  includeTip?: boolean;
  includeScanMetadata?: boolean;
  includeTags?: boolean;
  includeCookingTime?: boolean;
};

function isMissingColumnError(
  error: { code?: string; message?: string } | null,
  column: string
): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes(`column recipes.${column} does not exist`) === true ||
    error.message?.includes(`Could not find the '${column}' column`) === true ||
    error.message?.includes(column) === true
  );
}

function buildInsertPayload(input: SaveGeneratedRecipeInput, options?: InsertOptions): RecipesInsert {
  const includeSteps = options?.includeSteps !== false;
  const includeMacros = options?.includeMacros !== false && Boolean(input.macronutrientes);
  const includeTip = options?.includeTip !== false;
  const includeScanMetadata = options?.includeScanMetadata !== false;
  const includeTags = options?.includeTags !== false && Boolean(input.tags?.length);
  const includeCookingTime =
    options?.includeCookingTime !== false &&
    typeof input.cookingTimeMinutes === "number" &&
    input.cookingTimeMinutes > 0;

  // `imageUrl: null` explícito = foto Premium pendiente (no usar la referencia como primaria).
  const primaryImage =
    input.imageUrl !== undefined
      ? input.imageUrl
      : (input.referenceImageUrl ?? null);

  const payload: RecipesInsert = {
    user_id: input.userId,
    title: input.title,
    ingredients: input.ingredients,
    instructions: input.instructions,
    image_url: primaryImage,
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

  if (includeCookingTime) {
    payload.cooking_time = input.cookingTimeMinutes!;
  }

  if (includeTags && input.tags) {
    payload.tags = input.tags;
  }

  if (includeScanMetadata) {
    payload.reference_image_url = input.referenceImageUrl ?? null;
    payload.meal_type = input.appliedFilters?.mealType ?? null;
    payload.cuisine_style = input.appliedFilters?.cuisineStyle ?? null;
    payload.servings = input.appliedFilters?.servings ?? null;
    payload.complexity = input.appliedFilters?.complexity ?? null;
    payload.meal_type_advisory = input.mealTypeAdvisory?.trim() || null;
  }

  return payload;
}

export async function saveGeneratedRecipeToLibrary(
  supabase: SupabaseClient<Database>,
  input: SaveGeneratedRecipeInput
): Promise<{ recipeId: string } | { error: string }> {
  const attempts: InsertOptions[] = [
    {
      includeSteps: true,
      includeMacros: true,
      includeTip: true,
      includeScanMetadata: true,
      includeTags: true,
      includeCookingTime: true
    },
    {
      includeSteps: true,
      includeMacros: true,
      includeTip: true,
      includeScanMetadata: false,
      includeTags: false,
      includeCookingTime: true
    },
    {
      includeSteps: true,
      includeMacros: false,
      includeTip: true,
      includeScanMetadata: false,
      includeTags: false,
      includeCookingTime: false
    },
    {
      includeSteps: false,
      includeMacros: false,
      includeTip: true,
      includeScanMetadata: false,
      includeTags: false,
      includeCookingTime: false
    },
    {
      includeSteps: false,
      includeMacros: false,
      includeTip: false,
      includeScanMetadata: false,
      includeTags: false,
      includeCookingTime: false
    }
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
      isMissingColumnError(error, "tip_sandra") ||
      isMissingColumnError(error, "reference_image_url") ||
      isMissingColumnError(error, "meal_type") ||
      isMissingColumnError(error, "cuisine_style") ||
      isMissingColumnError(error, "meal_type_advisory") ||
      isMissingColumnError(error, "servings") ||
      isMissingColumnError(error, "complexity") ||
      isMissingColumnError(error, "tags") ||
      isMissingColumnError(error, "cooking_time");

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

export function parseStoredAppliedFilters(recipe: {
  meal_type?: string | null;
  cuisine_style?: string | null;
  servings?: number | null;
  complexity?: string | null;
}): AppliedRecipeFilters | null {
  const mealType = parseRecipeMealType(recipe.meal_type);
  const cuisineStyle = parseRecipeCuisineStyle(recipe.cuisine_style);
  const servings = parseRecipeServings(recipe.servings) ?? FREE_DEFAULT_SERVINGS;
  const complexity = parseRecipeComplexity(recipe.complexity) ?? FREE_DEFAULT_COMPLEXITY;
  if (!mealType && !cuisineStyle && !recipe.servings && !recipe.complexity) return null;
  return {
    mealType: mealType ?? "almuerzo",
    cuisineStyle: cuisineStyle ?? "estandar",
    servings,
    complexity
  };
}

export function parseStoredRecipeTags(recipe: {
  tags?: Json | null;
  is_airfryer?: boolean;
  is_flourless?: boolean;
}): string[] {
  const fromJson = normalizeRecipeTags(recipe.tags);
  if (fromJson.length > 0) return fromJson;
  const legacy: string[] = [];
  if (recipe.is_flourless) legacy.push("Sin Harinas");
  if (recipe.is_airfryer) legacy.push("Apto para Airfryer");
  return legacy;
}

export function parseCookingMinutesFromLabel(tiempo: string): number | null {
  const match = tiempo.match(/(\d+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}
