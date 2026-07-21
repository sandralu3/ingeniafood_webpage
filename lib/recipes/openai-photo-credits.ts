import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { Database } from "@/types/database.types";

type AppSupabaseClient = SupabaseClient<Database>;

export const TESTER_OPENAI_PHOTO_CREDITS = 1;

/**
 * Créditos de foto OpenAI restantes (0 si no aplica o error).
 */
export async function getOpenAiPhotoCredits(
  supabase: AppSupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .select("openai_photo_credits")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[openai-photo-credits] lectura fallida:", error.message);
    return 0;
  }

  return Math.max(0, data?.openai_photo_credits ?? 0);
}

/**
 * Consume 1 crédito de forma atómica. Devuelve true si había crédito y se descontó.
 */
export async function tryConsumeOpenAiPhotoCredit(userId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      openai_photo_credits: 0,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId)
    .gt("openai_photo_credits", 0)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[openai-photo-credits] consume falló:", error.message);
    return false;
  }

  return Boolean(data?.id);
}

/**
 * Devuelve 1 crédito si la generación OpenAI falló tras haber consumido.
 */
export async function refundOpenAiPhotoCredit(userId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      openai_photo_credits: TESTER_OPENAI_PHOTO_CREDITS,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId)
    .eq("openai_photo_credits", 0);

  if (error) {
    console.error("[openai-photo-credits] refund falló:", error.message);
  }
}
