import { createSupabaseClient } from "@/lib/supabaseClient";
import { getTodayDateString } from "@/lib/gamification/challenges";

export async function fetchTodayCompletedChallengeIds(userId: string): Promise<string[]> {
  const supabase = createSupabaseClient();
  const today = getTodayDateString();

  const { data, error } = await supabase
    .from("retos_usuarios")
    .select("reto_id")
    .eq("user_id", userId)
    .eq("completado_at", today);

  if (error) {
    console.error("[gamification] Error cargando retos del día:", error);
    throw error;
  }

  return (data ?? []).map((row) => row.reto_id);
}

export async function fetchHealthScore(userId: string): Promise<number> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("health_score")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[gamification] Error cargando health_score:", error);
    throw error;
  }

  return data?.health_score ?? 0;
}

async function applyHealthScoreDelta(userId: string, delta: number): Promise<number> {
  const supabase = createSupabaseClient();
  const current = await fetchHealthScore(userId);
  const nextScore = Math.max(0, current + delta);

  const { data, error } = await supabase
    .from("profiles")
    .update({ health_score: nextScore })
    .eq("id", userId)
    .select("health_score")
    .maybeSingle();

  if (error || !data) {
    console.error("[gamification] Error actualizando health_score:", error);
    throw error ?? new Error("No se pudo actualizar health_score");
  }

  return data.health_score;
}

export async function completeDailyChallenge(params: {
  userId: string;
  retoId: string;
  points: number;
}): Promise<number> {
  const supabase = createSupabaseClient();
  const today = getTodayDateString();

  const { error: insertError } = await supabase.from("retos_usuarios").insert({
    user_id: params.userId,
    reto_id: params.retoId,
    completado_at: today
  });

  if (insertError) {
    console.error("[gamification] Error insertando reto:", insertError);
    throw insertError;
  }

  return applyHealthScoreDelta(params.userId, params.points);
}

export async function uncompleteDailyChallenge(params: {
  userId: string;
  retoId: string;
  points: number;
}): Promise<number> {
  const supabase = createSupabaseClient();
  const today = getTodayDateString();

  const { error: deleteError } = await supabase
    .from("retos_usuarios")
    .delete()
    .eq("user_id", params.userId)
    .eq("reto_id", params.retoId)
    .eq("completado_at", today);

  if (deleteError) {
    console.error("[gamification] Error eliminando reto:", deleteError);
    throw deleteError;
  }

  return applyHealthScoreDelta(params.userId, -params.points);
}
