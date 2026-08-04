import type { WeekDay } from "@/lib/plan/constants";
import { WEEK_DAYS } from "@/lib/plan/constants";

export type ChallengeSource = "system" | "custom";

export type DailyChallenge = {
  id: string;
  label: string;
  /** Legacy score weight for weekly metrics (no wallet). */
  points: number;
  source: ChallengeSource;
};

export type ConfigurableChallenge = DailyChallenge & {
  isActive: boolean;
  /** Días en que aparece en Hoy (si está activo). */
  activeDays: WeekDay[];
};

export const ALL_CHALLENGE_WEEK_DAYS: WeekDay[] = [...WEEK_DAYS];

/** Normaliza el array de días desde DB / UI. Vacío → todos los días. */
export function normalizeChallengeWeekDays(raw: unknown): WeekDay[] {
  const allowed = new Set<string>(WEEK_DAYS);
  const fromRaw = Array.isArray(raw)
    ? raw.filter((day): day is string => typeof day === "string" && allowed.has(day))
    : [];

  const selected = WEEK_DAYS.filter((day) => fromRaw.includes(day));
  return selected.length > 0 ? selected : [...WEEK_DAYS];
}

export function isChallengeScheduledForDay(
  activeDays: WeekDay[],
  day: WeekDay
): boolean {
  return normalizeChallengeWeekDays(activeDays).includes(day);
}

/**
 * Retos retirados del catálogo de hábitos (UI).
 * - 1: agua → parámetro personalizable (vasos en Hoy)
 * - 3/6: nutrición del plan
 * - 4: escaneo (solo banner/backend)
 */
export const RETIRED_SYSTEM_CHALLENGE_IDS = new Set(["1", "3", "4", "6"]);

export const SYSTEM_DAILY_CHALLENGES: DailyChallenge[] = [
  { id: "2", label: "Caminar 20 minutos", points: 2, source: "system" },
  { id: "5", label: "Cocinar sin harinas refinadas", points: 2, source: "system" },
  { id: "7", label: "Evitar bebidas azucaradas", points: 2, source: "system" },
  { id: "8", label: "Dormir al menos 7 horas", points: 2, source: "system" },
  { id: "9", label: "Preparar una comida casera", points: 2, source: "system" },
  { id: "10", label: "Hacer una pausa activa de 5 min", points: 2, source: "system" }
];

/**
 * Completación oculta al escanear: alimenta la racha 🔥 sin aparecer en hábitos.
 */
export const SCAN_PANTRY_CHALLENGE_ID = "4";

export function isRetiredSystemChallenge(id: string): boolean {
  return RETIRED_SYSTEM_CHALLENGE_IDS.has(id);
}

/** @deprecated Usa SYSTEM_DAILY_CHALLENGES */
export const DEFAULT_DAILY_CHALLENGES = SYSTEM_DAILY_CHALLENGES;

export const CUSTOM_CHALLENGE_DEFAULT_POINTS = 2;
export const WEEKLY_HEALTH_SCORE_MAX = 100;

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
