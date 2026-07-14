import { NextResponse } from "next/server";
import { deleteDishImageBankItem, updateDishImageBankItem } from "@/lib/admin/dish-image-bank-admin";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";
import {
  parseRecipeCuisineStyle,
  parseRecipeMealType,
  type RecipeCuisineStyle,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseStringArrayField(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || !value.trim()) return [];

  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  return trimmed
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMealTypes(value: FormDataEntryValue | null): RecipeMealType[] {
  return parseStringArrayField(value)
    .map((item) => parseRecipeMealType(item))
    .filter((item): item is RecipeMealType => item !== null);
}

function parseCuisineStyles(value: FormDataEntryValue | null): RecipeCuisineStyle[] {
  return parseStringArrayField(value)
    .map((item) => parseRecipeCuisineStyle(item))
    .filter((item): item is RecipeCuisineStyle => item !== null);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }

  const title = formData.get("title");
  const imageFile = formData.get("image");
  const isActiveRaw = formData.get("isActive");
  const mealTypesRaw = formData.get("mealTypes");
  const cuisineStylesRaw = formData.get("cuisineStyles");
  const keywordsRaw = formData.get("keywords");
  const tagsRaw = formData.get("tags");

  try {
    const item = await updateDishImageBankItem(id, {
      title: typeof title === "string" ? title : undefined,
      mealTypes: mealTypesRaw ? parseMealTypes(mealTypesRaw) : undefined,
      cuisineStyles: cuisineStylesRaw ? parseCuisineStyles(cuisineStylesRaw) : undefined,
      keywords: keywordsRaw ? parseStringArrayField(keywordsRaw) : undefined,
      tags: tagsRaw ? parseStringArrayField(tagsRaw) : undefined,
      isActive:
        typeof isActiveRaw === "string"
          ? isActiveRaw === "true"
          : undefined,
      imageFile: imageFile instanceof File && imageFile.size > 0 ? imageFile : undefined,
      userId: auth.user.id
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[admin/dish-image-bank/:id] PATCH", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos actualizar la imagen." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    await deleteDishImageBankItem(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/dish-image-bank/:id] DELETE", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos eliminar la imagen." },
      { status: 500 }
    );
  }
}
