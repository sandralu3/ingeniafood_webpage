import { getTodayDateString } from "@/lib/gamification/challenges";
import { createSupabaseClient } from "@/lib/supabaseClient";

/** Vasos diarios permitidos (null en perfil = tracker desactivado). */
export const WATER_GLASSES_MIN = 1;
export const WATER_GLASSES_MAX = 16;
/** Sugerencia ~2 L (vaso ≈ 250 ml). */
export const WATER_GLASSES_SUGGESTED = 8;

export function clampWaterGlassesGoal(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < WATER_GLASSES_MIN) return null;
  return Math.min(WATER_GLASSES_MAX, rounded);
}

export function clampGlassesDrunk(
  drunk: number,
  goal: number | null | undefined
): number {
  const safeGoal = clampWaterGlassesGoal(goal) ?? 0;
  if (safeGoal <= 0) return 0;
  if (!Number.isFinite(drunk) || drunk < 0) return 0;
  return Math.min(safeGoal, Math.round(drunk));
}

/**
 * Al pulsar el vaso en índice `index` (0-based):
 * - si ya estaba lleno (index < drunk) → baja el nivel a `index`
 * - si estaba vacío → llena hasta incluir ese vaso (`index + 1`)
 */
export function nextGlassesDrunkAfterTap(
  currentDrunk: number,
  index: number,
  goal: number
): number {
  const safeGoal = clampWaterGlassesGoal(goal) ?? 0;
  if (safeGoal <= 0 || index < 0 || index >= safeGoal) {
    return clampGlassesDrunk(currentDrunk, safeGoal);
  }
  const drunk = clampGlassesDrunk(currentDrunk, safeGoal);
  if (index < drunk) {
    return index;
  }
  return index + 1;
}

export type WaterIntakeChangePayload = {
  userId: string;
  glassesDrunk?: number;
  goal?: number | null;
};

type WaterIntakeListener = (payload: WaterIntakeChangePayload) => void;

const waterIntakeListeners = new Set<WaterIntakeListener>();

/** Avisa a Hoy / informe de dosis cuando cambia el agua del día o la meta. */
export function notifyWaterIntakeChanged(payload: WaterIntakeChangePayload): void {
  waterIntakeListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error("[water-intake] Error en listener de hidratación:", error);
    }
  });
}

export function subscribeWaterIntakeChanged(listener: WaterIntakeListener): () => void {
  waterIntakeListeners.add(listener);
  return () => {
    waterIntakeListeners.delete(listener);
  };
}

export async function fetchWaterGlassesGoal(userId: string): Promise<number | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("water_glasses_goal")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[water-intake] Error leyendo meta de vasos:", error);
    return null;
  }

  return clampWaterGlassesGoal(data?.water_glasses_goal ?? null);
}

export async function saveWaterGlassesGoal(
  userId: string,
  goal: number | null
): Promise<{ ok: true; goal: number | null } | { ok: false; error: string }> {
  const supabase = createSupabaseClient();
  const normalized = clampWaterGlassesGoal(goal);

  const { error } = await supabase
    .from("profiles")
    .update({ water_glasses_goal: normalized })
    .eq("id", userId);

  if (error) {
    console.error("[water-intake] Error guardando meta de vasos:", error);
    return { ok: false, error: error.message };
  }

  notifyWaterIntakeChanged({ userId, goal: normalized });

  return { ok: true, goal: normalized };
}

export async function fetchTodayWaterGlassesDrunk(userId: string): Promise<number> {
  const supabase = createSupabaseClient();
  const today = getTodayDateString();

  const { data, error } = await supabase
    .from("water_intake_daily")
    .select("glasses_drunk")
    .eq("user_id", userId)
    .eq("intake_date", today)
    .maybeSingle();

  if (error) {
    // Tabla aún no migrada: no romper Hoy.
    if (error.code === "PGRST205") return 0;
    console.error("[water-intake] Error leyendo vasos de hoy:", error);
    return 0;
  }

  const raw = data?.glasses_drunk;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(WATER_GLASSES_MAX, Math.round(raw));
}

export async function setTodayWaterGlassesDrunk(
  userId: string,
  glassesDrunk: number,
  goal: number
): Promise<{ ok: true; glassesDrunk: number } | { ok: false; error: string }> {
  const supabase = createSupabaseClient();
  const today = getTodayDateString();
  const normalized = clampGlassesDrunk(glassesDrunk, goal);

  const { error } = await supabase.from("water_intake_daily").upsert(
    {
      user_id: userId,
      intake_date: today,
      glasses_drunk: normalized,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,intake_date" }
  );

  if (error) {
    console.error("[water-intake] Error guardando vasos de hoy:", error);
    return { ok: false, error: error.message };
  }

  notifyWaterIntakeChanged({
    userId,
    glassesDrunk: normalized,
    goal: clampWaterGlassesGoal(goal)
  });

  return { ok: true, glassesDrunk: normalized };
}
