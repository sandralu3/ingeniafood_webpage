import { NextResponse } from "next/server";
import { enrichMissingSandraRecipesBatch } from "@/lib/admin/sandra-recipes-admin";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";

export const maxDuration = 60;

type Body = {
  limit?: unknown;
  excludeIds?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? body.limit
      : typeof body.limit === "string"
        ? Number(body.limit)
        : undefined;

  const excludeIds = Array.isArray(body.excludeIds)
    ? body.excludeIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  try {
    const result = await enrichMissingSandraRecipesBatch({
      limit: Number.isFinite(limit) ? Number(limit) : undefined,
      excludeIds
    });
    return NextResponse.json({
      ...result,
      message:
        result.processed === 0
          ? "No quedan recetas pendientes de dieta o macros."
          : `Lote: ${result.updated} actualizadas, ${result.failed.length} con error, ${result.remaining} pendientes.`
    });
  } catch (error) {
    console.error("[api/admin/sandra-recipes/enrich-missing]", error);
    const message =
      error instanceof Error ? error.message : "No pudimos enriquecer las recetas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
