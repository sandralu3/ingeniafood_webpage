import type { InstagramCatalogRecipe } from "@/lib/recipes/instagram-catalog";

type InstagramCatalogResponse = {
  recipes?: InstagramCatalogRecipe[];
};

export async function fetchInstagramCatalogFromApi(): Promise<InstagramCatalogRecipe[]> {
  const response = await fetch("/api/instagram-catalog", {
    cache: "default"
  });

  if (!response.ok) {
    throw new Error(`Instagram catalog request failed (${response.status})`);
  }

  const payload = (await response.json()) as InstagramCatalogResponse;
  return Array.isArray(payload.recipes) ? payload.recipes : [];
}
