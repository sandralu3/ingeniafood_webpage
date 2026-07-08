import {
  normalizeIngredientsJson,
  structuredIngredientsToJson
} from "@/lib/recipes/structured-ingredients";
import type { Database, Json } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

export type InstagramCatalogRecipe = Pick<
  RecipeRow,
  | "id"
  | "title"
  | "image_url"
  | "instagram_url"
  | "is_airfryer"
  | "is_flourless"
  | "cooking_time"
>;

const CATALOG_SELECT =
  "id,title,image_url,instagram_url,is_airfryer,is_flourless,cooking_time,created_at";

function isMissingEsInstagramColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.message?.includes("es_instagram") === true;
}

export async function fetchInstagramCatalogRecipes(
  supabase: SupabaseClient<Database>
): Promise<InstagramCatalogRecipe[]> {
  const primary = await supabase
    .from("recipes")
    .select(CATALOG_SELECT)
    .eq("es_instagram", true)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (!primary.error) {
    return (primary.data as InstagramCatalogRecipe[] | null) ?? [];
  }

  if (!isMissingEsInstagramColumn(primary.error)) {
    console.error("[instagram-catalog] Error cargando catálogo:", primary.error);
    return [];
  }

  const fallback = await supabase
    .from("recipes")
    .select(CATALOG_SELECT)
    .eq("is_public", true)
    .not("instagram_url", "is", null)
    .order("created_at", { ascending: false });

  if (fallback.error) {
    console.error("[instagram-catalog] Error en fallback del catálogo:", fallback.error);
    return [];
  }

  return (fallback.data as InstagramCatalogRecipe[] | null) ?? [];
}

export async function findUserCatalogRecipeCopy(
  supabase: SupabaseClient<Database>,
  userId: string,
  curated: InstagramCatalogRecipe
): Promise<string | null> {
  if (curated.instagram_url) {
    const { data } = await supabase
      .from("recipes")
      .select("id")
      .eq("user_id", userId)
      .eq("instagram_url", curated.instagram_url)
      .maybeSingle();

    if (data?.id) return data.id;
  }

  const { data: byTitle } = await supabase
    .from("recipes")
    .select("id")
    .eq("user_id", userId)
    .eq("title", curated.title)
    .maybeSingle();

  return byTitle?.id ?? null;
}

export async function saveCatalogRecipeToLibrary(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  curatedRecipeId: string;
}): Promise<{ recipeId: string; alreadySaved: boolean } | { error: string }> {
  const { data: curated, error } = await params.supabase
    .from("recipes")
    .select(
      "id,title,description,ingredients,steps,instructions,tip_sandra,cooking_time,image_url,instagram_url,is_airfryer,is_flourless,es_instagram,is_public"
    )
    .eq("id", params.curatedRecipeId)
    .maybeSingle();

  if (error || !curated || !curated.is_public) {
    return { error: "No encontramos esta receta en el catálogo." };
  }

  const catalogRecipe = curated as RecipeRow;
  const existingId = await findUserCatalogRecipeCopy(
    params.supabase,
    params.userId,
    catalogRecipe
  );

  if (existingId) {
    return { recipeId: existingId, alreadySaved: true };
  }

  const { data: inserted, error: insertError } = await params.supabase
    .from("recipes")
    .insert({
      user_id: params.userId,
      title: catalogRecipe.title,
      description: catalogRecipe.description,
      ingredients: structuredIngredientsToJson(normalizeIngredientsJson(catalogRecipe.ingredients)),
      steps: catalogRecipe.steps as Json,
      instructions: catalogRecipe.instructions,
      tip_sandra: catalogRecipe.tip_sandra,
      cooking_time: catalogRecipe.cooking_time,
      image_url: catalogRecipe.image_url,
      instagram_url: catalogRecipe.instagram_url,
      is_airfryer: catalogRecipe.is_airfryer,
      is_flourless: catalogRecipe.is_flourless,
      is_public: false,
      es_instagram: false
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[instagram-catalog] Error guardando receta:", insertError);
    return { error: "No pudimos guardar la receta en tu biblioteca." };
  }

  return { recipeId: inserted.id, alreadySaved: false };
}
