import type { Database } from "@/types/database.types";
import type { AppLocale } from "@/i18n/config";

export type HealthyTip = Database["public"]["Tables"]["tips_saludables"]["Row"] & {
  language?: string | null;
};

const TIPS_CACHE_PREFIX = "ingeniafood_tips_saludables_v3";

function cacheKey(locale: AppLocale): string {
  return `${TIPS_CACHE_PREFIX}_${locale}`;
}

export function readTipsCache(locale: AppLocale): HealthyTip[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(cacheKey(locale));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HealthyTip[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeTipsCache(locale: AppLocale, tips: HealthyTip[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(cacheKey(locale), JSON.stringify(tips));
}

export function clearTipsCache(locale?: AppLocale): void {
  if (typeof window === "undefined") return;
  if (locale) {
    sessionStorage.removeItem(cacheKey(locale));
    return;
  }
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(TIPS_CACHE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
}
