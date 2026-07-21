"use client";

import { readHoyCache, writeHoyCache } from "@/lib/gamification/hoy-cache";
import { fetchHoyProfile } from "@/lib/gamification/fetch-hoy-profile";
import { readHoyProfileCache } from "@/lib/gamification/hoy-profile-cache";
import { fetchHoyPageData } from "@/lib/gamification/hoy-page-data";
import { getBrowserAuthUser } from "@/lib/auth/get-browser-user";

const BACKGROUND_REFRESH_MS = 60_000;

let lastPrefetchAt = 0;
let lastPrefetchUserId: string | null = null;

async function resolveUserId(userId?: string): Promise<{ id: string; email?: string | null } | null> {
  const user = await getBrowserAuthUser();
  if (!user) return null;
  if (userId && user.id !== userId) return null;
  return { id: userId ?? user.id, email: user.email };
}

async function prefetchHoyBundle(
  userId: string,
  email?: string | null,
  force = false
): Promise<void> {
  const [data] = await Promise.all([
    fetchHoyPageData(userId, { force }),
    readHoyProfileCache(userId) && !force
      ? Promise.resolve(null)
      : fetchHoyProfile(userId, email)
  ]);

  writeHoyCache(userId, data);
}

export async function prefetchHoyPageData(options?: {
  userId?: string;
  force?: boolean;
}): Promise<void> {
  try {
    const user = await resolveUserId(options?.userId);
    if (!user) return;

    if (!options?.force && readHoyCache(user.id) && readHoyProfileCache(user.id)) {
      return;
    }

    const now = Date.now();
    if (
      !options?.force &&
      lastPrefetchUserId === user.id &&
      now - lastPrefetchAt < BACKGROUND_REFRESH_MS
    ) {
      return;
    }

    lastPrefetchAt = now;
    lastPrefetchUserId = user.id;

    await prefetchHoyBundle(user.id, user.email, options?.force);
  } catch (error) {
    console.warn("[prefetch-hoy] No se pudo precargar Hoy:", error);
  }
}

export async function refreshHoyPageDataInBackground(userId?: string): Promise<void> {
  try {
    const user = await resolveUserId(userId);
    if (!user) return;

    const now = Date.now();
    if (
      lastPrefetchUserId === user.id &&
      now - lastPrefetchAt < BACKGROUND_REFRESH_MS
    ) {
      return;
    }

    lastPrefetchAt = now;
    lastPrefetchUserId = user.id;

    await prefetchHoyBundle(user.id, user.email, true);
  } catch (error) {
    console.warn("[prefetch-hoy] No se pudo refrescar Hoy en background:", error);
  }
}
