/**
 * Estructura lista para routing con prefijos (/es/..., /en/...)
 * cuando se quiera mover todo a app/[locale]/*.
 *
 * Hoy:
 * - Cookie NEXT_LOCALE (next-intl, localePrefix: "never")
 * - Entry points cortos /es y /en gestionados en proxy.ts (set cookie + redirect)
 * - La app PWA sigue en /app-recetas sin prefijo (deep links y APP_ROUTES estables)
 */
import { defineRouting } from "next-intl/routing";
import { APP_LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from "@/i18n/config";

export const routing = defineRouting({
  locales: [...APP_LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "never",
  localeCookie: {
    name: LOCALE_COOKIE_NAME,
    maxAge: 60 * 60 * 24 * 365
  }
});
