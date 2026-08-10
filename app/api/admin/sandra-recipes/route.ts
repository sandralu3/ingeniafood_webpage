import { NextResponse } from "next/server";
import { fetchSandraRecipesForAdmin } from "@/lib/admin/sandra-recipes-admin";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";

export async function GET() {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const recipes = await fetchSandraRecipesForAdmin();
    return NextResponse.json({ recipes });
  } catch (error) {
    console.error("[api/admin/sandra-recipes] GET", error);
    const message =
      error instanceof Error ? error.message : "No pudimos cargar las recetas de Sandra.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
