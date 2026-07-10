"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { getSupabaseProjectUrl } from "@/lib/supabaseConfig";

export function createSupabaseClient() {
  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true
    }
  });
}
