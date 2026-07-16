import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  type AppLocale,
  parseAppLocale
} from "@/i18n/config";

export function readLocaleCookieFromDocument(): AppLocale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE_NAME}=`));

  if (!match) return DEFAULT_LOCALE;
  return parseAppLocale(decodeURIComponent(match.split("=").slice(1).join("=")));
}

/** Actualiza la cookie de locale de inmediato (cliente). */
export function writeLocaleCookie(locale: AppLocale): void {
  if (typeof document === "undefined") return;

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}
