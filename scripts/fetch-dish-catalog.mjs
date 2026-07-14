/**
 * Genera data/dish-image-bank-catalog.json desde TheMealDB + catálogo español.
 * Uso: node scripts/fetch-dish-catalog.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichDishKeywords } from "./dish-keyword-synonyms.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MEALDB = "https://www.themealdb.com/api/json/v1/1";
const OUT = join(ROOT, "data/dish-image-bank-catalog.json");
const DELAY_MS = 350;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url);
    if (response.status === 429) {
      await sleep(DELAY_MS * (attempt + 2));
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.json();
  }
  throw new Error(`Rate limited: ${url}`);
}

function mapMealType(category) {
  const c = (category ?? "").toLowerCase();
  if (c === "breakfast") return ["desayuno"];
  if (c === "dessert") return ["postre"];
  if (c === "starter" || c === "side") return ["almuerzo", "cena"];
  return ["almuerzo", "cena"];
}

function mapCuisineStyle(area) {
  const a = (area ?? "").toLowerCase();
  if (["japanese", "chinese", "thai", "vietnamese", "malaysian", "filipino"].includes(a)) {
    return ["asiatica"];
  }
  if (a === "indian") return ["india"];
  if (a === "italian") return ["italiana"];
  if (["mexican", "american", "british", "canadian", "australian"].includes(a)) {
    return ["fusion"];
  }
  return ["estandar"];
}

function tokenizeTitle(title) {
  return title
    .toLowerCase()
    .split(/[^a-záéíóúñ0-9]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
    .slice(0, 10);
}

function buildEntry(base) {
  const keywords = enrichDishKeywords(base);
  return { ...base, keywords };
}

/** Catálogo curado en español (Unsplash, sin API) */
const SPANISH_CURATED = [
  ["Pollo crujiente airfryer sin harinas", "photo-1604908554265-38d64d5f3f45", ["almuerzo", "cena"], ["estandar"], ["pollo", "airfryer", "crujiente"], ["Apto para Airfryer", "Sin Harinas"]],
  ["Bowl verde mediterráneo", "photo-1512621776951-a57141f2eefd", ["almuerzo", "cena"], ["estandar"], ["bowl", "verduras", "ensalada"], ["Sin Harinas"]],
  ["Smoothie rojo de frutos rojos", "photo-1505252585461-04db1eb84625", ["desayuno"], ["estandar"], ["smoothie", "frutos", "desayuno"], ["Sin Harinas"]],
  ["Tortilla española ligera", "photo-1632778149955-e80f8ebfa724", ["almuerzo", "cena"], ["estandar"], ["tortilla", "huevo", "patata"], []],
  ["Salmón al horno con limón", "photo-1467003909585-2f8a72700288", ["cena"], ["estandar"], ["salmon", "pescado", "horno"], ["Sin Harinas"]],
  ["Pasta italiana con tomate", "https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg", ["almuerzo", "cena"], ["italiana"], ["pasta", "tomate", "italiana"], []],
  ["Curry indio de garbanzos", "photo-1585937421612-70a008296fbe", ["almuerzo", "cena"], ["india"], ["curry", "garbanzos", "indio"], ["Sin Harinas"]],
  ["Wok de verduras asiático", "photo-1512058564366-18510be2db19", ["almuerzo", "cena"], ["asiatica"], ["wok", "verduras", "salteado"], ["Sin Harinas"]],
  ["Tacos mexicanos de pollo", "photo-1565299585323-38d6b0865b47", ["almuerzo", "cena"], ["fusion"], ["tacos", "pollo", "mexicano"], []],
  ["Yogur con granola y fruta", "photo-1488477181946-6428a0291777", ["desayuno"], ["estandar"], ["yogur", "granola", "fruta"], []],
  ["Huevos revueltos con aguacate", "photo-1525351484164-7529414344d8", ["desayuno"], ["estandar"], ["huevos", "aguacate", "desayuno"], ["Sin Harinas"]],
  ["Brownie de chocolate", "photo-1606313564200-e75d5e30476c", ["postre"], ["fusion"], ["brownie", "chocolate", "postre"], []],
  ["Risotto de setas", "photo-1476124369491-e7addf5db371", ["cena"], ["italiana"], ["risotto", "setas", "arroz"], []],
  ["Sushi variado japonés", "photo-1579584425558-c946af7f847", ["almuerzo", "cena"], ["asiatica"], ["sushi", "japones", "pescado"], ["Sin Harinas"]],
  ["Sopa de verduras casera", "photo-1547592166-23ac45744acd", ["almuerzo", "cena"], ["estandar"], ["sopa", "verduras", "caldo"], ["Sin Harinas"]],
  ["Pizza margarita", "https://www.themealdb.com/images/media/meals/x0lk9q1712305808.jpg", ["cena"], ["italiana"], ["pizza", "margarita", "mozzarella"], []],
  ["Poke bowl de atún", "photo-1546069901-ba9599a7e63c", ["almuerzo"], ["fusion"], ["poke", "atun", "bowl"], ["Sin Harinas"]],
  ["Carne con verduras asadas", "photo-1558030006-450675393462", ["cena"], ["estandar"], ["carne", "verduras", "asadas"], ["Sin Harinas"]],
  ["Tarta de queso", "photo-1533134242443-4854fd0f7113", ["postre"], ["estandar"], ["tarta", "queso", "postre"], []],
  ["Paella de marisco", "photo-1534080564585-6be75777b70a", ["almuerzo", "cena"], ["estandar"], ["paella", "marisco", "arroz"], []],
  ["Ensalada César con pollo", "photo-1546793665-c74683f339c1", ["almuerzo"], ["estandar"], ["ensalada", "cesar", "pollo"], ["Sin Harinas"]],
  ["Hamburguesa saludable de pavo", "photo-1568901346375-23c9450c58cd", ["almuerzo", "cena"], ["fusion"], ["hamburguesa", "pavo", "carne"], []],
  ["Lasaña de verduras", "photo-1574894709920-11b28e7367e3", ["cena"], ["italiana"], ["lasana", "verduras", "pasta"], []],
  ["Buddha bowl vegano", "photo-1540914120228-384a37bb9b3d", ["almuerzo"], ["fusion"], ["bowl", "vegano", "quinoa"], ["Sin Harinas"]],
  ["Tostada de aguacate", "photo-1525351484164-7529414344d8", ["desayuno"], ["estandar"], ["tostada", "aguacate", "desayuno"], ["Sin Harinas"]],
  ["Pancakes de avena", "photo-1567620905732-2d1ec7ab7445", ["desayuno"], ["estandar"], ["pancakes", "avena", "desayuno"], []],
  ["Gazpacho andaluz", "photo-1547592166-23ac45744acd", ["almuerzo"], ["estandar"], ["gazpacho", "tomate", "frio"], ["Sin Harinas"]],
  ["Ceviche de pescado", "photo-1565299585323-38d6b0865b47", ["almuerzo"], ["fusion"], ["ceviche", "pescado", "limon"], ["Sin Harinas"]],
  ["Ramen japonés", "photo-1569718212165-3a8278d5f624", ["cena"], ["asiatica"], ["ramen", "fideos", "japones"], []],
  ["Pad thai tailandés", "photo-1559314809-0d155014e29e", ["cena"], ["asiatica"], ["pad", "thai", "fideos"], []],
  ["Chili con carne", "photo-1585937421612-70a008296fbe", ["cena"], ["fusion"], ["chili", "carne", "picante"], ["Sin Harinas"]],
  ["Falafel con hummus", "photo-1512621776951-a57141f2eefd", ["almuerzo"], ["india"], ["falafel", "hummus", "garbanzo"], ["Sin Harinas"]],
  ["Tarta de manzana", "photo-1535920527002-b35e967229eb", ["postre"], ["estandar"], ["tarta", "manzana", "postre"], []],
  ["Helado de vainilla", "photo-1563805042-7684c019e1cb", ["postre"], ["estandar"], ["helado", "vainilla", "postre"], []],
  ["Filete de ternera a la plancha", "photo-1558030006-450675393462", ["cena"], ["estandar"], ["ternera", "filete", "carne"], ["Sin Harinas"]],
  ["Merluza al vapor con verduras", "photo-1467003909585-2f8a72700288", ["cena"], ["estandar"], ["merluza", "pescado", "vapor"], ["Sin Harinas"]],
  ["Wrap de pollo y espinacas", "photo-1626700051175-6818013e1d4f", ["almuerzo"], ["estandar"], ["wrap", "pollo", "espinacas"], []],
  ["Overnight oats con fruta", "photo-1488477181946-6428a0291777", ["desayuno"], ["estandar"], ["oats", "avena", "desayuno"], []],
  ["Croquetas de jamón", "photo-1632778149955-e80f8ebfa724", ["almuerzo", "cena"], ["estandar"], ["croquetas", "jamon", "tapas"], []],
  ["Guiso de lentejas", "photo-1547592166-23ac45744acd", ["cena"], ["estandar"], ["lentejas", "guiso", "legumbres"], ["Sin Harinas"]]
].map(([title, imageRef, mealTypes, cuisineStyles, keywords, tags]) =>
  buildEntry({
    title,
    imageUrl: imageRef.startsWith("http")
      ? imageRef
      : `https://images.unsplash.com/${imageRef}?w=1200`,
    mealTypes,
    cuisineStyles,
    keywords,
    tags
  })
);

async function fetchMealDbByCategories() {
  const categoriesData = await fetchJson(`${MEALDB}/categories.php`);
  const categories = (categoriesData.categories ?? []).map((c) => c.strCategory);
  const entries = [];
  const seenUrls = new Set();

  for (const category of categories) {
    await sleep(DELAY_MS);
    const listData = await fetchJson(`${MEALDB}/filter.php?c=${encodeURIComponent(category)}`);
    for (const meal of listData.meals ?? []) {
      if (!meal?.strMealThumb || !meal?.strMeal) continue;
      const imageUrl = meal.strMealThumb.replace("/preview", "/medium");
      if (seenUrls.has(imageUrl)) continue;
      seenUrls.add(imageUrl);

      entries.push(
        buildEntry({
          title: meal.strMeal,
          imageUrl,
          mealTypes: mapMealType(category),
          cuisineStyles: ["estandar"],
          keywords: tokenizeTitle(meal.strMeal),
          tags: []
        })
      );
    }
  }

  return entries;
}

async function fetchMealDbByAreas() {
  const areasData = await fetchJson(`${MEALDB}/list.php?a=list`);
  const areas = (areasData.meals ?? []).map((m) => m.strArea).filter(Boolean);
  const entries = [];
  const seenUrls = new Set();

  for (const area of areas) {
    await sleep(DELAY_MS);
    const listData = await fetchJson(`${MEALDB}/filter.php?a=${encodeURIComponent(area)}`);
    for (const meal of listData.meals ?? []) {
      if (!meal?.strMealThumb || !meal?.strMeal) continue;
      const imageUrl = meal.strMealThumb.replace("/preview", "/medium");
      if (seenUrls.has(imageUrl)) continue;
      seenUrls.add(imageUrl);

      entries.push(
        buildEntry({
          title: meal.strMeal,
          imageUrl,
          mealTypes: ["almuerzo", "cena"],
          cuisineStyles: mapCuisineStyle(area),
          keywords: tokenizeTitle(meal.strMeal),
          tags: []
        })
      );
    }
  }

  return entries;
}

async function main() {
  console.log("Descargando TheMealDB (categorías + áreas)...");
  const byCategory = await fetchMealDbByCategories();
  console.log(`  Por categoría: ${byCategory.length}`);
  const byArea = await fetchMealDbByAreas();
  console.log(`  Por área: ${byArea.length}`);

  const seen = new Set();
  const merged = [];
  for (const entry of [...SPANISH_CURATED, ...byCategory, ...byArea]) {
    if (seen.has(entry.imageUrl)) continue;
    seen.add(entry.imageUrl);
    merged.push(entry);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(merged, null, 2), "utf8");
  console.log(`✓ Catálogo guardado: ${merged.length} imágenes en data/dish-image-bank-catalog.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
