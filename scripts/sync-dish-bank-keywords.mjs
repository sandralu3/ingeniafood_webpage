/**
 * Sincroniza keywords en dish_image_bank desde el catálogo enriquecido (por image_url).
 * Uso: npm run sync:dish-bank-keywords
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(ROOT, "data/dish-image-bank-catalog.json");
const BATCH_SIZE = 40;

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
  const keywordsByUrl = new Map(
    catalog
      .filter((entry) => entry.imageUrl)
      .map((entry) => [entry.imageUrl, entry.keywords ?? []])
  );

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: rows, error } = await supabase
    .from("dish_image_bank")
    .select("id, image_url, keywords");
  if (error) throw error;

  const updates = (rows ?? [])
    .map((row) => {
      const keywords = keywordsByUrl.get(row.image_url);
      if (!keywords?.length) return null;
      const current = JSON.stringify(row.keywords ?? []);
      const next = JSON.stringify(keywords);
      if (current === next) return null;
      return { id: row.id, keywords };
    })
    .filter(Boolean);

  if (!updates.length) {
    console.log("Nada que actualizar. Keywords ya están sincronizadas.");
    return;
  }

  let synced = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    for (const item of batch) {
      const { error: updateError } = await supabase
        .from("dish_image_bank")
        .update({ keywords: item.keywords })
        .eq("id", item.id);
      if (updateError) throw updateError;
      synced += 1;
    }
  }

  console.log(`✓ Keywords sincronizadas en Supabase: ${synced} filas.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
