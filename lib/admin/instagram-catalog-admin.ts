import type { StructuredInstagramRecipe } from "@/lib/admin/instagram-recipe-extractor";
import { buildTagsFromLegacyFlags } from "@/lib/recipes/recipe-tags";
import { ingredientsJsonToDisplayStrings } from "@/lib/recipes/structured-ingredients";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { Json } from "@/types/database.types";

const ADMIN_CATALOG_SELECT =
  "id,title,image_url,instagram_url,is_airfryer,is_flourless,ingredients,steps,instructions,created_at,es_instagram,is_public";

export type AdminInstagramCatalogListItem = {
  id: string;
  title: string;
  image_url: string | null;
  instagram_url: string | null;
  created_at: string;
};

export type AdminInstagramCatalogDetail = AdminInstagramCatalogListItem & {
  recipe: StructuredInstagramRecipe;
};

function stepsJsonToStringArray(steps: Json): string[] {
  if (!Array.isArray(steps)) return [];

  return steps
    .map((step) => (typeof step === "string" ? step.trim() : String(step).trim()))
    .filter(Boolean);
}

function instructionsToSteps(instructions: string): string[] {
  return instructions
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

export function recipeRowToStructuredRecipe(row: {
  title: string;
  ingredients: Json;
  steps: Json;
  instructions: string;
  is_airfryer: boolean;
  is_flourless: boolean;
}): StructuredInstagramRecipe {
  const ingredientes = ingredientsJsonToDisplayStrings(row.ingredients);
  const preparacion = stepsJsonToStringArray(row.steps);
  const tags = buildTagsFromLegacyFlags({
    is_airfryer: row.is_airfryer,
    is_flourless: row.is_flourless
  });

  return {
    titulo: row.title,
    ingredientes: ingredientes.length > 0 ? ingredientes : [""],
    preparacion: preparacion.length > 0 ? preparacion : instructionsToSteps(row.instructions),
    tags
  };
}

export async function fetchInstagramCatalogForAdmin(): Promise<AdminInstagramCatalogListItem[]> {
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("recipes")
    .select("id,title,image_url,instagram_url,created_at")
    .eq("es_instagram", true)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/instagram-catalog] list error:", error);
    throw new Error("No pudimos cargar el catálogo de Instagram.");
  }

  return data ?? [];
}

export async function fetchInstagramCatalogRecipeById(
  recipeId: string
): Promise<AdminInstagramCatalogDetail | null> {
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("recipes")
    .select(ADMIN_CATALOG_SELECT)
    .eq("id", recipeId)
    .maybeSingle();

  if (error) {
    console.error("[admin/instagram-catalog] detail error:", error);
    throw new Error("No pudimos cargar la receta del catálogo.");
  }

  if (!data || !data.es_instagram || !data.is_public) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    image_url: data.image_url,
    instagram_url: data.instagram_url,
    created_at: data.created_at,
    recipe: recipeRowToStructuredRecipe(data)
  };
}
