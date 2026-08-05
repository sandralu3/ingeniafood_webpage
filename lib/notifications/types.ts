import type { Json } from "@/types/database.types";

export const NOTIFICATION_TYPES = [
  "streak_at_risk",
  "reengagement",
  "sandra_tip",
  "empty_meal_slot",
  "water_midday",
  "instagram_catalog",
  "promo_claimable",
  "app_update",
  "admin_new_user",
  "admin_catalog_published"
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type UserNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  dedupe_key: string;
  payload: Json;
  read_at: string | null;
  created_at: string;
};

export type NotificationDraft = {
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  dedupeKey: string;
  payload?: Json;
};

/** Días sin abrir la app para disparar reenganche. */
export const REENGAGEMENT_IDLE_DAYS = 3;

/** Hora local (0–23) a partir de la cual avisar racha en riesgo. */
export const STREAK_AT_RISK_LOCAL_HOUR = 17;

/** Ventana local para recordatorio de agua. */
export const WATER_MIDDAY_HOUR_START = 10;
export const WATER_MIDDAY_HOUR_END = 15;
