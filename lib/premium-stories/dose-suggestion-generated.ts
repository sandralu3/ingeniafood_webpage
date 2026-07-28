import { toISODateString } from "@/lib/plan/week-utils";

const STORAGE_KEY = "ingeniafood_dose_suggestion_generated";

type DoseSuggestionGeneratedMap = Record<string, true>;

function readMap(): DoseSuggestionGeneratedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as DoseSuggestionGeneratedMap;
  } catch {
    return {};
  }
}

function writeMap(map: DoseSuggestionGeneratedMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

/** Fecha del análisis (hoy) para la que ya se generó la receta sugerida. */
export function markDoseSuggestionGenerated(dateKey?: string | null): void {
  const key = (dateKey && dateKey.trim()) || toISODateString(new Date());
  const map = readMap();
  map[key] = true;
  // Mantener solo ~14 días para no crecer sin límite.
  const keys = Object.keys(map).sort();
  if (keys.length > 14) {
    keys.slice(0, keys.length - 14).forEach((old) => {
      delete map[old];
    });
  }
  writeMap(map);
}

export function hasDoseSuggestionGenerated(dateKey?: string | null): boolean {
  const key = (dateKey && dateKey.trim()) || toISODateString(new Date());
  return Boolean(readMap()[key]);
}
