import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { parsePreferredDiet, type PreferredDiet } from "@/lib/nutrition/preferred-diet";
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
import { parseMacrosFromJson } from "@/lib/recipes/recipe-macros";

type AdminClient = SupabaseClient<Database>;
type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

const PAGE_SIZE = 1000;

export type RecipeMetadataGapRow = {
  id: string;
  title: string;
  user_id: string | null;
  is_sandra_recipe: boolean;
  needs_meal_type: boolean;
  needs_diet: boolean;
  needs_macros: boolean;
};

export type RecipeMetadataAudit = {
  sandra: {
    total: number;
    missingDiet: number;
    missingMacros: number;
    missingMealType: number;
    needingAiEnrich: number;
  };
  owned: {
    total: number;
    missingMealType: number;
    missingDiet: number;
    needingHeuristic: number;
    byUser: Array<{ userId: string; pending: number }>;
  };
};

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

function inferMealType(row: {
  title: string | null;
  meal_type: string | null;
  tags: unknown;
}): RecipeMealType {
  const resolved = resolveSavedRecipeMealFilter({
    title: row.title,
    meal_type: row.meal_type,
    tags: row.tags
  });
  return (resolved ? mealFilterToType(resolved) : null) ?? "almuerzo";
}

async function fetchAllRecipeRows(
  admin: AdminClient,
  select: string,
  filterSandra: boolean | "any"
): Promise<
  Array<{
    id: string;
    title: string;
    user_id: string | null;
    meal_type: string | null;
    tags: unknown;
    macros: unknown;
    description: string | null;
    is_sandra_recipe: boolean | null;
  }>
> {
  const rows: Array<{
    id: string;
    title: string;
    user_id: string | null;
    meal_type: string | null;
    tags: unknown;
    macros: unknown;
    description: string | null;
    is_sandra_recipe: boolean | null;
  }> = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = admin
      .from("recipes")
      .select(select)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (filterSandra === true) {
      query = query.eq("is_sandra_recipe", true);
    } else if (filterSandra === false) {
      query = query.or("is_sandra_recipe.is.null,is_sandra_recipe.eq.false");
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`No pudimos listar recetas: ${error.message}`);
    }
    const batch = (data ?? []) as typeof rows;
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

export async function auditRecipeMetadataGaps(admin: AdminClient): Promise<RecipeMetadataAudit> {
  const [sandraRows, ownedRows] = await Promise.all([
    fetchAllRecipeRows(
      admin,
      "id,title,user_id,meal_type,tags,macros,description,is_sandra_recipe",
      true
    ),
    fetchAllRecipeRows(
      admin,
      "id,title,user_id,meal_type,tags,macros,description,is_sandra_recipe",
      false
    )
  ]);

  const ownedPending = ownedRows.filter((row) => {
    if (isScannerDraftRecipe(row as RecipeRow)) return false;
    return !parseRecipeMealType(row.meal_type) || !hasRecipeDietAssignment(row.tags);
  });

  const byUserMap = new Map<string, number>();
  for (const row of ownedPending) {
    const userId = row.user_id ?? "unknown";
    byUserMap.set(userId, (byUserMap.get(userId) ?? 0) + 1);
  }

  let missingDiet = 0;
  let missingMacros = 0;
  let missingMealType = 0;
  let needingAiEnrich = 0;
  for (const row of sandraRows) {
    const needsDiet = !hasRecipeDietAssignment(row.tags);
    const needsMacros = parseMacrosFromJson(row.macros as Json | null) === null;
    const needsMeal = !parseRecipeMealType(row.meal_type);
    if (needsDiet) missingDiet += 1;
    if (needsMacros) missingMacros += 1;
    if (needsMeal) missingMealType += 1;
    if (needsDiet || needsMacros) needingAiEnrich += 1;
  }

  return {
    sandra: {
      total: sandraRows.length,
      missingDiet,
      missingMacros,
      missingMealType,
      needingAiEnrich
    },
    owned: {
      total: ownedRows.filter((row) => !isScannerDraftRecipe(row as RecipeRow)).length,
      missingMealType: ownedPending.filter((row) => !parseRecipeMealType(row.meal_type)).length,
      missingDiet: ownedPending.filter((row) => !hasRecipeDietAssignment(row.tags)).length,
      needingHeuristic: ownedPending.length,
      byUser: Array.from(byUserMap.entries())
        .map(([userId, pending]) => ({ userId, pending }))
        .sort((a, b) => b.pending - a.pending)
    }
  };
}

async function loadPreferredDietByUser(
  admin: AdminClient,
  userIds: string[]
): Promise<Map<string, PreferredDiet>> {
  const map = new Map<string, PreferredDiet>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const chunk = 200;

  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk);
    const { data, error } = await admin
      .from("profiles")
      .select("id,preferred_diet")
      .in("id", slice);

    if (error) {
      console.warn("[enrich-recipes-bulk] profiles:", error.message);
      continue;
    }

    for (const row of data ?? []) {
      map.set(row.id, parsePreferredDiet(row.preferred_diet) ?? "estandar");
    }
  }

  return map;
}

export type BulkEnrichResult = {
  scanned: number;
  updated: number;
  skipped: number;
  errors: number;
};

/**
 * Completa meal_type + diet:* en recetas de usuarios (no Sandra), con service role.
 */
export async function enrichAllOwnedRecipesMissingMetadata(
  admin: AdminClient,
  options?: { dryRun?: boolean; limit?: number }
): Promise<BulkEnrichResult> {
  const dryRun = Boolean(options?.dryRun);
  const limit = options?.limit && options.limit > 0 ? options.limit : Infinity;

  const rows = await fetchAllRecipeRows(
    admin,
    "id,title,user_id,meal_type,tags,macros,description,is_sandra_recipe",
    false
  );

  const candidates = rows.filter((row) => {
    if (isScannerDraftRecipe(row as RecipeRow)) return false;
    return !parseRecipeMealType(row.meal_type) || !hasRecipeDietAssignment(row.tags);
  });

  const batch = candidates.slice(0, Number.isFinite(limit) ? limit : candidates.length);
  const diets = await loadPreferredDietByUser(
    admin,
    batch.map((row) => row.user_id).filter((id): id is string => Boolean(id))
  );

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of batch) {
    const needsMeal = !parseRecipeMealType(row.meal_type);
    const needsDiet = !hasRecipeDietAssignment(row.tags);
    if (!needsMeal && !needsDiet) {
      skipped += 1;
      continue;
    }

    const preferredDiet = row.user_id ? diets.get(row.user_id) ?? "estandar" : "estandar";
    let nextTags = normalizeRecipeTags(row.tags);
    const patch: {
      meal_type?: string;
      tags?: string[];
      updated_at: string;
    } = { updated_at: new Date().toISOString() };

    if (needsMeal) {
      const mealType = inferMealType(row);
      patch.meal_type = mealType;
      nextTags = withMealMomentTag(nextTags, mealType);
    }
    if (needsDiet) {
      nextTags = stampPreferredDietOntoTags(nextTags, preferredDiet);
    }
    if (needsMeal || needsDiet) {
      patch.tags = nextTags;
    }

    if (dryRun) {
      updated += 1;
      continue;
    }

    const { error } = await admin.from("recipes").update(patch).eq("id", row.id);
    if (error) {
      console.error(`[enrich-recipes-bulk] owned ${row.id}:`, error.message);
      errors += 1;
      continue;
    }
    updated += 1;
  }

  return {
    scanned: batch.length,
    updated,
    skipped,
    errors
  };
}

/**
 * Completa solo meal_type en catálogo Sandra (heurística, sin IA).
 */
export async function enrichSandraRecipesMissingMealType(
  admin: AdminClient,
  options?: { dryRun?: boolean; limit?: number }
): Promise<BulkEnrichResult> {
  const dryRun = Boolean(options?.dryRun);
  const limit = options?.limit && options.limit > 0 ? options.limit : Infinity;

  const rows = await fetchAllRecipeRows(
    admin,
    "id,title,user_id,meal_type,tags,macros,description,is_sandra_recipe",
    true
  );

  const candidates = rows.filter((row) => !parseRecipeMealType(row.meal_type));
  const batch = candidates.slice(0, Number.isFinite(limit) ? limit : candidates.length);

  let updated = 0;
  let errors = 0;

  for (const row of batch) {
    const mealType = inferMealType(row);
    const nextTags = withMealMomentTag(normalizeRecipeTags(row.tags), mealType);
    const patch = {
      meal_type: mealType,
      tags: nextTags,
      updated_at: new Date().toISOString()
    };

    if (dryRun) {
      updated += 1;
      continue;
    }

    const { error } = await admin.from("recipes").update(patch).eq("id", row.id);
    if (error) {
      console.error(`[enrich-recipes-bulk] sandra meal ${row.id}:`, error.message);
      errors += 1;
      continue;
    }
    updated += 1;
  }

  return {
    scanned: batch.length,
    updated,
    skipped: 0,
    errors
  };
}
