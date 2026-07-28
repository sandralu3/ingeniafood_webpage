import type {
  PremiumStoriesNutritionContext,
  PremiumStoriesPayload,
  PremiumStory
} from "@/lib/premium-stories/types";

const CACHE_PREFIX = "ingeniafood_premium_insights_v2";
const LEGACY_CACHE_PREFIXES = [
  "ingeniafood_premium_insights_v1",
  "ingeniafood_premium_stories_v1"
] as const;

function todayDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Fin del día local (23:59:59.999). */
export function endOfLocalDayMs(date = new Date()): number {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export function premiumStoriesDateKey(date = new Date()): string {
  return todayDateKey(date);
}

/** Huella estable de la despensa activa (ids ordenados). */
export function buildPantryFingerprint(ingredientIds: string[]): string {
  return [...ingredientIds]
    .map((id) => id.trim())
    .filter(Boolean)
    .sort()
    .join("|");
}

/** Huella del menú de hoy: si cambia el plan, los insights dejan de ser válidos. */
export function buildNutritionFingerprint(
  nutrition: PremiumStoriesNutritionContext
): string {
  const titles = (nutrition.mealTitles ?? [])
    .map((title) => title.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(",");
  return [
    nutrition.plannedMealCount,
    nutrition.totalKcal,
    nutrition.hasVegetables ? 1 : 0,
    nutrition.hasProtein ? 1 : 0,
    titles
  ].join("|");
}

function cacheKey(userId: string, dateKey: string): string {
  return `${CACHE_PREFIX}_${userId}_${dateKey}`;
}

function isValidPayload(value: unknown): value is PremiumStoriesPayload {
  if (!value || typeof value !== "object") return false;
  const row = value as PremiumStoriesPayload;
  return (
    typeof row.dateKey === "string" &&
    typeof row.pantryFingerprint === "string" &&
    typeof row.nutritionFingerprint === "string" &&
    typeof row.expiresAt === "number" &&
    typeof row.generatedAt === "string" &&
    Array.isArray(row.stories) &&
    row.stories.length > 0
  );
}

/**
 * Lee insights del día si siguen vigentes y despensa + menú no cambiaron.
 * Clave conceptual: premium_insights_YYYY_MM_DD (por usuario).
 */
export function readPremiumStoriesCache(
  userId: string,
  pantryFingerprint: string,
  nutritionFingerprint: string,
  date = new Date()
): PremiumStoriesPayload | null {
  if (typeof window === "undefined" || !userId) return null;

  const dateKey = todayDateKey(date);
  try {
    const raw = localStorage.getItem(cacheKey(userId, dateKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidPayload(parsed)) {
      localStorage.removeItem(cacheKey(userId, dateKey));
      return null;
    }
    if (parsed.dateKey !== dateKey || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(cacheKey(userId, dateKey));
      return null;
    }
    if (parsed.pantryFingerprint !== pantryFingerprint) {
      localStorage.removeItem(cacheKey(userId, dateKey));
      return null;
    }
    if (parsed.nutritionFingerprint !== nutritionFingerprint) {
      localStorage.removeItem(cacheKey(userId, dateKey));
      return null;
    }
    return { ...parsed, fromCache: true };
  } catch {
    return null;
  }
}

export function writePremiumStoriesCache(
  userId: string,
  payload: Omit<PremiumStoriesPayload, "fromCache">
): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(
      cacheKey(userId, payload.dateKey),
      JSON.stringify(payload satisfies PremiumStoriesPayload)
    );
  } catch {
    // quota / private mode
  }
}

/** Invalida caché del día (despensa o plan modificados). */
export function invalidatePremiumStoriesCache(userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const dateKey = todayDateKey();
    const removeForUser = (uid: string) => {
      localStorage.removeItem(cacheKey(uid, dateKey));
      for (const prefix of LEGACY_CACHE_PREFIXES) {
        localStorage.removeItem(`${prefix}_${uid}_${dateKey}`);
      }
    };
    if (userId) {
      removeForUser(userId);
      return;
    }
    for (const key of Object.keys(localStorage)) {
      const isCurrent = key.startsWith(`${CACHE_PREFIX}_`);
      const isLegacy = LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(`${prefix}_`));
      if ((isCurrent || isLegacy) && key.endsWith(`_${dateKey}`)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

/** Alias semántico para insights Premium. */
export const invalidatePremiumInsightsCache = invalidatePremiumStoriesCache;

export function clearAllPremiumStoriesCache(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(localStorage)) {
      if (
        key.startsWith(CACHE_PREFIX) ||
        LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

export function assertThreeStories(stories: PremiumStory[]): PremiumStory[] {
  return stories.slice(0, 3);
}
