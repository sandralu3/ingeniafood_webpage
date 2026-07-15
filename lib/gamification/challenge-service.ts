import {
  CUSTOM_CHALLENGE_DEFAULT_POINTS,
  SYSTEM_DAILY_CHALLENGES,
  type ConfigurableChallenge,
  type DailyChallenge,
  getTodayDateString
} from "@/lib/gamification/challenges";
import { getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateWeeklyHealthMetrics,
  type WeeklyHealthMetrics
} from "@/lib/gamification/weekly-metrics";

type CustomChallengeRow = Pick<
  Database["public"]["Tables"]["retos_personalizados"]["Row"],
  "id" | "titulo" | "puntos"
>;

type CompletionsTable = "retos_completados_diarios" | "retos_usuarios";

const CUSTOM_CHALLENGES_MIGRATION_MESSAGE =
  "Las metas personalizadas requieren ejecutar la migración de Supabase (retos_personalizados).";

let completionsTableCache: CompletionsTable | null = null;
let customChallengesAvailableCache: boolean | null = null;
let activeChallengesTableAvailableCache: boolean | null = null;

function isTableNotFoundError(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205";
}

function mapCustomChallenge(row: CustomChallengeRow): DailyChallenge {
  return {
    id: row.id,
    label: row.titulo,
    points: row.puntos,
    source: "custom"
  };
}

async function resolveCompletionsTable(
  supabase: SupabaseClient<Database>
): Promise<CompletionsTable> {
  if (completionsTableCache) {
    return completionsTableCache;
  }

  const { error } = await supabase.from("retos_completados_diarios").select("id").limit(1);

  completionsTableCache = isTableNotFoundError(error)
    ? "retos_usuarios"
    : "retos_completados_diarios";

  if (completionsTableCache === "retos_usuarios") {
    console.warn(
      "[gamification] Tabla retos_completados_diarios no encontrada. Usando retos_usuarios como fallback."
    );
  }

  return completionsTableCache;
}

async function isCustomChallengesAvailable(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  if (customChallengesAvailableCache !== null) {
    return customChallengesAvailableCache;
  }

  const { error } = await supabase.from("retos_personalizados").select("id").limit(1);
  customChallengesAvailableCache = !isTableNotFoundError(error);

  if (!customChallengesAvailableCache) {
    console.warn(
      "[gamification] Tabla retos_personalizados no encontrada. Las metas personalizadas estarán deshabilitadas hasta ejecutar la migración."
    );
  }

  return customChallengesAvailableCache;
}

export async function fetchCustomChallenges(userId: string): Promise<DailyChallenge[]> {
  const supabase = createSupabaseClient();

  if (!(await isCustomChallengesAvailable(supabase))) {
    return [];
  }

  const { data, error } = await supabase
    .from("retos_personalizados")
    .select("id, titulo, puntos, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[gamification] Error cargando retos personalizados:", error);
    throw error;
  }

  return (data ?? []).map(mapCustomChallenge);
}

async function isActiveChallengesTableAvailable(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  if (activeChallengesTableAvailableCache !== null) {
    return activeChallengesTableAvailableCache;
  }

  const { error } = await supabase.from("retos_hoy_activos").select("id").limit(1);
  activeChallengesTableAvailableCache = !isTableNotFoundError(error);

  if (!activeChallengesTableAvailableCache) {
    console.warn(
      "[gamification] Tabla retos_hoy_activos no encontrada. Ejecuta la migración para configurar retos en Hoy."
    );
  }

  return activeChallengesTableAvailableCache;
}

export async function fetchActiveRetoIds(userId: string): Promise<string[]> {
  const supabase = createSupabaseClient();

  if (!(await isActiveChallengesTableAvailable(supabase))) {
    return [];
  }

  const { data, error } = await supabase
    .from("retos_hoy_activos")
    .select("reto_id")
    .eq("user_id", userId);

  if (error) {
    console.error("[gamification] Error cargando retos activos:", error);
    throw error;
  }

  return (data ?? []).map((row) => row.reto_id);
}

export async function setRetoActiveForHoy(params: {
  userId: string;
  retoId: string;
  active: boolean;
}): Promise<void> {
  const supabase = createSupabaseClient();

  if (!(await isActiveChallengesTableAvailable(supabase))) {
    throw new Error(
      "La configuración de retos requiere ejecutar la migración de Supabase (retos_hoy_activos)."
    );
  }

  if (params.active) {
    const { error } = await supabase.from("retos_hoy_activos").insert({
      user_id: params.userId,
      reto_id: params.retoId
    });

    if (error && error.code !== "23505") {
      console.error("[gamification] Error activando reto:", error);
      throw error;
    }
    return;
  }

  const { error } = await supabase
    .from("retos_hoy_activos")
    .delete()
    .eq("user_id", params.userId)
    .eq("reto_id", params.retoId);

  if (error) {
    console.error("[gamification] Error desactivando reto:", error);
    throw error;
  }
}

export async function fetchConfigurableChallenges(userId: string): Promise<ConfigurableChallenge[]> {
  const [allChallenges, activeIds] = await Promise.all([
    fetchAllChallengesForUser(userId),
    fetchActiveRetoIds(userId)
  ]);

  const activeSet = new Set(activeIds);
  return allChallenges.map((challenge) => ({
    ...challenge,
    isActive: activeSet.has(challenge.id)
  }));
}

export async function fetchActiveDailyChallengesForUser(userId: string): Promise<DailyChallenge[]> {
  const [allChallenges, activeIds] = await Promise.all([
    fetchAllChallengesForUser(userId),
    fetchActiveRetoIds(userId)
  ]);

  if (activeIds.length === 0) {
    return [];
  }

  const activeSet = new Set(activeIds);
  return allChallenges.filter((challenge) => activeSet.has(challenge.id));
}

export async function fetchAllChallengesForUser(userId: string): Promise<DailyChallenge[]> {
  const customChallenges = await fetchCustomChallenges(userId);
  return [...SYSTEM_DAILY_CHALLENGES, ...customChallenges];
}

/** @deprecated Usa fetchAllChallengesForUser o fetchActiveDailyChallengesForUser */
export async function fetchDailyChallengesForUser(userId: string): Promise<DailyChallenge[]> {
  return fetchAllChallengesForUser(userId);
}

export async function createCustomChallenge(params: {
  userId: string;
  titulo: string;
  puntos?: number;
}): Promise<DailyChallenge> {
  const supabase = createSupabaseClient();
  const titulo = params.titulo.trim();

  if (!titulo) {
    throw new Error("El título de la meta no puede estar vacío.");
  }

  if (!(await isCustomChallengesAvailable(supabase))) {
    throw new Error(CUSTOM_CHALLENGES_MIGRATION_MESSAGE);
  }

  const { data, error } = await supabase
    .from("retos_personalizados")
    .insert({
      user_id: params.userId,
      titulo,
      puntos: params.puntos ?? CUSTOM_CHALLENGE_DEFAULT_POINTS
    })
    .select("id, titulo, puntos, created_at")
    .single();

  if (error || !data) {
    console.error("[gamification] Error creando reto personalizado:", error);
    throw error ?? new Error("No se pudo crear la meta personalizada.");
  }

  const created = mapCustomChallenge(data);

  try {
    await setRetoActiveForHoy({ userId: params.userId, retoId: created.id, active: true });
  } catch (activateError) {
    console.warn("[gamification] Reto creado pero no se pudo activar en Hoy:", activateError);
  }

  return created;
}

export async function updateCustomChallenge(params: {
  userId: string;
  id: string;
  titulo: string;
  puntos?: number;
}): Promise<DailyChallenge> {
  const supabase = createSupabaseClient();
  const titulo = params.titulo.trim();

  if (!titulo) {
    throw new Error("El título de la meta no puede estar vacío.");
  }

  if (!(await isCustomChallengesAvailable(supabase))) {
    throw new Error(CUSTOM_CHALLENGES_MIGRATION_MESSAGE);
  }

  const payload: { titulo: string; puntos?: number } = { titulo };
  if (typeof params.puntos === "number") {
    payload.puntos = params.puntos;
  }

  const { data, error } = await supabase
    .from("retos_personalizados")
    .update(payload)
    .eq("user_id", params.userId)
    .eq("id", params.id)
    .select("id, titulo, puntos")
    .maybeSingle();

  if (error) {
    console.error("[gamification] Error actualizando reto personalizado:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Meta personalizada no encontrada.");
  }

  return mapCustomChallenge(data);
}

export async function deleteCustomChallenge(params: {
  userId: string;
  id: string;
}): Promise<void> {
  const supabase = createSupabaseClient();

  if (!(await isCustomChallengesAvailable(supabase))) {
    throw new Error(CUSTOM_CHALLENGES_MIGRATION_MESSAGE);
  }

  const { data: existing, error: fetchError } = await supabase
    .from("retos_personalizados")
    .select("id")
    .eq("user_id", params.userId)
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    console.error("[gamification] Error verificando reto personalizado:", fetchError);
    throw fetchError;
  }

  if (!existing) {
    throw new Error("Meta personalizada no encontrada.");
  }

  const { error: activeError } = await supabase
    .from("retos_hoy_activos")
    .delete()
    .eq("user_id", params.userId)
    .eq("reto_id", params.id);

  if (activeError) {
    console.error("[gamification] Error limpiando reto activo:", activeError);
    throw activeError;
  }

  const table = await resolveCompletionsTable(supabase);
  const { error: completionsError } = await supabase
    .from(table)
    .delete()
    .eq("user_id", params.userId)
    .eq("reto_id", params.id);

  if (completionsError) {
    console.error("[gamification] Error limpiando completados del reto:", completionsError);
    throw completionsError;
  }

  const { error } = await supabase
    .from("retos_personalizados")
    .delete()
    .eq("user_id", params.userId)
    .eq("id", params.id);

  if (error) {
    console.error("[gamification] Error eliminando reto personalizado:", error);
    throw error;
  }
}

export async function fetchTodayCompletedChallengeIds(userId: string): Promise<string[]> {
  const supabase = createSupabaseClient();
  const today = getTodayDateString();
  const table = await resolveCompletionsTable(supabase);

  const { data, error } = await supabase
    .from(table)
    .select("reto_id")
    .eq("user_id", userId)
    .eq("completado_at", today);

  if (error) {
    console.error("[gamification] Error cargando retos completados del día:", error);
    throw error;
  }

  return (data ?? []).map((row) => row.reto_id);
}

export async function fetchCompletionsInRange(
  userId: string,
  fromDate: string,
  toDate: string
): Promise<Array<{ reto_id: string; completado_at: string }>> {
  const supabase = createSupabaseClient();
  const table = await resolveCompletionsTable(supabase);

  const { data, error } = await supabase
    .from(table)
    .select("reto_id, completado_at")
    .eq("user_id", userId)
    .gte("completado_at", fromDate)
    .lte("completado_at", toDate);

  if (error) {
    console.error("[gamification] Error cargando completados en rango:", error);
    throw error;
  }

  return data ?? [];
}

export async function fetchWeeklyHealthMetrics(userId: string): Promise<WeeklyHealthMetrics> {
  const today = getTodayDateString();
  const weekStart = toISODateString(getMondayOfWeek());
  const streakLookbackDate = toISODateString(
    new Date(new Date(`${today}T12:00:00`).setDate(new Date(`${today}T12:00:00`).getDate() - 30))
  );

  const [
    activeChallenges,
    allChallenges,
    todayCompletedIds,
    weekCompletions,
    streakCompletions
  ] = await Promise.all([
    fetchActiveDailyChallengesForUser(userId),
    fetchAllChallengesForUser(userId),
    fetchTodayCompletedChallengeIds(userId),
    fetchCompletionsInRange(userId, weekStart, today),
    fetchCompletionsInRange(userId, streakLookbackDate, today)
  ]);

  return calculateWeeklyHealthMetrics({
    activeChallenges,
    allChallenges,
    weekCompletions,
    streakCompletions,
    todayCompletedIds,
    today
  });
}

/** @deprecated El score semanal se calcula desde retos_completados_diarios */
export async function fetchHealthScore(userId: string): Promise<number> {
  const metrics = await fetchWeeklyHealthMetrics(userId);
  return metrics.earnedPoints;
}

export async function completeDailyChallenge(params: {
  userId: string;
  retoId: string;
  points: number;
}): Promise<void> {
  const supabase = createSupabaseClient();
  const today = getTodayDateString();
  const table = await resolveCompletionsTable(supabase);

  const { error: insertError } = await supabase.from(table).insert({
    user_id: params.userId,
    reto_id: params.retoId,
    completado_at: today
  });

  if (insertError) {
    console.error("[gamification] Error insertando reto completado:", insertError);
    throw insertError;
  }
}

export async function uncompleteDailyChallenge(params: {
  userId: string;
  retoId: string;
  points: number;
}): Promise<void> {
  const supabase = createSupabaseClient();
  const today = getTodayDateString();
  const table = await resolveCompletionsTable(supabase);

  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("user_id", params.userId)
    .eq("reto_id", params.retoId)
    .eq("completado_at", today);

  if (deleteError) {
    console.error("[gamification] Error eliminando reto completado:", deleteError);
    throw deleteError;
  }
}
