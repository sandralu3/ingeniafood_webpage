/**
 * Valida URLs del catálogo y reemplaza Unsplash rotas por TheMealDB del mismo catálogo.
 * Uso: node scripts/audit-dish-catalog-urls.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(ROOT, "data/dish-image-bank-catalog.json");

function tokenize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

async function isUrlOk(url) {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    return response.ok;
  } catch {
    return false;
  }
}

function findThemealDbReplacement(entry, catalog) {
  const entryTokens = new Set(tokenize([entry.title, ...entry.keywords].join(" ")));
  let best = null;
  let bestScore = 0;

  for (const candidate of catalog) {
    if (!candidate.imageUrl.includes("themealdb.com")) continue;
    if (candidate.imageUrl === entry.imageUrl) continue;

    const candidateTokens = tokenize([candidate.title, ...candidate.keywords].join(" "));
    let score = 0;
    for (const token of candidateTokens) {
      if (entryTokens.has(token)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return bestScore > 0 ? best : null;
}

async function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const broken = [];
  const fixed = [];

  for (const entry of catalog) {
    if (!entry.imageUrl.includes("unsplash.com")) continue;
    const ok = await isUrlOk(entry.imageUrl);
    if (ok) continue;

    broken.push(entry.title);
    const replacement = findThemealDbReplacement(entry, catalog);
    if (replacement) {
      entry.imageUrl = replacement.imageUrl;
      fixed.push({ title: entry.title, from: replacement.title });
    }
  }

  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf8");

  console.log("Rotas:", broken.length, broken);
  console.log("Corregidas:", fixed.length);
  for (const item of fixed) {
    console.log(" ✓", item.title, "←", item.from);
  }
}

main().catch(console.error);
