import { NextResponse } from "next/server";
import { updateSandraRecipeContent } from "@/lib/admin/update-sandra-recipe-content";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";
import { parseRecipeMealType } from "@/lib/recipes/premium-recipe-filters";

export const maxDuration = 30;

type Body = {
  recipeId?: string;
  ingredients?: unknown;
  steps?: unknown;
  mealType?: unknown;
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

  const mealType = parseRecipeMealType(body.mealType);
  if (!mealType) {
    return NextResponse.json(
      {
        error:
          "Elige un tipo de comida válido (desayuno, almuerzo, cena, postre o snack)."
      },
      { status: 400 }
    );
  }

  try {
    const result = await updateSandraRecipeContent({
      userId: auth.user.id,
      recipeId,
      ingredients: Array.isArray(body.ingredients) ? (body.ingredients as string[]) : [],
      steps: Array.isArray(body.steps) ? (body.steps as string[]) : [],
      mealType
    });

    return NextResponse.json({
      recipeId: result.recipeId,
      mealType: result.mealType,
      message: "Receta actualizada (contenido y tipo de comida)."
    });
  } catch (error) {
    console.error("[api/admin/update-sandra-recipe-content]", error);
    const message =
      error instanceof Error ? error.message : "No pudimos guardar los cambios.";
    const status =
      message.includes("al menos") ||
      message.includes("Falta") ||
      message.includes("válido") ||
      message.includes("Elige")
        ? 400
        : message.includes("Solo puedes") || message.includes("No encontramos")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
