"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getSupabaseProjectUrl } from "@/lib/supabaseConfig";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Cliente browser de Supabase (singleton).
 * Evita varios createBrowserClient en paralelo, que pelean por el mismo
 * navigator.locks de la sesión y dejan pantallas colgadas en "loading".
 */
export function createSupabaseClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
    );
  }

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return browserClient;
}
