import { NextResponse } from "next/server";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";
import { listAdminUserRecipeStats } from "@/lib/admin/user-recipe-stats";

export const maxDuration = 60;

export async function GET() {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = await listAdminUserRecipeStats();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[admin/user-recipe-stats] GET", error);
    const message =
      error instanceof Error ? error.message : "No pudimos cargar el uso de recetas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
