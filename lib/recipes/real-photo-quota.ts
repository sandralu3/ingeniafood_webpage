import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { Database } from "@/types/database.types";

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * True si el usuario ya usó su única foto real de prueba.
 */
export async function hasGeneratedRealPhoto(
  supabase: AppSupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("has_generated_real_photo")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[real-photo] lectura fallida:", error.message);
    return true;
  }

  return data?.has_generated_real_photo === true;
}

/**
 * Marca la foto real de prueba como usada (atómico).
 * Devuelve true si se marcó ahora (primera vez).
 */
export async function tryMarkRealPhotoGenerated(userId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      has_generated_real_photo: true,
      openai_photo_credits: 0,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId)
    .eq("has_generated_real_photo", false)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[real-photo] mark falló:", error.message);
    return false;
  }

  return Boolean(data?.id);
}

/**
 * Revierte el flag si la generación falló tras marcarlo (solo trial, no Stripe).
 */
export async function refundRealPhotoMark(userId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      has_generated_real_photo: false,
      openai_photo_credits: 1,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId)
    .eq("has_generated_real_photo", true);

  if (error) {
    console.error("[real-photo] refund falló:", error.message);
  }
}
