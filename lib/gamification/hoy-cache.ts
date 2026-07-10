import type { HoyPageData } from "@/lib/gamification/hoy-page-data";
import { getTodayDateString } from "@/lib/gamification/challenges";

const HOY_CACHE_PREFIX = "ingeniafood_hoy_data_v1";

function buildCacheKey(userId: string): string {
  return `${HOY_CACHE_PREFIX}_${userId}_${getTodayDateString()}`;
}

export function readHoyCache(userId: string): HoyPageData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(buildCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as HoyPageData;
    if (!parsed || parsed.userId !== userId) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function writeHoyCache(userId: string, data: HoyPageData): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(buildCacheKey(userId), JSON.stringify(data));
}

export function clearHoyCache(userId?: string): void {
  if (typeof window === "undefined") return;

  if (userId) {
    sessionStorage.removeItem(buildCacheKey(userId));
    return;
  }

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(HOY_CACHE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
}
