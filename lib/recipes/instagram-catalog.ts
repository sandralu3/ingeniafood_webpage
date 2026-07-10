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
  const copies = await findUserCatalogRecipeCopiesBatch(supabase, userId, [curated]);
  return copies[curated.id] ?? null;
}

export async function findUserCatalogRecipeCopiesBatch(
  supabase: SupabaseClient<Database>,
  userId: string,
  catalog: InstagramCatalogRecipe[]
): Promise<Record<string, string>> {
  const copies: Record<string, string> = {};
  if (catalog.length === 0) return copies;

  const instagramUrls = Array.from(
    new Set(
      catalog
        .map((recipe) => recipe.instagram_url)
        .filter((url): url is string => Boolean(url))
    )
  );
  const titles = Array.from(new Set(catalog.map((recipe) => recipe.title)));

  const [byUrlResult, byTitleResult] = await Promise.all([
    instagramUrls.length > 0
      ? supabase
          .from("recipes")
          .select("id, instagram_url")
          .eq("user_id", userId)
          .in("instagram_url", instagramUrls)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("recipes").select("id, title").eq("user_id", userId).in("title", titles)
  ]);

  const urlToId = new Map<string, string>();
  for (const row of byUrlResult.data ?? []) {
    if (row.instagram_url) {
      urlToId.set(row.instagram_url, row.id);
    }
  }

  const titleToId = new Map<string, string>();
  for (const row of byTitleResult.data ?? []) {
    titleToId.set(row.title, row.id);
  }

  for (const recipe of catalog) {
    if (recipe.instagram_url) {
      const byUrl = urlToId.get(recipe.instagram_url);
      if (byUrl) {
        copies[recipe.id] = byUrl;
        continue;
      }
    }

    const byTitle = titleToId.get(recipe.title);
    if (byTitle) {
      copies[recipe.id] = byTitle;
    }
  }

  return copies;
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
