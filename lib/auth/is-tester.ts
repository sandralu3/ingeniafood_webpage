import type { SupabaseClient } from "@supabase/supabase-js";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import type { Database } from "@/types/database.types";

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * True si el perfil tiene `is_tester`, o si es la cuenta administradora Sandra.
 * Fail-closed ante error o fila ausente (salvo admin por email).
 */
export async function isUserTester(
  supabase: AppSupabaseClient,
  userId: string,
  email?: string | null
): Promise<boolean> {
  if (isSandraAdmin(email)) {
    return true;
  }

  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return false;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("is_tester")
    .eq("id", trimmedUserId)
    .maybeSingle();

  if (error) {
    console.warn("[auth] isUserTester fail-closed:", error.message);
    return false;
  }

  return data?.is_tester === true;
}
