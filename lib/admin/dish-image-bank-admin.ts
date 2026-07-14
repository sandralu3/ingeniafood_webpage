import { randomUUID } from "crypto";
import {
  parseRecipeCuisineStyle,
  parseRecipeMealType,
  type RecipeCuisineStyle,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import type {
  DishImageBankItem,
  DishImageBankRow,
  MatchDishImageInput,
  MatchDishImageResult
} from "@/lib/recipes/dish-image-bank-types";
import { pickBestDishImageMatch } from "@/lib/recipes/match-dish-image";
import { getBundledCatalogCount, getBundledCatalogRows } from "@/lib/recipes/dish-image-bank-catalog";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const RECIPE_IMAGES_BUCKET = "recetas-imagenes";
const DISH_BANK_SELECT =
  "id, image_url, title, meal_types, cuisine_styles, keywords, tags, is_active, created_at, updated_at" as const;

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type CreateDishImageBankInput = {
  title: string;
  mealTypes: RecipeMealType[];
  cuisineStyles: RecipeCuisineStyle[];
  keywords: string[];
  tags: string[];
  imageFile: File;
  userId: string;
};

export type UpdateDishImageBankInput = {
  title?: string;
  mealTypes?: RecipeMealType[];
  cuisineStyles?: RecipeCuisineStyle[];
  keywords?: string[];
  tags?: string[];
  isActive?: boolean;
  imageFile?: File;
  userId?: string;
};

function mapRow(row: DishImageBankRow): DishImageBankItem {
  return {
    id: row.id,
    imageUrl: row.image_url,
    title: row.title,
    mealTypes: row.meal_types
      .map((value) => parseRecipeMealType(value))
      .filter((value): value is RecipeMealType => value !== null),
    cuisineStyles: row.cuisine_styles
      .map((value) => parseRecipeCuisineStyle(value))
      .filter((value): value is RecipeCuisineStyle => value !== null),
    keywords: row.keywords ?? [],
    tags: row.tags ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

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

export async function uploadDishBankImage(userId: string, imageFile: File): Promise<string> {
  if (!ALLOWED_IMAGE_MIME.has(imageFile.type)) {
    throw new Error("Formato de imagen no soportado. Usa JPEG, PNG, WebP o GIF.");
  }

  if (imageFile.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera el límite de 5 MB.");
  }

  const admin = getSupabaseAdminClient();
  const extension = getFileExtension(imageFile.type);
  const objectPath = `${userId}/dish-bank/${randomUUID()}.${extension}`;
  const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(RECIPE_IMAGES_BUCKET)
    .upload(objectPath, imageBuffer, {
      contentType: imageFile.type,
      cacheControl: "31536000",
      upsert: false
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicData } = admin.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(objectPath);
  return publicData.publicUrl;
}

export async function listDishImageBankItems(): Promise<DishImageBankItem[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("dish_image_bank")
    .select(DISH_BANK_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRow(row as DishImageBankRow));
}

export async function createDishImageBankItem(
  input: CreateDishImageBankInput
): Promise<DishImageBankItem> {
  const imageUrl = await uploadDishBankImage(input.userId, input.imageFile);
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("dish_image_bank")
    .insert({
      image_url: imageUrl,
      title: input.title.trim(),
      meal_types: input.mealTypes,
      cuisine_styles: input.cuisineStyles,
      keywords: input.keywords,
      tags: input.tags,
      is_active: true
    })
    .select(DISH_BANK_SELECT)
    .single();

  if (error || !data) {
    throw error ?? new Error("No se pudo crear la imagen del banco.");
  }

  return mapRow(data as DishImageBankRow);
}

export async function updateDishImageBankItem(
  id: string,
  input: UpdateDishImageBankInput
): Promise<DishImageBankItem> {
  const admin = getSupabaseAdminClient();
  const payload: {
    updated_at: string;
    title?: string;
    meal_types?: string[];
    cuisine_styles?: string[];
    keywords?: string[];
    tags?: string[];
    is_active?: boolean;
    image_url?: string;
  } = {
    updated_at: new Date().toISOString()
  };

  if (typeof input.title === "string") payload.title = input.title.trim();
  if (input.mealTypes) payload.meal_types = input.mealTypes;
  if (input.cuisineStyles) payload.cuisine_styles = input.cuisineStyles;
  if (input.keywords) payload.keywords = input.keywords;
  if (input.tags) payload.tags = input.tags;
  if (typeof input.isActive === "boolean") payload.is_active = input.isActive;

  if (input.imageFile && input.userId) {
    payload.image_url = await uploadDishBankImage(input.userId, input.imageFile);
  }

  const { data, error } = await admin
    .from("dish_image_bank")
    .update(payload)
    .eq("id", id)
    .select(DISH_BANK_SELECT)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("No se encontró la imagen del banco.");
  }

  return mapRow(data as DishImageBankRow);
}

export async function deleteDishImageBankItem(id: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("dish_image_bank").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function matchDishImageFromBank(
  input: MatchDishImageInput
): Promise<MatchDishImageResult | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("dish_image_bank")
    .select(DISH_BANK_SELECT)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  const entries = (data ?? []).map((row) => mapRow(row as DishImageBankRow));
  return pickBestDishImageMatch(entries, input);
}

export async function importCatalogRecipesToDishBank(): Promise<{ imported: number }> {
  const admin = getSupabaseAdminClient();

  const { data: recipes, error: recipesError } = await admin
    .from("recipes")
    .select("title, image_url, is_airfryer, is_flourless")
    .eq("is_public", true)
    .eq("es_instagram", true)
    .not("image_url", "is", null);

  if (recipesError) {
    throw recipesError;
  }

  const { data: existing, error: existingError } = await admin
    .from("dish_image_bank")
    .select("image_url");

  if (existingError) {
    throw existingError;
  }

  const existingUrls = new Set((existing ?? []).map((row) => row.image_url));
  const rowsToInsert = (recipes ?? [])
    .filter((recipe) => recipe.image_url && !existingUrls.has(recipe.image_url))
    .map((recipe) => {
      const tags: string[] = [];
      if (recipe.is_flourless) tags.push("Sin Harinas");
      if (recipe.is_airfryer) tags.push("Apto para Airfryer");

      return {
        image_url: recipe.image_url as string,
        title: recipe.title,
        meal_types: ["almuerzo"],
        cuisine_styles: ["estandar"],
        keywords: tokenizeTitleToKeywords(recipe.title),
        tags,
        is_active: true
      };
    });

  if (!rowsToInsert.length) {
    return { imported: 0 };
  }

  const { error: insertError } = await admin.from("dish_image_bank").insert(rowsToInsert);
  if (insertError) {
    throw insertError;
  }

  return { imported: rowsToInsert.length };
}

export async function seedBundledCatalogToDishBank(): Promise<{ imported: number; total: number }> {
  const admin = getSupabaseAdminClient();
  const catalogRows = getBundledCatalogRows();

  const { data: existing, error: existingError } = await admin
    .from("dish_image_bank")
    .select("image_url");

  if (existingError) {
    throw existingError;
  }

  const existingUrls = new Set((existing ?? []).map((row) => row.image_url));
  const rowsToInsert = catalogRows
    .filter((row) => !existingUrls.has(row.image_url))
    .map((row) => ({
      image_url: row.image_url,
      title: row.title,
      meal_types: row.meal_types,
      cuisine_styles: row.cuisine_styles,
      keywords: row.keywords,
      tags: row.tags,
      is_active: true
    }));

  if (!rowsToInsert.length) {
    return { imported: 0, total: existingUrls.size };
  }

  const batchSize = 50;
  let imported = 0;
  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const batch = rowsToInsert.slice(i, i + batchSize);
    const { error: insertError } = await admin.from("dish_image_bank").insert(batch);
    if (insertError) {
      throw insertError;
    }
    imported += batch.length;
  }

  return { imported, total: existingUrls.size + imported };
}

export function getBundledDishImageCatalogInfo(): { count: number } {
  return { count: getBundledCatalogCount() };
}

function tokenizeTitleToKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-záéíóúñ0-9]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
    .slice(0, 8);
}
