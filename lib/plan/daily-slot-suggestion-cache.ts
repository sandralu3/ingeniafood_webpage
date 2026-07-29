import type { MealType } from "@/lib/plan/constants";
import type { MealSuggestion } from "@/lib/plan/meal-suggestion";
import { toISODateString } from "@/lib/plan/week-utils";

const CACHE_PREFIX = "ingeniafood_hoy_slot_suggestions_v2";

type DaySuggestionsCache = {
  date: string;
  userId: string;
  byMeal: Partial<Record<MealType, MealSuggestion>>;
};

function todayISO(): string {
  return toISODateString(new Date());
}

function buildKey(userId: string, date: string): string {
  return `${CACHE_PREFIX}_${userId}_${date}`;
}

function readDayCache(userId: string): DaySuggestionsCache | null {
  if (typeof window === "undefined") return null;
  try {
    const date = todayISO();
    const raw = localStorage.getItem(buildKey(userId, date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DaySuggestionsCache;
    if (parsed.userId !== userId || parsed.date !== date) return null;
    if (!parsed.byMeal || typeof parsed.byMeal !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDayCache(cache: DaySuggestionsCache): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(buildKey(cache.userId, cache.date), JSON.stringify(cache));
  } catch {
    // Quota / private mode: ignore.
  }
}

function isValidSuggestion(value: unknown): value is MealSuggestion {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MealSuggestion>;
  return (
    typeof item.recipeId === "string" &&
    item.recipeId.length > 0 &&
    typeof item.title === "string" &&
    typeof item.mealType === "string"
  );
}

/** Sugerencia del día para un slot vacío (una por comida y día). */
export function readDailySlotSuggestion(
  userId: string,
  mealType: MealType
): MealSuggestion | null {
  const cache = readDayCache(userId);
  const suggestion = cache?.byMeal[mealType];
  return isValidSuggestion(suggestion) ? suggestion : null;
}

export function writeDailySlotSuggestion(
  userId: string,
  mealType: MealType,
  suggestion: MealSuggestion
): void {
  const date = todayISO();
  const current = readDayCache(userId) ?? { date, userId, byMeal: {} };
  writeDayCache({
    date,
    userId,
    byMeal: {
      ...current.byMeal,
      [mealType]: suggestion
    }
  });
}

export function clearDailySlotSuggestion(userId: string, mealType: MealType): void {
  const cache = readDayCache(userId);
  if (!cache?.byMeal[mealType]) return;
  const nextByMeal = { ...cache.byMeal };
  delete nextByMeal[mealType];
  writeDayCache({
    ...cache,
    byMeal: nextByMeal
  });
}
