import { NextResponse } from "next/server";
import {
  createDishImageBankItem,
  importCatalogRecipesToDishBank,
  listDishImageBankItems,
  seedBundledCatalogToDishBank
} from "@/lib/admin/dish-image-bank-admin";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";
import {
  parseRecipeCuisineStyle,
  parseRecipeMealType,
  type RecipeCuisineStyle,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";

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

export async function GET() {
  const auth = await requireSandraAdmin();
  if (!auth.ok) return auth.response;

  try {
    const items = await listDishImageBankItems();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[admin/dish-image-bank] GET", error);
    return NextResponse.json({ error: "No pudimos cargar el banco de imágenes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }

  const action = formData.get("action");
  if (action === "import_catalog") {
    try {
      const result = await importCatalogRecipesToDishBank();
      return NextResponse.json({
        imported: result.imported,
        message:
          result.imported > 0
            ? `Importadas ${result.imported} imágenes del catálogo Instagram.`
            : "No hay imágenes nuevas para importar."
      });
    } catch (error) {
      console.error("[admin/dish-image-bank] import_catalog", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "No pudimos importar el catálogo." },
        { status: 500 }
      );
    }
  }

  if (action === "seed_bundled") {
    try {
      const result = await seedBundledCatalogToDishBank();
      return NextResponse.json({
        imported: result.imported,
        total: result.total,
        message:
          result.imported > 0
            ? `Añadidas ${result.imported} imágenes del catálogo automático (${result.total} en total).`
            : `El banco ya tenía todas las imágenes del catálogo (${result.total} en total).`
      });
    } catch (error) {
      console.error("[admin/dish-image-bank] seed_bundled", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "No pudimos poblar el banco. ¿Aplicaste la migración dish_image_bank?"
        },
        { status: 500 }
      );
    }
  }

  const title = String(formData.get("title") ?? "").trim();
  const imageFile = formData.get("image");
  const mealTypes = parseMealTypes(formData.get("mealTypes"));
  const cuisineStyles = parseCuisineStyles(formData.get("cuisineStyles"));
  const keywords = parseStringArrayField(formData.get("keywords"));
  const tags = parseStringArrayField(formData.get("tags"));

  if (!title) {
    return NextResponse.json({ error: "Indica un título para la imagen." }, { status: 400 });
  }

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return NextResponse.json({ error: "Selecciona una imagen." }, { status: 400 });
  }

  try {
    const item = await createDishImageBankItem({
      title,
      mealTypes,
      cuisineStyles,
      keywords,
      tags,
      imageFile,
      userId: auth.user.id
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[admin/dish-image-bank] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos guardar la imagen." },
      { status: 500 }
    );
  }
}
