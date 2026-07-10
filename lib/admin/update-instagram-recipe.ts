import { randomUUID } from "crypto";
import type { StructuredInstagramRecipe } from "@/lib/admin/instagram-recipe-extractor";
import { tagsToLegacyFlags } from "@/lib/recipes/recipe-tags";
import {
  stringsToStructuredIngredients,
  structuredIngredientsToJson
} from "@/lib/recipes/structured-ingredients";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { Database } from "@/types/database.types";

type RecipeUpdate = Database["public"]["Tables"]["recipes"]["Update"];

const RECIPE_IMAGES_BUCKET = "recetas-imagenes";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function buildInstructions(steps: string[]): string {
  return steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

async function uploadRecipeImage(params: {
  userId: string;
  imageFile: File;
}): Promise<string> {
  const { userId, imageFile } = params;

  if (!ALLOWED_IMAGE_MIME.has(imageFile.type)) {
    throw new Error("Formato de imagen no soportado. Usa JPEG, PNG, WebP o GIF.");
  }

  if (imageFile.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera el límite de 5 MB.");
  }

  const admin = getSupabaseAdminClient();
  const extension = getFileExtension(imageFile.type);
  const objectPath = `${userId}/${randomUUID()}.${extension}`;
  const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(RECIPE_IMAGES_BUCKET)
    .upload(objectPath, imageBuffer, {
      contentType: imageFile.type,
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) {
    console.error("[admin/update-instagram-recipe] upload error:", uploadError);
    throw new Error("No pudimos subir la imagen.");
  }

  const { data: publicData } = admin.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(objectPath);
  return publicData.publicUrl;
}

export async function updateInstagramCatalogRecipe(params: {
  recipeId: string;
  userId: string;
  recipe: StructuredInstagramRecipe;
  instagramUrl?: string | null;
  imageFile?: File | null;
}): Promise<{ recipeId: string; imageUrl: string | null }> {
  const admin = getSupabaseAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("recipes")
    .select("id,es_instagram,is_public,user_id,image_url")
    .eq("id", params.recipeId)
    .maybeSingle();

  if (existingError || !existing) {
    throw new Error("No encontramos la receta del catálogo.");
  }

  if (!existing.es_instagram || !existing.is_public) {
    throw new Error("Solo se pueden editar recetas publicadas en el catálogo de Instagram.");
  }

  const { is_airfryer, is_flourless } = tagsToLegacyFlags(params.recipe.tags);
  const structuredIngredients = structuredIngredientsToJson(
    stringsToStructuredIngredients(params.recipe.ingredientes)
  );

  let imageUrl = existing.image_url;
  if (params.imageFile) {
    imageUrl = await uploadRecipeImage({
      userId: params.userId,
      imageFile: params.imageFile
    });
  }

  const updatePayload: RecipeUpdate = {
    title: params.recipe.titulo,
    ingredients: structuredIngredients,
    steps: params.recipe.preparacion,
    instructions: buildInstructions(params.recipe.preparacion),
    is_airfryer,
    is_flourless,
    image_url: imageUrl,
    updated_at: new Date().toISOString()
  };

  if (params.instagramUrl !== undefined) {
    updatePayload.instagram_url = params.instagramUrl;
  }

  const { error: updateError } = await admin
    .from("recipes")
    .update(updatePayload)
    .eq("id", params.recipeId);

  if (updateError) {
    console.error("[admin/update-instagram-recipe] update error:", updateError);
    throw new Error("No pudimos actualizar la receta.");
  }

  return { recipeId: params.recipeId, imageUrl };
}
