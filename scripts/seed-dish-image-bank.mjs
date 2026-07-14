/**
 * Pobla dish_image_bank desde data/dish-image-bank-catalog.json
 * Uso: npm run seed:dish-bank
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(ROOT, "data/dish-image-bank-catalog.json");
const BATCH_SIZE = 50;

function loadEnv() {
  const path = join(ROOT, ".env.local");
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error: tableError } = await supabase.from("dish_image_bank").select("id").limit(1);
  if (tableError) {
    console.log(
      "⚠ La tabla dish_image_bank no existe.\n" +
        "  Aplica primero en Supabase → SQL Editor:\n" +
        "  supabase/migrations/20260714090000_dish_image_bank.sql\n\n" +
        "  Mientras tanto, las recetas Premium ya usan el catálogo embebido (777 fotos)."
    );
    process.exit(1);
  }

  const { data: existing, error: existingError } = await supabase
    .from("dish_image_bank")
    .select("image_url");
  if (existingError) throw existingError;

  const existingUrls = new Set((existing ?? []).map((row) => row.image_url));
  const rowsToInsert = catalog
    .filter((entry) => entry.imageUrl && !existingUrls.has(entry.imageUrl))
    .map((entry) => ({
      image_url: entry.imageUrl,
      title: entry.title,
      meal_types: entry.mealTypes,
      cuisine_styles: entry.cuisineStyles,
      keywords: entry.keywords ?? [],
      tags: entry.tags ?? [],
      is_active: true
    }));

  if (!rowsToInsert.length) {
    console.log(`Nada nuevo. El banco ya tiene ${existingUrls.size} imágenes.`);
    return;
  }

  let inserted = 0;
  for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
    const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("dish_image_bank").insert(batch);
    if (error) throw error;
    inserted += batch.length;
    process.stdout.write(`\rInsertadas ${inserted}/${rowsToInsert.length}...`);
  }

  console.log(`\n✓ ${inserted} imágenes añadidas. Total: ${existingUrls.size + inserted}`);
}

main().catch((error) => {
  console.error("\nError:", error.message ?? error);
  process.exit(1);
});
