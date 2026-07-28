import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, parseAppLocale } from "@/i18n/config";
import { negotiateLocaleFromAcceptLanguage } from "@/lib/i18n/negotiate-locale";

/** Carga messages/{locale}.json por request (invalidar caché al tocar este archivo). */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE_NAME)?.value;
  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");

  const locale = cookieLocale
    ? parseAppLocale(cookieLocale, DEFAULT_LOCALE)
    : negotiateLocaleFromAcceptLanguage(acceptLanguage, DEFAULT_LOCALE);

  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages
  };
});