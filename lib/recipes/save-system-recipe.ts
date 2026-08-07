import {
  normalizeIngredientsJson,
  structuredIngredientsToJson
} from "@/lib/recipes/structured-ingredients";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database, Json } from "@/types/database.types";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

export const SYSTEM_SOURCE_TAG_PREFIX = "source_system:";

export function systemSourceTag(systemRecipeId: string): string {
  return `${SYSTEM_SOURCE_TAG_PREFIX}${systemRecipeId}`;
}

export function parseSystemSourceId(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    if (tag.startsWith(SYSTEM_SOURCE_TAG_PREFIX)) {
      const id = tag.slice(SYSTEM_SOURCE_TAG_PREFIX.length).trim();
      if (id) return id;
    }
  }
  return null;
}

function tagsWithSystemSource(existing: unknown, systemRecipeId: string): Json {
  const base = Array.isArray(existing)
    ? existing.filter((tag): tag is string => typeof tag === "string")
    : [];
  const withoutSource = base.filter((tag) => !tag.startsWith(SYSTEM_SOURCE_TAG_PREFIX));
  return [...withoutSource, "banco_sistema", systemSourceTag(systemRecipeId)];
}

export type SaveSystemRecipeResult =
  | { success: true; recipeId: string; alreadySaved: boolean }
  | { success: false; error: string };

async function findUserSystemRecipeCopy(
  userId: string,
  systemRecipeId: string,
  title: string
): Promise<string | null> {
  const supabase = createSupabaseClient();
  const sourceTag = systemSourceTag(systemRecipeId);

  const byTag = await supabase
    .from("recipes")
    .select("id, tags")
    .eq("user_id", userId)
    .eq("is_system_recipe", false)
    .contains("tags", [sourceTag])
    .limit(1)
    .maybeSingle();

  if (!byTag.error && byTag.data?.id) {
    return byTag.data.id;
  }

  // Fallback: misma título (antes de tener el tag de origen / si contains no aplica).
  const byTitle = await supabase
    .from("recipes")
    .select("id, tags")
    .eq("user_id", userId)
    .eq("is_system_recipe", false)
    .eq("title", title)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!byTitle.error && byTitle.data) {
    for (const row of byTitle.data) {
      if (parseSystemSourceId(row.tags) === systemRecipeId) {
        return row.id;
      }
    }
    if (byTitle.data[0]?.id) {
      return byTitle.data[0].id;
    }
  }

  return null;
}

/**
 * Guarda una copia de una receta del banco sistema en el recetario del usuario.
 */
export async function saveSystemRecipeToLibrary(
  systemRecipeId: string
): Promise<SaveSystemRecipeResult> {
  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch {
    return { success: false, error: "No se pudo conectar con Supabase." };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Inicia sesión para guardar la receta en tu recetario." };
  }

  const { data: source, error: sourceError } = await supabase
    .from("recipes")
    .select(
      "id,title,description,ingredients,steps,instructions,tip_sandra,cooking_time,image_url,reference_image_url,meal_type,cuisine_style,servings,complexity,tags,is_airfryer,is_flourless,macros,is_system_recipe"
    )
    .eq("id", systemRecipeId)
    .maybeSingle();

  if (sourceError || !source) {
    console.error("[save-system-recipe] Error cargando origen:", sourceError);
    return { success: false, error: "No encontramos esa receta del banco." };
  }

  const systemRecipe = source as RecipeRow;
  if (!systemRecipe.is_system_recipe) {
    return { success: false, error: "Esta receta no pertenece al banco del sistema." };
  }

  const existingId = await findUserSystemRecipeCopy(
    user.id,
    systemRecipe.id,
    systemRecipe.title
  );
  if (existingId) {
    return { success: true, recipeId: existingId, alreadySaved: true };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      title: systemRecipe.title,
      description: systemRecipe.description,
      ingredients: structuredIngredientsToJson(
        normalizeIngredientsJson(systemRecipe.ingredients)
      ),
      steps: systemRecipe.steps as Json,
      instructions: systemRecipe.instructions,
      tip_sandra: systemRecipe.tip_sandra,
      cooking_time: systemRecipe.cooking_time,
      image_url: systemRecipe.image_url,
      reference_image_url: systemRecipe.reference_image_url,
      meal_type: systemRecipe.meal_type,
      cuisine_style: systemRecipe.cuisine_style,
      servings: systemRecipe.servings,
      complexity: systemRecipe.complexity,
      tags: tagsWithSystemSource(systemRecipe.tags, systemRecipe.id),
      is_airfryer: systemRecipe.is_airfryer,
      is_flourless: systemRecipe.is_flourless,
      macros: systemRecipe.macros,
      is_public: false,
      es_instagram: false,
      is_system_recipe: false
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[save-system-recipe] Error insertando copia:", insertError);
    // contains() puede fallar si tags no es jsonb array en algún entorno: reintentar sin dedup tag check already done
    return { success: false, error: "No pudimos guardar la receta en tu recetario." };
  }

  return { success: true, recipeId: inserted.id, alreadySaved: false };
}

export async function findSavedSystemRecipeCopyId(
  systemRecipeId: string
): Promise<string | null> {
  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch {
    return null;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: source } = await supabase
    .from("recipes")
    .select("id, title, is_system_recipe")
    .eq("id", systemRecipeId)
    .maybeSingle();

  if (!source?.is_system_recipe) return null;

  return findUserSystemRecipeCopy(user.id, source.id, source.title);
}
