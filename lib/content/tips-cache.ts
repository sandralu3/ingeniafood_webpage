import type { Database } from "@/types/database.types";

export type HealthyTip = Database["public"]["Tables"]["tips_saludables"]["Row"];

const TIPS_CACHE_KEY = "ingeniafood_tips_saludables_v2";

export function readTipsCache(): HealthyTip[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(TIPS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HealthyTip[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeTipsCache(tips: HealthyTip[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TIPS_CACHE_KEY, JSON.stringify(tips));
}

export function clearTipsCache(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TIPS_CACHE_KEY);
}
