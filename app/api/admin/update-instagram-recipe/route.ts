import { NextResponse } from "next/server";
import type { StructuredInstagramRecipe } from "@/lib/admin/instagram-recipe-extractor";
import { updateInstagramCatalogRecipe } from "@/lib/admin/update-instagram-recipe";
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

export async function PATCH(request: Request) {
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

  const recipeId = String(formData.get("recipeId") ?? "").trim();
  const recipe = parseRecipeField(formData.get("recipe"));
  const imageFile = formData.get("image");
  const instagramUrlRaw = formData.get("instagram_url");

  if (!recipeId) {
    return NextResponse.json({ error: "Falta el identificador de la receta." }, { status: 400 });
  }

  if (!recipe || recipe.titulo.length === 0) {
    return NextResponse.json({ error: "La receta estructurada no es válida." }, { status: 400 });
  }

  if (recipe.ingredientes.length === 0 || recipe.preparacion.length === 0) {
    return NextResponse.json(
      { error: "La receta debe incluir ingredientes y pasos de preparación." },
      { status: 400 }
    );
  }

  let instagramUrl: string | null | undefined;
  if (typeof instagramUrlRaw === "string") {
    const trimmed = instagramUrlRaw.trim();
    if (!trimmed) {
      instagramUrl = null;
    } else {
      const normalized = normalizeInstagramUrl(trimmed);
      if (!normalized) {
        return NextResponse.json({ error: "La URL de Instagram no es válida." }, { status: 400 });
      }
      instagramUrl = normalized;
    }
  }

  try {
    const result = await updateInstagramCatalogRecipe({
      recipeId,
      userId: auth.user.id,
      recipe,
      instagramUrl,
      imageFile: imageFile instanceof File && imageFile.size > 0 ? imageFile : null
    });

    return NextResponse.json({
      recipeId: result.recipeId,
      imageUrl: result.imageUrl,
      message: "Receta actualizada correctamente."
    });
  } catch (error) {
    console.error("[admin/update-instagram-recipe]", error);
    const message = error instanceof Error ? error.message : "No pudimos actualizar la receta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
