/**
 * Sincroniza image_url del banco con data/dish-image-bank-catalog.json (por título).
 * Uso: node scripts/sync-dish-bank-urls.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const lines = readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/);
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
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const catalog = JSON.parse(readFileSync(join(ROOT, "data/dish-image-bank-catalog.json"), "utf8"));
  const urlByTitle = new Map(catalog.map((entry) => [entry.title, entry.imageUrl]));

  const { data: rows, error } = await supabase
    .from("dish_image_bank")
    .select("id, title, image_url");

  if (error) throw error;

  let updated = 0;
  for (const row of rows ?? []) {
    const nextUrl = urlByTitle.get(row.title);
    if (!nextUrl || nextUrl === row.image_url) continue;

    const { error: updateError } = await supabase
      .from("dish_image_bank")
      .update({ image_url: nextUrl, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (updateError) throw updateError;
    updated++;
    console.log("✓", row.title);
  }

  console.log(`\nActualizadas ${updated} URLs.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
