import { NextResponse } from "next/server";
import { publishSandraRecipe } from "@/lib/admin/publish-sandra-recipe";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";

export const maxDuration = 30;

type Body = {
  recipeId?: string;
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

  try {
    const result = await publishSandraRecipe({
      userId: auth.user.id,
      recipeId
    });

    return NextResponse.json({
      recipeId: result.recipeId,
      title: result.title,
      message: "Publicada como Receta de Sandra en el banco global."
    });
  } catch (error) {
    console.error("[api/admin/publish-sandra-recipe]", error);
    const message =
      error instanceof Error ? error.message : "No pudimos publicar la receta.";
    const status =
      message.includes("migración") || message.includes("al menos 3 pasos")
        ? 400
        : message.includes("Solo puedes") || message.includes("No encontramos")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
