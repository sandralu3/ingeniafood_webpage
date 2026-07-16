import { createSupabaseClient } from "@/lib/supabaseClient";
import { isAppLocale, type AppLocale } from "@/i18n/config";

/**
 * Persiste el idioma preferido en profiles.language.
 * Tolerante si la columna aún no existe (migración pendiente).
 */
export async function updateProfileLanguage(
  userId: string,
  language: AppLocale
): Promise<{ ok: true } | { ok: false; error: string; missingColumn?: boolean }> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("profiles").update({ language }).eq("id", userId);

  if (!error) {
    return { ok: true };
  }

  const missingColumn =
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("language") === true;

  if (missingColumn) {
    return {
      ok: false,
      missingColumn: true,
      error:
        "Falta la migración de idioma. Ejecuta supabase/migrations/20260716140000_profiles_language.sql."
    };
  }

  console.error("[i18n] Error guardando idioma:", error);
  return { ok: false, error: error.message || "No se pudo guardar el idioma." };
}

export async function fetchProfileLanguage(userId: string): Promise<AppLocale | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (
      error.code === "42703" ||
      error.code === "PGRST204" ||
      error.message?.includes("language")
    ) {
      return null;
    }
    console.warn("[i18n] Error leyendo idioma del perfil:", error);
    return null;
  }

  const language = (data as { language?: string | null } | null)?.language;
  return isAppLocale(language) ? language : null;
}
