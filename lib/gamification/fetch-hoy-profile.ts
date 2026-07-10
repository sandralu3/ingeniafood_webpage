"use client";

import {
  getProfileInitials,
  resolveProfileFirstName
} from "@/components/shared/user-avatar";
import {
  readHoyProfileCache,
  writeHoyProfileCache,
  type HoyProfileCache
} from "@/lib/gamification/hoy-profile-cache";
import { createSupabaseClient } from "@/lib/supabaseClient";

export async function fetchHoyProfile(
  userId: string,
  email?: string | null
): Promise<HoyProfileCache> {
  const supabase = createSupabaseClient();
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const profile: HoyProfileCache = {
    displayName: resolveProfileFirstName(profileRow?.full_name, email),
    avatarUrl: profileRow?.avatar_url ?? null,
    initials: getProfileInitials(profileRow?.full_name, email)
  };

  writeHoyProfileCache(userId, profile);
  return profile;
}

export function readCachedHoyProfile(userId: string): HoyProfileCache | null {
  return readHoyProfileCache(userId);
}
