import { NextResponse } from "next/server";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";
import {
  auditRecipeMetadataGaps,
  enrichAllOwnedRecipesMissingMetadata,
  enrichSandraRecipesMissingMealType
} from "@/lib/recipes/enrich-recipes-bulk";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const maxDuration = 60;

export async function GET() {
  const auth = await requireSandraAdmin();
  if (!auth.ok) return auth.response;

  try {
    const admin = getSupabaseAdminClient();
    const audit = await auditRecipeMetadataGaps(admin);
    return NextResponse.json({ audit });
  } catch (error) {
    console.error("[api/admin/recipes/enrich-metadata] GET", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos auditar." },
      { status: 500 }
    );
  }
}

type Body = {
  scope?: unknown;
  dryRun?: unknown;
  limit?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) return auth.response;

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const scope =
    body.scope === "owned" || body.scope === "sandra-meal" || body.scope === "all"
      ? body.scope
      : "owned";
  const dryRun = body.dryRun === true;
  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit) && body.limit > 0
      ? Math.min(200, Math.floor(body.limit))
      : 80;

  try {
    const admin = getSupabaseAdminClient();
    const results: Record<string, unknown> = {};

    if (scope === "owned" || scope === "all") {
      results.owned = await enrichAllOwnedRecipesMissingMetadata(admin, {
        dryRun,
        limit
      });
    }
    if (scope === "sandra-meal" || scope === "all") {
      results.sandraMeal = await enrichSandraRecipesMissingMealType(admin, {
        dryRun,
        limit
      });
    }

    const audit = await auditRecipeMetadataGaps(admin);
    return NextResponse.json({
      dryRun,
      scope,
      results,
      audit,
      message: dryRun
        ? "Dry-run: no se escribió nada."
        : "Lote aplicado. Si quedan pendientes, vuelve a llamar."
    });
  } catch (error) {
    console.error("[api/admin/recipes/enrich-metadata] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos enriquecer." },
      { status: 500 }
    );
  }
}
