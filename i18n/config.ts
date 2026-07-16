/**
 * Configuración central de idiomas.
 * Para añadir un idioma:
 * 1) Añádelo a APP_LOCALES
 * 2) Crea messages/{code}.json
 * 3) Actualiza CHECK de profiles.language / tips (nueva migración)
 * 4) Añade la opción en LANGUAGE_OPTIONS
 * 5) Tips builtin + cláusula Gemini en recipe-locale-prompt
 */

export const APP_LOCALES = ["es", "en", "fr", "pt", "de"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "es";

/** Cookie leída por next-intl / i18n/request.ts */
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type LanguageOption = {
  code: AppLocale;
  /** Nombre nativo del idioma (sin banderas). */
  nativeLabel: string;
};

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: "es", nativeLabel: "Español" },
  { code: "en", nativeLabel: "English" },
  { code: "fr", nativeLabel: "Français" },
  { code: "pt", nativeLabel: "Português" },
  { code: "de", nativeLabel: "Deutsch" }
] as const;

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value);
}

export function parseAppLocale(value: unknown, fallback: AppLocale = DEFAULT_LOCALE): AppLocale {
  return isAppLocale(value) ? value : fallback;
}

/** Locale BCP-47 para Intl (fechas, números). */
export function toBcp47Locale(locale: AppLocale): string {
  switch (locale) {
    case "en":
      return "en-US";
    case "fr":
      return "fr-FR";
    case "pt":
      return "pt-PT";
    case "de":
      return "de-DE";
    case "es":
    default:
      return "es-ES";
  }
}
