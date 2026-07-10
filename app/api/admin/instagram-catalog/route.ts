import { NextResponse } from "next/server";
import { fetchInstagramCatalogForAdmin } from "@/lib/admin/instagram-catalog-admin";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";

export async function GET() {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const recipes = await fetchInstagramCatalogForAdmin();
    return NextResponse.json({ recipes });
  } catch (error) {
    console.error("[admin/instagram-catalog] GET", error);
    const message = error instanceof Error ? error.message : "No pudimos cargar el catálogo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
