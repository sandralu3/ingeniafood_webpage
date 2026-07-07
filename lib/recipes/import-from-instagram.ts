import {
  getInstagramUrlMatchKey,
  instagramUrlsMatch,
  normalizeInstagramUrl
} from "@/lib/recipes/instagram-url";
import type { Database, Json } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

export type InstagramMetadata = {
  title: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
};

export type InstagramImportResult =
  | {
      kind: "existing";
      recipeId: string;
      title: string;
      instagramUrl: string;
    }
  | {
      kind: "curated";
      recipeId: string;
      title: string;
      instagramUrl: string;
      sourceRecipeId: string;
    }
  | {
      kind: "bookmark";
      recipeId: string;
      title: string;
      instagramUrl: string;
    };

const CURATED_RECIPE_SELECT =
  "id,title,description,ingredients,steps,instructions,tip_sandra,cooking_time,image_url,instagram_url,is_airfryer,is_flourless";

async function findUserRecipeByInstagramUrl(
  supabase: SupabaseClient<Database>,
  userId: string,
  normalizedUrl: string
): Promise<Pick<RecipeRow, "id" | "title" | "instagram_url"> | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id,title,instagram_url")
    .eq("user_id", userId)
    .not("instagram_url", "is", null);

  if (error || !data?.length) {
    if (error) {
      console.error("[import-instagram] Error buscando duplicados:", error);
    }
    return null;
  }

  return (
    data.find(
      (recipe) => recipe.instagram_url && instagramUrlsMatch(recipe.instagram_url, normalizedUrl)
    ) ?? null
  );
}

async function findCuratedRecipeByInstagramUrl(
  supabase: SupabaseClient<Database>,
  normalizedUrl: string
): Promise<RecipeRow | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select(CURATED_RECIPE_SELECT)
    .eq("is_public", true)
    .not("instagram_url", "is", null);

  if (error || !data?.length) {
    if (error) {
      console.error("[import-instagram] Error buscando receta curada:", error);
    }
    return null;
  }

  const match = data.find(
    (recipe) => recipe.instagram_url && instagramUrlsMatch(recipe.instagram_url, normalizedUrl)
  );

  return (match as RecipeRow | undefined) ?? null;
}

function buildBookmarkTitle(metadata: InstagramMetadata | undefined, normalizedUrl: string): string {
  if (metadata?.title?.trim()) {
    return metadata.title.trim();
  }

  const matchKey = getInstagramUrlMatchKey(normalizedUrl);
  if (metadata?.authorName?.trim()) {
    return `Reel de ${metadata.authorName.trim()}`;
  }

  if (matchKey?.startsWith("reel/")) {
    return "Receta de Instagram";
  }

  return "Receta guardada de Instagram";
}

async function insertRecipeForUser(
  supabase: SupabaseClient<Database>,
  payload: Database["public"]["Tables"]["recipes"]["Insert"]
): Promise<RecipeRow | null> {
  const { data, error } = await supabase.from("recipes").insert(payload).select("id,title,instagram_url").single();

  if (error || !data) {
    console.error("[import-instagram] Error insertando receta:", error);
    return null;
  }

  return data as RecipeRow;
}

export async function fetchInstagramMetadata(rawUrl: string): Promise<InstagramMetadata> {
  const normalizedUrl = normalizeInstagramUrl(rawUrl);
  if (!normalizedUrl) {
    return { title: null, thumbnailUrl: null, authorName: null };
  }

  try {
    const response = await fetch(
      `/api/instagram-metadata?url=${encodeURIComponent(normalizedUrl)}`,
      { method: "GET" }
    );

    if (!response.ok) {
      return { title: null, thumbnailUrl: null, authorName: null };
    }

    const payload = (await response.json()) as InstagramMetadata;
    return {
      title: payload.title ?? null,
      thumbnailUrl: payload.thumbnailUrl ?? null,
      authorName: payload.authorName ?? null
    };
  } catch (error) {
    console.error("[import-instagram] Error obteniendo metadata:", error);
    return { title: null, thumbnailUrl: null, authorName: null };
  }
}

export async function importRecipeFromInstagram(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  rawUrl: string;
  metadata?: InstagramMetadata;
}): Promise<InstagramImportResult | { error: string }> {
  const normalizedUrl = normalizeInstagramUrl(params.rawUrl);
  if (!normalizedUrl) {
    return { error: "Introduce una URL de Instagram válida o un @usuario." };
  }

  const existing = await findUserRecipeByInstagramUrl(params.supabase, params.userId, normalizedUrl);
  if (existing?.id) {
    return {
      kind: "existing",
      recipeId: existing.id,
      title: existing.title,
      instagramUrl: existing.instagram_url ?? normalizedUrl
    };
  }

  const curated = await findCuratedRecipeByInstagramUrl(params.supabase, normalizedUrl);
  if (curated) {
    const inserted = await insertRecipeForUser(params.supabase, {
      user_id: params.userId,
      title: curated.title,
      description: curated.description,
      ingredients: curated.ingredients as Json,
      steps: curated.steps as Json,
      instructions: curated.instructions,
      tip_sandra: curated.tip_sandra,
      cooking_time: curated.cooking_time,
      image_url: curated.image_url,
      instagram_url: curated.instagram_url ?? normalizedUrl,
      is_airfryer: curated.is_airfryer,
      is_flourless: curated.is_flourless,
      is_public: false
    });

    if (!inserted) {
      return { error: "No pudimos guardar la receta de Sandra. Inténtalo de nuevo." };
    }

    return {
      kind: "curated",
      recipeId: inserted.id,
      title: inserted.title,
      instagramUrl: inserted.instagram_url ?? normalizedUrl,
      sourceRecipeId: curated.id
    };
  }

  const metadata = params.metadata ?? (await fetchInstagramMetadata(normalizedUrl));
  const inserted = await insertRecipeForUser(params.supabase, {
    user_id: params.userId,
    title: buildBookmarkTitle(metadata, normalizedUrl),
    description:
      "Receta guardada desde Instagram. Abre el enlace para ver el reel completo o genera una versión con el escáner.",
    ingredients: [] as Json,
    steps: [] as Json,
    instructions:
      "Esta receta está vinculada a un reel de Instagram. Pulsa «Ver en Instagram» para ver la preparación en video. Si quieres ingredientes y pasos en la app, usa el escáner de despensa.",
    tip_sandra: null,
    cooking_time: null,
    image_url: metadata.thumbnailUrl,
    instagram_url: normalizedUrl,
    is_airfryer: false,
    is_flourless: false,
    is_public: false
  });

  if (!inserted) {
    return { error: "No pudimos guardar el enlace. ¿Ejecutaste la migración de instagram_url?" };
  }

  return {
    kind: "bookmark",
    recipeId: inserted.id,
    title: inserted.title,
    instagramUrl: inserted.instagram_url ?? normalizedUrl
  };
}
