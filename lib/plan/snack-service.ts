import type { WeekDay } from "@/lib/plan/constants";
import type { SnackSuggestion } from "@/lib/plan/frequent-snacks";
import { findSnackPreset, type PlanSnack, type PlanSnackSource } from "@/lib/plan/snack-presets";
import { canRegisterExternalMealForPlanDay } from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database } from "@/types/database.types";

type PlanSnackRow = Database["public"]["Tables"]["plan_snacks"]["Row"];

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("plan_snacks") === true
  );
}

function mapRowToSnack(row: PlanSnackRow): PlanSnack {
  return {
    id: row.id,
    title: row.title,
    kcal: row.kcal,
    proteinGrams: row.proteinas_g,
    carbsGrams: row.carbohidratos_g,
    fatGrams: row.grasas_g,
    imageUrl: row.image_url,
    source: (row.source as PlanSnackSource) || "quick",
    emoji: row.emoji,
    dayLabel: row.dia_semana as WeekDay
  };
}

export async function fetchSnacksForWeek(
  userId: string,
  weekStartISO: string
): Promise<PlanSnack[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("plan_snacks")
    .select("*")
    .eq("user_id", userId)
    .eq("semana_inicio", weekStartISO)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("[plan-snacks] tabla no disponible aún:", error.message);
      return [];
    }
    throw error;
  }

  return (data ?? []).map(mapRowToSnack);
}

export async function addQuickSnackToPlan(params: {
  userId: string;
  dayLabel: WeekDay;
  weekStartISO: string;
  presetId: string;
}): Promise<{ snack: PlanSnack } | { error: string }> {
  if (!canRegisterExternalMealForPlanDay(params.weekStartISO, params.dayLabel)) {
    return {
      error: "Solo puedes registrar snacks en hoy o días pasados."
    };
  }

  const preset = findSnackPreset(params.presetId);
  if (!preset) {
    return { error: "Snack no reconocido." };
  }

  return insertSnack({
    userId: params.userId,
    dayLabel: params.dayLabel,
    weekStartISO: params.weekStartISO,
    title: preset.title,
    kcal: preset.kcal,
    proteinGrams: preset.proteinGrams,
    carbsGrams: preset.carbsGrams,
    fatGrams: preset.fatGrams,
    source: "quick",
    emoji: preset.emoji,
    imageUrl: null
  });
}

/** Añade un chip de sugerencia (frecuente del usuario o preset). */
export async function addSuggestedSnackToPlan(params: {
  userId: string;
  dayLabel: WeekDay;
  weekStartISO: string;
  suggestion: SnackSuggestion;
}): Promise<{ snack: PlanSnack } | { error: string }> {
  if (!canRegisterExternalMealForPlanDay(params.weekStartISO, params.dayLabel)) {
    return {
      error: "Solo puedes registrar snacks en hoy o días pasados."
    };
  }

  const suggestion = params.suggestion;
  const presetId = suggestion.id.startsWith("preset:")
    ? suggestion.id.slice("preset:".length)
    : null;
  const preset = presetId ? findSnackPreset(presetId) : null;

  return insertSnack({
    userId: params.userId,
    dayLabel: params.dayLabel,
    weekStartISO: params.weekStartISO,
    title: (preset?.title ?? suggestion.title).trim().slice(0, 120) || "Snack",
    kcal: Math.max(0, Math.round(preset?.kcal ?? suggestion.kcal)),
    proteinGrams: Math.max(0, Math.round(preset?.proteinGrams ?? suggestion.proteinGrams)),
    carbsGrams: Math.max(0, Math.round(preset?.carbsGrams ?? suggestion.carbsGrams)),
    fatGrams: Math.max(0, Math.round(preset?.fatGrams ?? suggestion.fatGrams)),
    source: "quick",
    emoji: preset?.emoji ?? suggestion.emoji ?? "🍪",
    imageUrl: null
  });
}

export async function addEstimatedSnackToPlan(params: {
  userId: string;
  dayLabel: WeekDay;
  weekStartISO: string;
  title: string;
  kcal: number;
  proteinGrams: number;
  carbsGrams?: number;
  fatGrams?: number;
  source: Exclude<PlanSnackSource, "quick">;
  imageUrl?: string | null;
}): Promise<{ snack: PlanSnack } | { error: string }> {
  if (!canRegisterExternalMealForPlanDay(params.weekStartISO, params.dayLabel)) {
    return {
      error: "Solo puedes registrar snacks en hoy o días pasados."
    };
  }

  const proteinKcal = params.proteinGrams * 4;
  const remaining = Math.max(0, params.kcal - proteinKcal);
  const carbs =
    typeof params.carbsGrams === "number"
      ? params.carbsGrams
      : Math.max(0, Math.round((remaining * 0.65) / 4));
  const fat =
    typeof params.fatGrams === "number"
      ? params.fatGrams
      : Math.max(0, Math.round((remaining * 0.35) / 9));

  return insertSnack({
    userId: params.userId,
    dayLabel: params.dayLabel,
    weekStartISO: params.weekStartISO,
    title: params.title.trim().slice(0, 120) || "Snack",
    kcal: Math.max(0, Math.round(params.kcal)),
    proteinGrams: Math.max(0, Math.round(params.proteinGrams)),
    carbsGrams: Math.max(0, Math.round(carbs)),
    fatGrams: Math.max(0, Math.round(fat)),
    source: params.source,
    emoji: params.source === "photo" ? "📸" : "✍️",
    imageUrl: params.imageUrl ?? null
  });
}

async function insertSnack(params: {
  userId: string;
  dayLabel: WeekDay;
  weekStartISO: string;
  title: string;
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  source: PlanSnackSource;
  emoji?: string | null;
  imageUrl?: string | null;
}): Promise<{ snack: PlanSnack } | { error: string }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("plan_snacks")
    .insert({
      user_id: params.userId,
      semana_inicio: params.weekStartISO,
      dia_semana: params.dayLabel,
      title: params.title,
      kcal: params.kcal,
      proteinas_g: params.proteinGrams,
      carbohidratos_g: params.carbsGrams,
      grasas_g: params.fatGrams,
      source: params.source,
      emoji: params.emoji ?? null,
      image_url: params.imageUrl ?? null
    })
    .select("*")
    .single();

  if (error || !data) {
    if (isMissingTableError(error)) {
      return {
        error:
          "Falta aplicar la migración de snacks en Supabase (plan_snacks). Ejecuta las migraciones y reintenta."
      };
    }
    console.error("[plan-snacks] insert:", error);
    return { error: "No pudimos guardar el snack. Inténtalo de nuevo." };
  }

  // Solo plan_snacks: no crear recetas en el recetario (evita duplicados en el picker).
  return { snack: mapRowToSnack(data as PlanSnackRow) };
}

export async function removeSnackFromPlan(params: {
  userId: string;
  snackId: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("plan_snacks")
    .delete()
    .eq("id", params.snackId)
    .eq("user_id", params.userId);

  if (error) {
    if (isMissingTableError(error)) {
      return { error: "La tabla de snacks no está disponible." };
    }
    console.error("[plan-snacks] delete:", error);
    return { error: "No pudimos eliminar el snack." };
  }

  return { ok: true };
}

export function groupSnacksByDay(snacks: PlanSnack[]): Record<WeekDay, PlanSnack[]> {
  const empty: Record<WeekDay, PlanSnack[]> = {
    Lunes: [],
    Martes: [],
    Miércoles: [],
    Jueves: [],
    Viernes: [],
    Sábado: [],
    Domingo: []
  };

  for (const snack of snacks) {
    const day = snack.dayLabel;
    if (day && empty[day]) {
      empty[day].push(snack);
    }
  }

  return empty;
}
