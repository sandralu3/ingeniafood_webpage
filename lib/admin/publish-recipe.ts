import { randomUUID } from "crypto";
import type { StructuredInstagramRecipe } from "@/lib/admin/instagram-recipe-extractor";
import { tagsToLegacyFlags } from "@/lib/recipes/recipe-tags";
import {
  stringsToStructuredIngredients,
  structuredIngredientsToJson
} from "@/lib/recipes/structured-ingredients";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

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

export async function publishStructuredRecipe(params: {
  userId: string;
  recipe: StructuredInstagramRecipe;
  imageFile: File;
}): Promise<{ recipeId: string; imageUrl: string }> {
  const { userId, recipe, imageFile } = params;

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
    console.error("[admin/publish-recipe] upload error:", uploadError);
    throw new Error(
      "No pudimos subir la imagen. ¿Creaste el bucket 'recetas-imagenes' en Supabase Storage?"
    );
  }

  const { data: publicData } = admin.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(objectPath);
  const imageUrl = publicData.publicUrl;

  const { is_airfryer, is_flourless } = tagsToLegacyFlags(recipe.tags);
  const structuredIngredients = structuredIngredientsToJson(
    stringsToStructuredIngredients(recipe.ingredientes)
  );

  const { data: inserted, error: insertError } = await admin
    .from("recipes")
    .insert({
      user_id: userId,
      title: recipe.titulo,
      ingredients: structuredIngredients,
      steps: recipe.preparacion,
      instructions: buildInstructions(recipe.preparacion),
      image_url: imageUrl,
      is_airfryer,
      is_flourless,
      is_public: true,
      es_instagram: true
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[admin/publish-recipe] insert error:", insertError);
    await admin.storage.from(RECIPE_IMAGES_BUCKET).remove([objectPath]);
    throw new Error("No pudimos guardar la receta en la base de datos.");
  }

  return { recipeId: inserted.id, imageUrl };
}
