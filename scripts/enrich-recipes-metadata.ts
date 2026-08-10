/**
 * Auditoría y relleno masivo de metadatos de recetas (service role).
 *
 * Uso:
 *   npx --yes tsx scripts/enrich-recipes-metadata.ts
 *   npx --yes tsx scripts/enrich-recipes-metadata.ts --apply --scope=owned
 *   npx --yes tsx scripts/enrich-recipes-metadata.ts --apply --scope=sandra-meal
 *   npx --yes tsx scripts/enrich-recipes-metadata.ts --apply --scope=sandra-ai
 *   npx --yes tsx scripts/enrich-recipes-metadata.ts --apply --scope=all
 *
 * Flags:
 *   --apply           Escribe en DB (sin esto solo audita / dry-run)
 *   --scope=...       owned | sandra-meal | sandra-ai | all
 *   --limit=N         Máximo de filas a tocar por paso
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_GENERATIVE_AI_API_KEY  (solo para --scope=sandra-ai)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv: string[]) {
  const apply = argv.includes("--apply");
  const scopeArg = argv.find((arg) => arg.startsWith("--scope="));
  const scope = (scopeArg?.slice("--scope=".length) || "audit") as
    | "audit"
    | "owned"
    | "sandra-meal"
    | "sandra-ai"
    | "all";
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const limitRaw = limitArg ? Number(limitArg.slice("--limit=".length)) : undefined;
  const limit = Number.isFinite(limitRaw) && (limitRaw as number) > 0 ? limitRaw : undefined;
  return { apply, scope, limit };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadEnvLocal();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }

  const { apply, scope, limit } = parseArgs(process.argv.slice(2));
  const dryRun = !apply;

  const { getSupabaseAdminClient } = await import("../lib/supabaseAdmin");
  const {
    auditRecipeMetadataGaps,
    enrichAllOwnedRecipesMissingMetadata,
    enrichSandraRecipesMissingMealType
  } = await import("../lib/recipes/enrich-recipes-bulk");

  const admin = getSupabaseAdminClient();

  console.log("\n=== Auditoría de metadatos de recetas ===\n");
  const audit = await auditRecipeMetadataGaps(admin);

  console.log("Sandra (catálogo):");
  console.log(`  Total:              ${audit.sandra.total}`);
  console.log(`  Sin dieta:          ${audit.sandra.missingDiet}`);
  console.log(`  Sin macros:         ${audit.sandra.missingMacros}`);
  console.log(`  Sin meal_type:      ${audit.sandra.missingMealType}`);
  console.log(`  Pendientes IA:      ${audit.sandra.needingAiEnrich}`);
  console.log("");
  console.log("Usuarios (Mías / Fuera, sin borradores):");
  console.log(`  Total:              ${audit.owned.total}`);
  console.log(`  Sin meal_type:      ${audit.owned.missingMealType}`);
  console.log(`  Sin dieta:          ${audit.owned.missingDiet}`);
  console.log(`  Pendientes reglas:  ${audit.owned.needingHeuristic}`);
  if (audit.owned.byUser.length) {
    console.log("  Por usuario (top 15):");
    for (const row of audit.owned.byUser.slice(0, 15)) {
      console.log(`    ${row.userId}: ${row.pending}`);
    }
  }

  if (scope === "audit" && !apply) {
    console.log("\nDry-run / solo auditoría. Para escribir:");
    console.log("  npx --yes tsx scripts/enrich-recipes-metadata.ts --apply --scope=owned");
    console.log("  npx --yes tsx scripts/enrich-recipes-metadata.ts --apply --scope=sandra-meal");
    console.log("  npx --yes tsx scripts/enrich-recipes-metadata.ts --apply --scope=sandra-ai");
    console.log("  npx --yes tsx scripts/enrich-recipes-metadata.ts --apply --scope=all");
    return;
  }

  const runOwned = scope === "owned" || scope === "all";
  const runSandraMeal = scope === "sandra-meal" || scope === "all";
  const runSandraAi = scope === "sandra-ai" || scope === "all";

  console.log(`\nModo: ${dryRun ? "DRY-RUN (no escribe)" : "APPLY (escribe en DB)"}`);
  if (limit) console.log(`Límite por paso: ${limit}`);

  if (runOwned) {
    console.log("\n--- Owned: meal_type + diet:* (heurística) ---");
    const result = await enrichAllOwnedRecipesMissingMetadata(admin, { dryRun, limit });
    console.log(result);
  }

  if (runSandraMeal) {
    console.log("\n--- Sandra: meal_type (heurística) ---");
    const result = await enrichSandraRecipesMissingMealType(admin, { dryRun, limit });
    console.log(result);
  }

  if (runSandraAi) {
    console.log("\n--- Sandra: dietas + macros (IA Gemini) ---");
    if (dryRun) {
      console.log(
        `Dry-run: ${audit.sandra.needingAiEnrich} recetas necesitarían IA. Usa --apply --scope=sandra-ai`
      );
    } else {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
        throw new Error("Falta GOOGLE_GENERATIVE_AI_API_KEY para --scope=sandra-ai");
      }

      const { enrichMissingSandraRecipesBatch } = await import(
        "../lib/admin/sandra-recipes-admin"
      );

      const excludeIds: string[] = [];
      let rounds = 0;
      let totalUpdated = 0;

      while (rounds < 500) {
        rounds += 1;
        const batchLimit = limit ? Math.min(8, limit) : 4;
        const result = await enrichMissingSandraRecipesBatch({
          limit: batchLimit,
          excludeIds
        });
        totalUpdated += result.updated;
        excludeIds.push(...result.failed.map((item) => item.id));

        console.log(
          `  Lote ${rounds}: updated=${result.updated} failed=${result.failed.length} remaining=${result.remaining}`
        );

        if (result.failed.length) {
          for (const fail of result.failed.slice(0, 5)) {
            console.log(`    · ${fail.title}: ${fail.error}`);
          }
        }

        if (result.remaining === 0 || result.processed === 0) break;
        if (limit && totalUpdated >= limit) break;
        await sleep(800);
      }

      console.log(`  Total actualizadas con IA: ${totalUpdated}`);
    }
  }

  if (apply) {
    console.log("\n=== Auditoría final ===\n");
    const after = await auditRecipeMetadataGaps(admin);
    console.log("Sandra pendientes IA:", after.sandra.needingAiEnrich);
    console.log("Sandra sin meal_type:", after.sandra.missingMealType);
    console.log("Owned pendientes:", after.owned.needingHeuristic);
  }

  console.log("\nListo.\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
