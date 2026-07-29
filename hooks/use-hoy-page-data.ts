"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchHoyProfile,
  readCachedHoyProfile
} from "@/lib/gamification/fetch-hoy-profile";
import type { HoyProfileCache } from "@/lib/gamification/hoy-profile-cache";
import {
  clearHoyCache,
  readHoyCache,
  writeHoyCache
} from "@/lib/gamification/hoy-cache";
import { fetchHoyPageData, type HoyPageData } from "@/lib/gamification/hoy-page-data";
import { createSupabaseClient } from "@/lib/supabaseClient";

type UseHoyPageDataResult = {
  data: HoyPageData | null;
  userId: string | null;
  profile: HoyProfileCache | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  refresh: (options?: { force?: boolean }) => Promise<void>;
};

export function useHoyPageData(): UseHoyPageDataResult {
  const [data, setData] = useState<HoyPageData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<HoyProfileCache | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const hasHydratedCacheRef = useRef(false);
  /** Evita que un fetch antiguo pise datos frescos tras actualizar el plan. */
  const fetchGenRef = useRef(0);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    const supabase = createSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      fetchGenRef.current += 1;
      setUserId(null);
      setData(null);
      setProfile(null);
      setIsLoading(false);
      setIsProfileLoading(false);
      return;
    }

    setUserId(user.id);

    if (options?.force) {
      clearHoyCache(user.id);
    }

    const cachedData = !options?.force ? readHoyCache(user.id) : null;
    const cachedProfile = !options?.force ? readCachedHoyProfile(user.id) : null;

    if (cachedData) {
      setData(cachedData);
      setIsLoading(false);
    } else if (!hasHydratedCacheRef.current) {
      setIsLoading(true);
    }

    if (cachedProfile) {
      setProfile(cachedProfile);
      setIsProfileLoading(false);
    } else {
      setIsProfileLoading(true);
    }

    const gen = ++fetchGenRef.current;

    try {
      const profilePromise =
        cachedProfile && !options?.force
          ? Promise.resolve(cachedProfile)
          : fetchHoyProfile(user.id, user.email);

      const [freshData, freshProfile] = await Promise.all([
        fetchHoyPageData(user.id, { force: options?.force }),
        profilePromise
      ]);

      if (gen !== fetchGenRef.current) return;

      writeHoyCache(user.id, freshData);
      setData(freshData);
      setProfile(freshProfile);
    } catch (error) {
      console.error("[use-hoy-page-data] Error cargando datos de Hoy:", error);
      if (gen !== fetchGenRef.current) return;
      if (!cachedData) {
        setData(null);
      }
      if (!cachedProfile) {
        setProfile(null);
      }
    } finally {
      if (gen === fetchGenRef.current) {
        hasHydratedCacheRef.current = true;
        setIsLoading(false);
        setIsProfileLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    userId,
    profile,
    isLoading,
    isProfileLoading,
    refresh
  };
}
