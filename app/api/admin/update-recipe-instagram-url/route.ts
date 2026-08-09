import { NextResponse } from "next/server";
import { updateRecipeInstagramUrl } from "@/lib/admin/update-recipe-instagram-url";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";
import { normalizeInstagramUrl } from "@/lib/recipes/instagram-url";

export const maxDuration = 30;

type Body = {
  recipeId?: string;
  instagramUrl?: string | null;
};

export async function POST(request: Request) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const recipeId = typeof body.recipeId === "string" ? body.recipeId.trim() : "";
  if (!recipeId) {
    return NextResponse.json({ error: "Falta recipeId." }, { status: 400 });
  }

  const rawUrl = body.instagramUrl;
  let instagramUrl: string | null = null;
  if (typeof rawUrl === "string" && rawUrl.trim()) {
    const normalized = normalizeInstagramUrl(rawUrl);
    if (!normalized) {
      return NextResponse.json(
        { error: "Introduce una URL de Instagram válida o un @usuario." },
        { status: 400 }
      );
    }
    instagramUrl = normalized;
  }

  try {
    const result = await updateRecipeInstagramUrl({ recipeId, instagramUrl });
    return NextResponse.json({
      recipeId: result.recipeId,
      instagramUrl: result.instagramUrl,
      message: result.instagramUrl
        ? "Enlace de Instagram guardado."
        : "Enlace de Instagram eliminado."
    });
  } catch (error) {
    console.error("[api/admin/update-recipe-instagram-url]", error);
    const message =
      error instanceof Error ? error.message : "No pudimos guardar el enlace.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
