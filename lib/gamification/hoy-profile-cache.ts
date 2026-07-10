type HoyProfileCache = {
  displayName: string;
  avatarUrl: string | null;
  initials: string;
};

const HOY_PROFILE_CACHE_PREFIX = "ingeniafood_hoy_profile_v1";

function buildCacheKey(userId: string): string {
  return `${HOY_PROFILE_CACHE_PREFIX}_${userId}`;
}

export function readHoyProfileCache(userId: string): HoyProfileCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(buildCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as HoyProfileCache;
    if (!parsed?.displayName) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function writeHoyProfileCache(userId: string, profile: HoyProfileCache): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(buildCacheKey(userId), JSON.stringify(profile));
}

export type { HoyProfileCache };
