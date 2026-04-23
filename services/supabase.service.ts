import { createSupabaseClient } from "@/lib/supabaseClient";

export async function getCurrentUser() {
  const supabase = createSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}
