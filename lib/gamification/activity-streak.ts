import type { SupabaseClient } from "@supabase/supabase-js";
import { SCANNER_DRAFT_DESCRIPTION } from "@/lib/recipes/scanner-draft";
import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";
import { toISODateString } from "@/lib/plan/week-utils";
import type { Database } from "@/types/database.types";

export const STREAK_ACTIVITY_RETO_ID = "__activity__";

export type StreakCompletionRow = {
  reto_id: string;
  completado_at: string;
};

function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

function isIsoDateInRange(iso: string, fromDate: string, toDate: string): boolean {
  return iso >= fromDate && iso <= toDate;
}

function localIsoFromTimestamp(value: string): string {
  return toISODateString(new Date(value));
}

function isRegisteredMealTags(tags: unknown): boolean {
  const list = normalizeRecipeTags(tags).map((tag) => tag.toLowerCase());
  return (
    list.includes("escaneado") ||
    list.includes("comida_fuera") ||
    list.includes("comida fuera")
  );
}

/** Une fechas de actividad al historial de retos sin duplicar el día. */
export function mergeActivityIntoCompletions(
  completions: StreakCompletionRow[],
  activityDates: string[]
): StreakCompletionRow[] {
  const existing = new Set(completions.map((row) => row.completado_at));
  const extras: StreakCompletionRow[] = [];

  for (const date of activityDates) {
    if (!date || existing.has(date)) continue;
    existing.add(date);
    extras.push({ reto_id: STREAK_ACTIVITY_RETO_ID, completado_at: date });
  }

  return extras.length === 0 ? completions : [...completions, ...extras];
}

/**
 * Días con vasos de agua, comida/snack registrado o receta del escáner.
 * El escáner de despensa también deja rastro en retos (id 4); aquí cubrimos
 * historial de agua y registros de comida aunque no hubiera reto ese día.
 */
export async function fetchLifestyleActivityDates(
  client: SupabaseClient<Database>,
  userId: string,
  fromDate: string,
  toDate: string
): Promise<string[]> {
  const fromInstant = new Date(`${fromDate}T00:00:00`);
  fromInstant.setDate(fromInstant.getDate() - 1);
  const toInstant = new Date(`${toDate}T23:59:59.999`);
  toInstant.setDate(toInstant.getDate() + 1);

  const fromIso = fromInstant.toISOString();
  const toIso = toInstant.toISOString();
  const dates = new Set<string>();

  const [waterResult, recipesResult, snacksResult] = await Promise.all([
    client
      .from("water_intake_daily")
      .select("intake_date, glasses_drunk")
      .eq("user_id", userId)
      .gte("intake_date", fromDate)
      .lte("intake_date", toDate)
      .gt("glasses_drunk", 0),
    client
      .from("recipes")
      .select("created_at, tags, description")
      .eq("user_id", userId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .limit(2000),
    client
      .from("plan_snacks")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .limit(2000)
  ]);

  if (waterResult.error && !isMissingTableError(waterResult.error)) {
    console.warn("[activity-streak] Error leyendo vasos:", waterResult.error.message);
  } else {
    for (const row of waterResult.data ?? []) {
      const iso =
        typeof row.intake_date === "string"
          ? row.intake_date.slice(0, 10)
          : "";
      if (iso && isIsoDateInRange(iso, fromDate, toDate)) {
        dates.add(iso);
      }
    }
  }

  if (recipesResult.error) {
    console.warn("[activity-streak] Error leyendo recetas:", recipesResult.error.message);
  } else {
    for (const row of recipesResult.data ?? []) {
      const iso = localIsoFromTimestamp(row.created_at);
      if (!isIsoDateInRange(iso, fromDate, toDate)) continue;
      const isScannerDraft = row.description === SCANNER_DRAFT_DESCRIPTION;
      if (isScannerDraft || isRegisteredMealTags(row.tags)) {
        dates.add(iso);
      }
    }
  }

  if (snacksResult.error && !isMissingTableError(snacksResult.error)) {
    console.warn("[activity-streak] Error leyendo snacks:", snacksResult.error.message);
  } else {
    for (const row of snacksResult.data ?? []) {
      const iso = localIsoFromTimestamp(row.created_at);
      if (isIsoDateInRange(iso, fromDate, toDate)) {
        dates.add(iso);
      }
    }
  }

  return Array.from(dates);
}
