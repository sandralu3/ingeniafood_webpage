import { estimateSandraRecipeDietsAndMacros } from "@/lib/admin/estimate-sandra-recipe-enrichment";
import {
  getRecipeDietsFromTags,
  hasRecipeDietAssignment,
  parsePreferredDietList,
  withRecipeDietTags,
  type AssignableRecipeDiet
} from "@/lib/recipes/recipe-diet-tags";
import { macrosToJson, parseMacrosFromJson } from "@/lib/recipes/recipe-macros";
import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";
import { ingredientsJsonToDisplayStrings } from "@/lib/recipes/structured-ingredients";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { Json } from "@/types/database.types";

const LIST_SELECT =
  "id,title,image_url,instagram_url,meal_type,tags,is_flourless,is_sandra_recipe,es_instagram,macros,created_at";

const ENRICH_SELECT =
  "id,title,ingredients,steps,instructions,meal_type,tags,is_flourless,is_sandra_recipe,macros,servings";

const DEFAULT_BATCH_LIMIT = 4;
const MAX_BATCH_LIMIT = 8;

export type AdminSandraRecipeListItem = {
  id: string;
  title: string;
  image_url: string | null;
  instagram_url: string | null;
  meal_type: string | null;
  diets: AssignableRecipeDiet[];
  has_diet_assignment: boolean;
  is_flourless: boolean;
  es_instagram: boolean;
  has_macros: boolean;
  created_at: string;
};

export type SandraEnrichBatchResult = {
  processed: number;
  updated: number;
  skipped: number;
  failed: Array<{ id: string; title: string; error: string }>;
  remaining: number;
  recipes: AdminSandraRecipeListItem[];
};

function macrosPresent(macros: Json | null): boolean {
  return parseMacrosFromJson(macros) !== null;
}

function mapRow(row: {
  id: string;
  title: string;
  image_url: string | null;
  instagram_url: string | null;
  meal_type: string | null;
  tags: Json;
  is_flourless: boolean | null;
  es_instagram: boolean | null;
  macros: Json | null;
  created_at: string;
}): AdminSandraRecipeListItem {
  return {
    id: row.id,
    title: row.title,
    image_url: row.image_url,
    instagram_url: row.instagram_url,
    meal_type: row.meal_type,
    diets: getRecipeDietsFromTags(row.tags),
    has_diet_assignment: hasRecipeDietAssignment(row.tags),
    is_flourless: Boolean(row.is_flourless),
    es_instagram: Boolean(row.es_instagram),
    has_macros: macrosPresent(row.macros),
    created_at: row.created_at
  };
}

function stepsFromRow(steps: Json, instructions: string | null): string[] {
  if (Array.isArray(steps)) {
    const fromSteps = steps
      .map((step) => (typeof step === "string" ? step.trim() : String(step).trim()))
      .filter(Boolean);
    if (fromSteps.length > 0) return fromSteps;
  }
  if (!instructions) return [];
  return instructions
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function needsEnrichment(row: {
  tags: Json;
  macros: Json | null;
}): { needsDiets: boolean; needsMacros: boolean } {
  return {
    needsDiets: !hasRecipeDietAssignment(row.tags),
    needsMacros: !macrosPresent(row.macros)
  };
}

export async function fetchSandraRecipesForAdmin(): Promise<AdminSandraRecipeListItem[]> {
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("recipes")
    .select(LIST_SELECT)
    .eq("is_sandra_recipe", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/sandra-recipes] list error:", error);
    throw new Error("No pudimos cargar las recetas de Sandra.");
  }

  return (data ?? []).map((row) => mapRow(row as Parameters<typeof mapRow>[0]));
}

export async function countSandraRecipesNeedingEnrichment(
  excludeIds: string[] = []
): Promise<number> {
  const admin = getSupabaseAdminClient();
  const exclude = new Set(excludeIds.filter(Boolean));

  const { data, error } = await admin
    .from("recipes")
    .select("id,tags,macros")
    .eq("is_sandra_recipe", true);

  if (error) {
    console.error("[admin/sandra-recipes] count enrich:", error);
    throw new Error("No pudimos contar las recetas pendientes.");
  }

  return (data ?? []).filter((row) => {
    if (exclude.has(row.id)) return false;
    const need = needsEnrichment(row);
    return need.needsDiets || need.needsMacros;
  }).length;
}

export async function updateSandraRecipeDiets(params: {
  recipeId: string;
  diets: unknown;
}): Promise<AdminSandraRecipeListItem> {
  const admin = getSupabaseAdminClient();
  const recipeId = params.recipeId.trim();
  if (!recipeId) {
    throw new Error("Falta el id de la receta.");
  }

  const diets = parsePreferredDietList(params.diets);

  const { data: recipe, error: fetchError } = await admin
    .from("recipes")
    .select(LIST_SELECT)
    .eq("id", recipeId)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin/sandra-recipes] fetch:", fetchError);
    throw new Error("No pudimos cargar la receta.");
  }
  if (!recipe || !recipe.is_sandra_recipe) {
    throw new Error("Solo puedes etiquetar dietas en recetas del catálogo de Sandra.");
  }

  const nextTags = withRecipeDietTags(recipe.tags, diets);
  const shouldBeFlourless =
    diets.includes("sin_harinas") ||
    normalizeRecipeTags(nextTags).some((tag) => /sin\s+harinas?/i.test(tag));

  const { data: updated, error: updateError } = await admin
    .from("recipes")
    .update({
      tags: nextTags,
      is_flourless: shouldBeFlourless,
      updated_at: new Date().toISOString()
    })
    .eq("id", recipe.id)
    .select(LIST_SELECT)
    .maybeSingle();

  if (updateError || !updated) {
    console.error("[admin/sandra-recipes] update diets:", updateError);
    throw new Error("No pudimos guardar las dietas de la receta.");
  }

  return mapRow(updated as Parameters<typeof mapRow>[0]);
}

/**
 * Completa con IA dietas y/o macros solo cuando faltan (no sobrescribe).
 * Procesa un lote pequeño; el cliente puede repetir hasta remaining=0.
 */
export async function enrichMissingSandraRecipesBatch(params?: {
  limit?: number;
  excludeIds?: string[];
}): Promise<SandraEnrichBatchResult> {
  const admin = getSupabaseAdminClient();
  const limit = Math.min(
    MAX_BATCH_LIMIT,
    Math.max(1, Math.floor(params?.limit ?? DEFAULT_BATCH_LIMIT))
  );
  const exclude = new Set((params?.excludeIds ?? []).filter(Boolean));

  const { data, error } = await admin
    .from("recipes")
    .select(ENRICH_SELECT)
    .eq("is_sandra_recipe", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/sandra-recipes] enrich list:", error);
    throw new Error("No pudimos cargar las recetas para enriquecer.");
  }

  const candidates = (data ?? []).filter((row) => {
    if (exclude.has(row.id)) return false;
    const need = needsEnrichment(row);
    return need.needsDiets || need.needsMacros;
  });

  const batch = candidates.slice(0, limit);

  const failed: SandraEnrichBatchResult["failed"] = [];
  const updatedRecipes: AdminSandraRecipeListItem[] = [];
  let updated = 0;
  let skipped = 0;

  for (const row of batch) {
    const need = needsEnrichment(row);
    if (!need.needsDiets && !need.needsMacros) {
      skipped += 1;
      continue;
    }

    try {
      const ingredients = ingredientsJsonToDisplayStrings(row.ingredients);
      const steps = stepsFromRow(row.steps, row.instructions);
      const estimate = await estimateSandraRecipeDietsAndMacros({
        title: row.title,
        ingredients,
        steps,
        mealType: row.meal_type,
        servings: typeof row.servings === "number" ? row.servings : 2
      });

      const patch: {
        tags?: string[];
        is_flourless?: boolean;
        macros?: Json;
        updated_at: string;
      } = {
        updated_at: new Date().toISOString()
      };

      let changed = false;

      if (need.needsDiets) {
        const nextTags = withRecipeDietTags(row.tags, estimate.diets);
        patch.tags = nextTags;
        patch.is_flourless =
          estimate.diets.includes("sin_harinas") ||
          normalizeRecipeTags(nextTags).some((tag) => /sin\s+harinas?/i.test(tag)) ||
          Boolean(row.is_flourless);
        changed = true;
      }

      if (need.needsMacros) {
        patch.macros = macrosToJson(estimate.macros);
        changed = true;
      }

      if (!changed) {
        skipped += 1;
        continue;
      }

      const { data: saved, error: updateError } = await admin
        .from("recipes")
        .update(patch)
        .eq("id", row.id)
        .select(LIST_SELECT)
        .maybeSingle();

      if (updateError || !saved) {
        console.error("[admin/sandra-recipes] enrich update:", updateError);
        failed.push({
          id: row.id,
          title: row.title,
          error: "No pudimos guardar el resultado de la IA."
        });
        continue;
      }

      updated += 1;
      updatedRecipes.push(mapRow(saved as Parameters<typeof mapRow>[0]));
    } catch (enrichError) {
      failed.push({
        id: row.id,
        title: row.title,
        error:
          enrichError instanceof Error
            ? enrichError.message
            : "Error al enriquecer la receta con IA."
      });
    }
  }

  const nextExclude = [...Array.from(exclude), ...failed.map((item) => item.id)];
  const remaining = await countSandraRecipesNeedingEnrichment(nextExclude);

  return {
    processed: batch.length,
    updated,
    skipped,
    failed,
    remaining,
    recipes: updatedRecipes
  };
}
