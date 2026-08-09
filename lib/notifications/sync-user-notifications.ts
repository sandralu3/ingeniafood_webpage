import type { SupabaseClient } from "@supabase/supabase-js";
import { getBuiltinHealthyTips } from "@/lib/content/builtin-tips";
import { getTodayDateString } from "@/lib/gamification/challenges";
import { getCurrentStreakDateSet } from "@/lib/gamification/weekly-metrics";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { MEAL_TYPES } from "@/lib/plan/constants";
import {
  getMondayOfWeek,
  getWeekDayFromDate,
  toISODateString
} from "@/lib/plan/week-utils";
import { upsertNotificationDrafts } from "@/lib/notifications/service";
import type { NotificationDraft } from "@/lib/notifications/types";
import {
  REENGAGEMENT_IDLE_DAYS,
  STREAK_AT_RISK_LOCAL_HOUR,
  WATER_MIDDAY_HOUR_END,
  WATER_MIDDAY_HOUR_START
} from "@/lib/notifications/types";
import type { AppLocale } from "@/i18n/config";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

export type SyncNotificationsInput = {
  userId: string;
  localHour: number;
  locale?: AppLocale;
  /** Versión remota detectada por el cliente cuando hay update. */
  updateVersion?: string | null;
  /**
   * Si true (default), actualiza profiles.last_seen_at.
   * El cron de push debe pasar false para no romper reenganche.
   */
  touchLastSeen?: boolean;
  /** Fecha de calendario YYYY-MM-DD (cron con zona horaria). Default: día local del servidor. */
  todayIso?: string;
};

function daysBetweenIsoDates(laterIso: string, earlierIso: string): number {
  const later = new Date(`${laterIso}T12:00:00`);
  const earlier = new Date(`${earlierIso}T12:00:00`);
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

function pickDailyTip(locale: AppLocale, dayKey: string): string {
  const tips = getBuiltinHealthyTips(locale);
  if (tips.length === 0) return "Un pequeño hábito sano hoy marca la diferencia.";
  let hash = 0;
  for (let i = 0; i < dayKey.length; i += 1) {
    hash = (hash + dayKey.charCodeAt(i) * (i + 1)) % 9973;
  }
  return tips[hash % tips.length]?.contenido ?? tips[0].contenido;
}

/**
 * Evalúa reglas de producto y crea notificaciones deduplicadas.
 * - Cliente (campana): al abrir la app.
 * - Cron: en background para usuarios con push activo (sin tocar last_seen).
 */
export async function syncUserNotifications(
  client: Client,
  input: SyncNotificationsInput
): Promise<{ created: number }> {
  const today =
    typeof input.todayIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.todayIso)
      ? input.todayIso
      : getTodayDateString();
  const locale = input.locale ?? "es";
  const localHour = Number.isFinite(input.localHour)
    ? Math.max(0, Math.min(23, Math.floor(input.localHour)))
    : 12;
  const touchLastSeen = input.touchLastSeen !== false;

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select(
      "id, last_seen_at, has_promo_claimable, water_glasses_goal, language, role"
    )
    .eq("id", input.userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) return { created: 0 };

  const drafts: NotificationDraft[] = [];
  const previousSeenAt = profile.last_seen_at;

  // --- Reenganche (antes de actualizar last_seen) ---
  if (previousSeenAt) {
    const lastSeenDay = toISODateString(new Date(previousSeenAt));
    const idleDays = daysBetweenIsoDates(today, lastSeenDay);
    if (idleDays >= REENGAGEMENT_IDLE_DAYS) {
      drafts.push({
        type: "reengagement",
        title: "Te echábamos de menos",
        body: `Llevas ${idleDays} días sin pasar por IngeniaFood. Retoma tu plan y tus retos.`,
        href: APP_ROUTES.hoy,
        dedupeKey: `reengagement:${lastSeenDay}`,
        payload: { idleDays, lastSeenDay }
      });
    }
  }

  // --- Racha en riesgo ---
  if (localHour >= STREAK_AT_RISK_LOCAL_HOUR) {
    const lookback = new Date(`${today}T12:00:00`);
    lookback.setDate(lookback.getDate() - 30);
    const lookbackIso = toISODateString(lookback);

    let rows: Array<{ reto_id: string; completado_at: string }> = [];
    const primaryCompletions = await client
      .from("retos_completados_diarios")
      .select("reto_id, completado_at")
      .eq("user_id", input.userId)
      .gte("completado_at", lookbackIso)
      .lte("completado_at", today);

    if (!primaryCompletions.error) {
      rows = primaryCompletions.data ?? [];
    } else {
      const fallbackCompletions = await client
        .from("retos_usuarios")
        .select("reto_id, completado_at")
        .eq("user_id", input.userId)
        .gte("completado_at", lookbackIso)
        .lte("completado_at", today);
      rows = fallbackCompletions.data ?? [];
    }

    const completedToday = rows.some((row) => row.completado_at === today);
    const streakDays = getCurrentStreakDateSet(rows, today).size;

    if (streakDays > 0 && !completedToday) {
      drafts.push({
        type: "streak_at_risk",
        title: "Tu racha está en riesgo",
        body: `Llevas ${streakDays} día${streakDays === 1 ? "" : "s"} seguidos. Completa un reto antes de medianoche.`,
        href: APP_ROUTES.hoy,
        dedupeKey: `streak_at_risk:${today}`,
        payload: { streakDays, date: today }
      });
    }
  }

  // --- Tip diario de Sandra ---
  const tipBody = pickDailyTip(locale, today);
  drafts.push({
    type: "sandra_tip",
    title: "Tip de Sandra",
    body: tipBody,
    href: APP_ROUTES.hoy,
    dedupeKey: `sandra_tip:${today}`,
    payload: { date: today }
  });

  // --- Huecos vacíos hoy ---
  const dayAnchor = new Date(`${today}T12:00:00`);
  const dayLabel = getWeekDayFromDate(dayAnchor);
  const weekStart = toISODateString(getMondayOfWeek(dayAnchor));
  const { data: planRows } = await client
    .from("plan_semanal")
    .select("tipo_comida")
    .eq("user_id", input.userId)
    .eq("semana_inicio", weekStart)
    .eq("dia_semana", dayLabel);

  const filled = new Set((planRows ?? []).map((row) => row.tipo_comida));
  const emptyMeals = MEAL_TYPES.filter((meal) => !filled.has(meal));
  if (emptyMeals.length > 0) {
    const labels = emptyMeals.map((meal) => meal.toLowerCase()).join(", ");
    drafts.push({
      type: "empty_meal_slot",
      title: "Aún no planificaste todo el día",
      body:
        emptyMeals.length === MEAL_TYPES.length
          ? "Hoy no tienes comidas en el plan. Añade desayuno, almuerzo o cena."
          : `Te falta planificar: ${labels}.`,
      href: APP_ROUTES.plan,
      dedupeKey: `empty_meal_slot:${today}`,
      payload: { date: today, emptyMeals }
    });
  }

  // --- Agua media mañana / mediodía ---
  const waterGoal = profile.water_glasses_goal;
  if (
    typeof waterGoal === "number" &&
    waterGoal > 0 &&
    localHour >= WATER_MIDDAY_HOUR_START &&
    localHour < WATER_MIDDAY_HOUR_END
  ) {
    const { data: waterRow } = await client
      .from("water_intake_daily")
      .select("glasses_drunk")
      .eq("user_id", input.userId)
      .eq("intake_date", today)
      .maybeSingle();

    const drunk = waterRow?.glasses_drunk ?? 0;
    const midpoint = Math.ceil(waterGoal / 2);
    if (drunk < midpoint) {
      drafts.push({
        type: "water_midday",
        title: "Hora de hidratarte",
        body: `Vas ${drunk} de ${waterGoal} vasos. Un recordatorio a media jornada.`,
        href: APP_ROUTES.hoy,
        dedupeKey: `water_midday:${today}`,
        payload: { drunk, goal: waterGoal, date: today }
      });
    }
  }

  // --- Promo 24h reclamable ---
  if (profile.has_promo_claimable === true) {
    drafts.push({
      type: "promo_claimable",
      title: "Pase Premium de 24h disponible",
      body: "Actívalo ahora y desbloquea IA + foto real del plato.",
      href: APP_ROUTES.hoy,
      dedupeKey: "promo_claimable:active",
      payload: {}
    });
  }

  // --- Nuevas recetas catálogo Instagram (últimos 7 días) ---
  const catalogSince = new Date(`${today}T12:00:00`);
  catalogSince.setDate(catalogSince.getDate() - 7);
  let catalogRecipes: Array<{ id: string; title: string; instagram_url: string | null }> = [];

  const primaryCatalog = await client
    .from("recipes")
    .select("id, title, created_at, instagram_url")
    .eq("es_instagram", true)
    .eq("is_public", true)
    .gte("created_at", catalogSince.toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  if (!primaryCatalog.error) {
    catalogRecipes = primaryCatalog.data ?? [];
  } else {
    const fallbackCatalog = await client
      .from("recipes")
      .select("id, title, created_at, instagram_url")
      .eq("is_public", true)
      .not("instagram_url", "is", null)
      .gte("created_at", catalogSince.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    catalogRecipes = fallbackCatalog.data ?? [];
  }

  for (const recipe of catalogRecipes) {
    drafts.push({
      type: "instagram_catalog",
      title: "Nueva receta en el catálogo",
      body: `「${recipe.title}」 ya está disponible desde Instagram.`,
      href: `${APP_ROUTES.guardadas}?tab=sandra`,
      dedupeKey: `instagram_catalog:${recipe.id}`,
      payload: { recipeId: recipe.id, title: recipe.title }
    });
  }

  // --- Nueva versión de la app ---
  if (input.updateVersion && input.updateVersion.trim()) {
    const version = input.updateVersion.trim();
    drafts.push({
      type: "app_update",
      title: "Nueva versión disponible",
      body: "Hay una actualización de IngeniaFood lista para instalar.",
      href: APP_ROUTES.hoy,
      dedupeKey: `app_update:${version}`,
      payload: { version }
    });
  }

  const createdRows = await upsertNotificationDrafts(client, input.userId, drafts);

  if (touchLastSeen) {
    await client
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", input.userId);
  }

  if (createdRows.length > 0) {
    const { sendPushForNotifications } = await import("@/lib/notifications/send-push");
    await sendPushForNotifications(input.userId, createdRows);
  }

  return { created: createdRows.length };
}
