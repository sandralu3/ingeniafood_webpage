"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getProfileInitials,
  resolveProfileFirstName
} from "@/components/shared/user-avatar";
import { readHoyCache, writeHoyCache } from "@/lib/gamification/hoy-cache";
import { fetchHoyPageData, type HoyPageData } from "@/lib/gamification/hoy-page-data";
import { createSupabaseClient } from "@/lib/supabaseClient";

type HoyProfile = {
  displayName: string;
  avatarUrl: string | null;
  initials: string;
};

const DEFAULT_PROFILE: HoyProfile = {
  displayName: "Chef",
  avatarUrl: null,
  initials: "SV"
};

type UseHoyPageDataResult = {
  data: HoyPageData | null;
  userId: string | null;
  profile: HoyProfile;
  isLoading: boolean;
  refresh: (options?: { force?: boolean }) => Promise<void>;
};

export function useHoyPageData(): UseHoyPageDataResult {
  const [data, setData] = useState<HoyPageData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<HoyProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const hasHydratedCacheRef = useRef(false);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    const supabase = createSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setData(null);
      setProfile(DEFAULT_PROFILE);
      setIsLoading(false);
      return;
    }

    setUserId(user.id);

    const cached = !options?.force ? readHoyCache(user.id) : null;
    if (cached) {
      setData(cached);
      setIsLoading(false);
    } else if (!hasHydratedCacheRef.current) {
      setIsLoading(true);
    }

    try {
      const [freshData, profileResult] = await Promise.all([
        fetchHoyPageData(user.id, { force: options?.force }),
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle()
      ]);

      writeHoyCache(user.id, freshData);
      setData(freshData);
      setProfile({
        displayName: resolveProfileFirstName(profileResult.data?.full_name, user.email),
        avatarUrl: profileResult.data?.avatar_url ?? null,
        initials: getProfileInitials(profileResult.data?.full_name, user.email)
      });
    } catch (error) {
      console.error("[use-hoy-page-data] Error cargando datos de Hoy:", error);
      if (!cached) {
        setData(null);
      }
    } finally {
      hasHydratedCacheRef.current = true;
      setIsLoading(false);
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
    refresh
  };
}
