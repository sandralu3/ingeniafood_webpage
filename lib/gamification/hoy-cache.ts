import {
  isRetiredSystemChallenge,
  getTodayDateString
} from "@/lib/gamification/challenges";
import type { HoyPageData } from "@/lib/gamification/hoy-page-data";

/** Bump when HoyPageData shape changes so soft-nav never hydrates stale payloads. */
const HOY_CACHE_PREFIX = "ingeniafood_hoy_data_v2";

function buildCacheKey(userId: string): string {
  return `${HOY_CACHE_PREFIX}_${userId}_${getTodayDateString()}`;
}

function sanitizeHoyPageData(data: HoyPageData): HoyPageData {
  return {
    ...data,
    activeChallenges: (data.activeChallenges ?? []).filter(
      (challenge) => !isRetiredSystemChallenge(challenge.id)
    ),
    allChallenges: (data.allChallenges ?? []).filter(
      (challenge) => !isRetiredSystemChallenge(challenge.id)
    ),
    todayCompletedIds: (data.todayCompletedIds ?? []).filter(
      (id) => !isRetiredSystemChallenge(id)
    ),
    weekCompletions: data.weekCompletions ?? [],
    streakCompletions: data.streakCompletions ?? data.weekCompletions ?? []
  };
}

function isValidHoyPageData(value: unknown, userId: string): value is HoyPageData {
  if (!value || typeof value !== "object") return false;

  const data = value as Partial<HoyPageData>;
  if (data.userId !== userId) return false;
  if (!data.metrics || typeof data.metrics !== "object") return false;
  if (!Array.isArray(data.activeChallenges) || !Array.isArray(data.allChallenges)) return false;
  if (!Array.isArray(data.todayCompletedIds) || !Array.isArray(data.weekCompletions)) return false;

  return true;
}

export function readHoyCache(userId: string): HoyPageData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(buildCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isValidHoyPageData(parsed, userId)) return null;

    return sanitizeHoyPageData(parsed);
  } catch {
    return null;
  }
}

export function writeHoyCache(userId: string, data: HoyPageData): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(buildCacheKey(userId), JSON.stringify(sanitizeHoyPageData(data)));
}

export function clearHoyCache(userId?: string): void {
  if (typeof window === "undefined") return;

  if (userId) {
    sessionStorage.removeItem(buildCacheKey(userId));
    // Also drop legacy v1 keys from previous soft-nav sessions.
    sessionStorage.removeItem(`ingeniafood_hoy_data_v1_${userId}_${getTodayDateString()}`);
    return;
  }

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (
      key?.startsWith(HOY_CACHE_PREFIX) ||
      key?.startsWith("ingeniafood_hoy_data_v1")
    ) {
      sessionStorage.removeItem(key);
    }
  }
}
