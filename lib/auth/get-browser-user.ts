"use client";

import type { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabaseClient";

function isAuthLockError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /lock:.*auth-token|orphaned lock|stole it|was not released/i.test(message);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * getUser con reintentos ante contención de navigator.locks (Strict Mode / navegación rápida).
 */
export async function getBrowserAuthUser(options?: {
  maxAttempts?: number;
}): Promise<User | null> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const supabase = createSupabaseClient();
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      return user;
    } catch (error) {
      lastError = error;
      if (!isAuthLockError(error) || attempt === maxAttempts - 1) {
        break;
      }
      await sleep(120 * (attempt + 1));
    }
  }

  if (lastError && isAuthLockError(lastError)) {
    // Último recurso: sesión local (sin round-trip) para no dejar la UI colgada.
    const {
      data: { session }
    } = await supabase.auth.getSession();
    return session?.user ?? null;
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}
