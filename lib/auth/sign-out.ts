import { createSupabaseClient } from "@/lib/supabaseClient";

export async function signOutUser(redirectTo = "/login"): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  window.location.assign(redirectTo);
}
