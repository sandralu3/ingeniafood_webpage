import type { InstagramCatalogRecipe } from "@/lib/recipes/instagram-catalog";

const CATALOG_CACHE_KEY = "ingeniafood_instagram_catalog_v1";
const CATALOG_CACHE_TTL_MS = 10 * 60 * 1000;

type CachedInstagramCatalog = {
  recipes: InstagramCatalogRecipe[];
  cachedAt: number;
};

export function readInstagramCatalogCache(): InstagramCatalogRecipe[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedInstagramCatalog;
    if (!Array.isArray(parsed.recipes)) return null;
    if (Date.now() - parsed.cachedAt > CATALOG_CACHE_TTL_MS) return null;

    return parsed.recipes;
  } catch {
    return null;
  }
}

export function writeInstagramCatalogCache(recipes: InstagramCatalogRecipe[]): void {
  if (typeof window === "undefined") return;

  const payload: CachedInstagramCatalog = {
    recipes,
    cachedAt: Date.now()
  };

  sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(payload));
}

export function clearInstagramCatalogCache(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CATALOG_CACHE_KEY);
}
