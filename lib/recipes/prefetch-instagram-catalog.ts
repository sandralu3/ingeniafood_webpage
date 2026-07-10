"use client";

import { fetchInstagramCatalogFromApi } from "@/lib/recipes/fetch-instagram-catalog-api";
import {
  readInstagramCatalogCache,
  writeInstagramCatalogCache
} from "@/lib/recipes/instagram-catalog-cache";

const BACKGROUND_REFRESH_MS = 5 * 60 * 1000;

let lastPrefetchAt = 0;
let inflightPrefetch: Promise<void> | null = null;

export async function prefetchInstagramCatalog(options?: {
  background?: boolean;
  force?: boolean;
}): Promise<void> {
  if (inflightPrefetch && !options?.force) {
    return inflightPrefetch;
  }

  if (!options?.force && !options?.background && readInstagramCatalogCache()) {
    return;
  }

  const now = Date.now();
  if (
    !options?.force &&
    options?.background &&
    now - lastPrefetchAt < BACKGROUND_REFRESH_MS
  ) {
    return;
  }

  const task = (async () => {
    try {
      const recipes = await fetchInstagramCatalogFromApi();
      writeInstagramCatalogCache(recipes);
      lastPrefetchAt = Date.now();
    } catch (error) {
      console.warn("[prefetch-instagram-catalog] No se pudo precargar catálogo:", error);
    } finally {
      inflightPrefetch = null;
    }
  })();

  inflightPrefetch = task;
  return task;
}
