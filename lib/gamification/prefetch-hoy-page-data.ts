"use client";

import { readHoyCache, writeHoyCache } from "@/lib/gamification/hoy-cache";
import { fetchHoyPageData } from "@/lib/gamification/hoy-page-data";
import { createSupabaseClient } from "@/lib/supabaseClient";

const BACKGROUND_REFRESH_MS = 60_000;

let lastPrefetchAt = 0;
let lastPrefetchUserId: string | null = null;

async function resolveUserId(userId?: string): Promise<string | null> {
  if (userId) return userId;

  const supabase = createSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function prefetchHoyPageData(options?: {
  userId?: string;
  force?: boolean;
}): Promise<void> {
  try {
    const userId = await resolveUserId(options?.userId);
    if (!userId) return;

    if (!options?.force && readHoyCache(userId)) {
      return;
    }

    const now = Date.now();
    if (
      !options?.force &&
      lastPrefetchUserId === userId &&
      now - lastPrefetchAt < BACKGROUND_REFRESH_MS
    ) {
      return;
    }

    lastPrefetchAt = now;
    lastPrefetchUserId = userId;

    const data = await fetchHoyPageData(userId, { force: options?.force });
    writeHoyCache(userId, data);
  } catch (error) {
    console.warn("[prefetch-hoy] No se pudo precargar Hoy:", error);
  }
}

export async function refreshHoyPageDataInBackground(userId?: string): Promise<void> {
  try {
    const resolvedUserId = await resolveUserId(userId);
    if (!resolvedUserId) return;

    const now = Date.now();
    if (
      lastPrefetchUserId === resolvedUserId &&
      now - lastPrefetchAt < BACKGROUND_REFRESH_MS
    ) {
      return;
    }

    lastPrefetchAt = now;
    lastPrefetchUserId = resolvedUserId;

    const data = await fetchHoyPageData(resolvedUserId, { force: true });
    writeHoyCache(resolvedUserId, data);
  } catch (error) {
    console.warn("[prefetch-hoy] No se pudo refrescar Hoy en background:", error);
  }
}
