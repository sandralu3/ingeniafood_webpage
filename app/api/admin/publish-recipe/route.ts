import { NextResponse } from "next/server";
import type { StructuredInstagramRecipe } from "@/lib/admin/instagram-recipe-extractor";
import { publishStructuredRecipe } from "@/lib/admin/publish-recipe";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";
import { normalizeInstagramUrl } from "@/lib/recipes/instagram-url";

export const maxDuration = 60;

function parseRecipeField(value: FormDataEntryValue | null): StructuredInstagramRecipe | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value) as StructuredInstagramRecipe;
    if (
      typeof parsed.titulo !== "string" ||
      !Array.isArray(parsed.ingredientes) ||
      !Array.isArray(parsed.preparacion) ||
      !Array.isArray(parsed.tags)
    ) {
      return null;
    }

    return {
      titulo: parsed.titulo.trim(),
      ingredientes: parsed.ingredientes.map((item) => String(item).trim()).filter(Boolean),
      preparacion: parsed.preparacion.map((item) => String(item).trim()).filter(Boolean),
      tags: parsed.tags.map((item) => String(item).trim()).filter(Boolean)
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }

  const recipe = parseRecipeField(formData.get("recipe"));
  const imageFile = formData.get("image");
  const instagramUrlRaw = formData.get("instagram_url");

  if (!recipe || recipe.titulo.length === 0) {
    return NextResponse.json({ error: "La receta estructurada no es válida." }, { status: 400 });
  }

  if (recipe.ingredientes.length === 0 || recipe.preparacion.length === 0) {
    return NextResponse.json(
      { error: "La receta debe incluir ingredientes y pasos de preparación." },
      { status: 400 }
    );
  }

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return NextResponse.json({ error: "Selecciona una imagen para la receta." }, { status: 400 });
  }

  let instagramUrl: string | null = null;
  if (typeof instagramUrlRaw === "string" && instagramUrlRaw.trim()) {
    const normalized = normalizeInstagramUrl(instagramUrlRaw);
    if (!normalized) {
      return NextResponse.json({ error: "La URL de Instagram no es válida." }, { status: 400 });
    }
    instagramUrl = normalized;
  }

  try {
    const result = await publishStructuredRecipe({
      userId: auth.user.id,
      recipe,
      imageFile,
      instagramUrl
    });

    const { notifyAdminsCatalogPublished } = await import(
      "@/lib/notifications/admin-notify"
    );
    void notifyAdminsCatalogPublished({
      recipeId: result.recipeId,
      title: recipe.titulo
    });

    return NextResponse.json({
      recipeId: result.recipeId,
      imageUrl: result.imageUrl,
      message: "Receta publicada correctamente."
    });
  } catch (error) {
    console.error("[admin/publish-recipe]", error);
    const message = error instanceof Error ? error.message : "No pudimos publicar la receta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
