import { NextResponse } from "next/server";
import { fetchInstagramCatalogRecipeById } from "@/lib/admin/instagram-catalog-admin";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    const recipe = await fetchInstagramCatalogRecipeById(id);
    if (!recipe) {
      return NextResponse.json({ error: "Receta del catálogo no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("[admin/instagram-catalog/:id] GET", error);
    const message = error instanceof Error ? error.message : "No pudimos cargar la receta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
