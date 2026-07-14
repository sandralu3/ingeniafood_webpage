/**
 * Enriquece data/dish-image-bank-catalog.json con alias ES para matching.
 * Uso: npm run enrich:dish-catalog
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichCatalogEntry } from "./dish-keyword-synonyms.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(ROOT, "data/dish-image-bank-catalog.json");

function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  let changedCount = 0;

  const enriched = catalog.map((entry) => {
    const { entry: nextEntry, changed } = enrichCatalogEntry(entry);
    if (changed) changedCount += 1;
    return nextEntry;
  });

  writeFileSync(CATALOG_PATH, JSON.stringify(enriched, null, 2), "utf8");

  console.log(`✓ Catálogo enriquecido: ${enriched.length} entradas, ${changedCount} actualizadas.`);
  console.log("  Siguiente paso (opcional): npm run sync:dish-bank-keywords");
}

main();
