import { APP_LOCALES, DEFAULT_LOCALE, type AppLocale, parseAppLocale } from "@/i18n/config";

/**
 * Negocia el idioma a partir de Accept-Language (ej. "en-US,en;q=0.9,es;q=0.8").
 */
export function negotiateLocaleFromAcceptLanguage(
  header: string | null | undefined,
  fallback: AppLocale = DEFAULT_LOCALE
): AppLocale {
  if (!header?.trim()) return fallback;

  const candidates = header
    .split(",")
    .map((part) => {
      const [tagRaw, ...params] = part.trim().split(";");
      const tag = tagRaw?.trim().toLowerCase() ?? "";
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.split("=")[1] ?? "1") : 1;
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((c) => c.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const primary = tag.split("-")[0] ?? tag;
    if ((APP_LOCALES as readonly string[]).includes(primary)) {
      return parseAppLocale(primary, fallback);
    }
  }

  return fallback;
}
