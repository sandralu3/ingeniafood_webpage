import { NextResponse } from "next/server";
import { updateSandraRecipeDiets } from "@/lib/admin/sandra-recipes-admin";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";

type Body = {
  diets?: unknown;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const recipeId = typeof id === "string" ? id.trim() : "";
  if (!recipeId) {
    return NextResponse.json({ error: "Falta el id de la receta." }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  try {
    const recipe = await updateSandraRecipeDiets({
      recipeId,
      diets: body.diets
    });
    return NextResponse.json({
      recipe,
      message: "Dietas actualizadas."
    });
  } catch (error) {
    console.error("[api/admin/sandra-recipes] PATCH", error);
    const message =
      error instanceof Error ? error.message : "No pudimos guardar las dietas.";
    const status =
      message.includes("Falta") || message.includes("Solo puedes")
        ? message.includes("Solo puedes")
          ? 403
          : 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
