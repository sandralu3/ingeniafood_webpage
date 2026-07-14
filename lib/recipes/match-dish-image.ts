import {
  parseRecipeCuisineStyle,
  parseRecipeMealType,
  type RecipeCuisineStyle,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import type { DishImageBankItem, MatchDishImageInput, MatchDishImageResult } from "@/lib/recipes/dish-image-bank-types";
import {
  countSynonymTokenMatches,
  expandMatchTokens,
  sharesDishCategory
} from "@/lib/recipes/dish-match-synonyms";
import { normalizeMatchText, tokenizeMatchText } from "@/lib/recipes/normalize-match-text";

const MIN_MATCH_SCORE = 40;
const MIN_DISH_TOKEN_MATCHES = 1;

const ITALIAN_DISH_TOKENS = new Set(
  expandMatchTokens(["pasta", "pizza", "risotto", "lasagna", "carbonara", "bolognese", "italiana"])
);

const DESSERT_TOKENS = new Set(
  expandMatchTokens(["postre", "dessert", "cake", "brownie", "helado", "tarta", "chocolate", "cookie", "jam", "honey", "miel"])
);

function normalizeMealTypes(values: string[]): RecipeMealType[] {
  return values
    .map((value) => parseRecipeMealType(value))
    .filter((value): value is RecipeMealType => value !== null);
}

function normalizeCuisineStyles(values: string[]): RecipeCuisineStyle[] {
  return values
    .map((value) => parseRecipeCuisineStyle(value))
    .filter((value): value is RecipeCuisineStyle => value !== null);
}

function buildRecipeTokens(input: MatchDishImageInput): string[] {
  return tokenizeMatchText([input.recipeTitle, ...input.ingredients, ...input.tags].join(" "));
}

function buildEntryTokens(entry: DishImageBankItem): string[] {
  return tokenizeMatchText([entry.title, ...entry.keywords, ...entry.tags].join(" "));
}

function isDessertEntry(entry: DishImageBankItem): boolean {
  const entryTokens = expandMatchTokens(buildEntryTokens(entry));
  return entry.mealTypes.includes("postre") || entryTokens.some((token) => DESSERT_TOKENS.has(token));
}

function scoreDishImageBankItem(
  entry: DishImageBankItem,
  input: MatchDishImageInput
): number {
  const recipeTokens = buildRecipeTokens(input);
  const entryTokens = buildEntryTokens(entry);
  const dishTokenMatches = countSynonymTokenMatches(recipeTokens, entryTokens);

  if (dishTokenMatches < MIN_DISH_TOKEN_MATCHES) {
    return 0;
  }

  let score = dishTokenMatches * 18;

  const mealTypes = normalizeMealTypes(entry.mealTypes);
  const cuisineStyles = normalizeCuisineStyles(entry.cuisineStyles);

  if (mealTypes.length > 0) {
    if (mealTypes.includes(input.mealType)) {
      score += 22;
    } else {
      score -= 18;
    }
  }

  if (cuisineStyles.length > 0) {
    if (cuisineStyles.includes(input.cuisineStyle)) {
      score += 20;
    } else {
      score -= 12;
    }
  }

  if (input.cuisineStyle === "italiana") {
    const entryExpanded = expandMatchTokens(entryTokens);
    if (entryExpanded.some((token) => ITALIAN_DISH_TOKENS.has(token))) {
      score += 24;
    }
  }

  if (input.mealType !== "postre" && isDessertEntry(entry)) {
    score -= 45;
  }

  const normalizedRecipeTitle = normalizeMatchText(input.recipeTitle);
  const normalizedEntryTitle = normalizeMatchText(entry.title);
  if (
    normalizedRecipeTitle &&
    normalizedEntryTitle &&
    (normalizedRecipeTitle.includes(normalizedEntryTitle) ||
      normalizedEntryTitle.includes(normalizedRecipeTitle))
  ) {
    score += 16;
  }

  for (const tag of input.tags) {
    const normalizedTag = normalizeMatchText(tag);
    if (entry.tags.some((entryTag) => normalizeMatchText(entryTag) === normalizedTag)) {
      score += 12;
    }
  }

  if (entry.imageUrl.includes("themealdb.com")) {
    score += 18;
  } else if (entry.imageUrl.includes("unsplash.com")) {
    score -= 25;
  }

  if (!sharesDishCategory(recipeTokens, entryTokens)) {
    score = 0;
  }

  return score;
}

export function pickBestDishImageMatch(
  entries: DishImageBankItem[],
  input: MatchDishImageInput
): MatchDishImageResult | null {
  const activeEntries = entries.filter((entry) => entry.isActive);
  if (!activeEntries.length) return null;

  let best: MatchDishImageResult | null = null;

  for (const entry of activeEntries) {
    const score = scoreDishImageBankItem(entry, input);
    if (score < MIN_MATCH_SCORE) continue;

    if (!best || score > best.score) {
      best = {
        imageUrl: entry.imageUrl,
        bankItemId: entry.id,
        score,
        matchedTitle: entry.title
      };
    }
  }

  return best;
}

export function pickTopDishImageMatches(
  entries: DishImageBankItem[],
  input: MatchDishImageInput,
  limit = 8
): MatchDishImageResult[] {
  const activeEntries = entries.filter((entry) => entry.isActive);
  const ranked: MatchDishImageResult[] = [];

  for (const entry of activeEntries) {
    const score = scoreDishImageBankItem(entry, input);
    if (score < MIN_MATCH_SCORE) continue;

    ranked.push({
      imageUrl: entry.imageUrl,
      bankItemId: entry.id,
      score,
      matchedTitle: entry.title
    });
  }

  return ranked.sort((a, b) => b.score - a.score).slice(0, limit);
}
