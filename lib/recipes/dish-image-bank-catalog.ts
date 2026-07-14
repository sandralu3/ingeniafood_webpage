import type { DishImageBankItem, MatchDishImageInput, MatchDishImageResult } from "@/lib/recipes/dish-image-bank-types";
import {
  parseRecipeCuisineStyle,
  parseRecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import { pickBestDishImageMatch } from "@/lib/recipes/match-dish-image";
import catalogData from "@/data/dish-image-bank-catalog.json";

type CatalogEntry = {
  title: string;
  imageUrl: string;
  mealTypes: string[];
  cuisineStyles: string[];
  keywords: string[];
  tags: string[];
};

const CATALOG_ENTRIES = catalogData as CatalogEntry[];

let cachedItems: DishImageBankItem[] | null = null;

function getBundledCatalogItems(): DishImageBankItem[] {
  if (cachedItems) return cachedItems;

  const now = new Date(0).toISOString();
  cachedItems = CATALOG_ENTRIES.map((entry, index) => ({
    id: `catalog-${index}`,
    imageUrl: entry.imageUrl,
    title: entry.title,
    mealTypes: entry.mealTypes
      .map((value) => parseRecipeMealType(value))
      .filter((value): value is NonNullable<ReturnType<typeof parseRecipeMealType>> => value !== null),
    cuisineStyles: entry.cuisineStyles
      .map((value) => parseRecipeCuisineStyle(value))
      .filter((value): value is NonNullable<ReturnType<typeof parseRecipeCuisineStyle>> => value !== null),
    keywords: entry.keywords ?? [],
    tags: entry.tags ?? [],
    isActive: true,
    createdAt: now,
    updatedAt: now
  }));

  return cachedItems;
}

export function getBundledCatalogCount(): number {
  return CATALOG_ENTRIES.length;
}

export { getBundledCatalogItems };

export type BundledCatalogRow = {
  image_url: string;
  title: string;
  meal_types: string[];
  cuisine_styles: string[];
  keywords: string[];
  tags: string[];
};

export function getBundledCatalogRows(): BundledCatalogRow[] {
  return CATALOG_ENTRIES.map((entry) => ({
    image_url: entry.imageUrl,
    title: entry.title,
    meal_types: entry.mealTypes,
    cuisine_styles: entry.cuisineStyles,
    keywords: entry.keywords ?? [],
    tags: entry.tags ?? []
  }));
}

export function matchDishImageFromBundledCatalog(
  input: MatchDishImageInput
): MatchDishImageResult | null {
  return pickBestDishImageMatch(getBundledCatalogItems(), input);
}
