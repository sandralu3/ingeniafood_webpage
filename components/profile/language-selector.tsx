"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Globe2, Loader2 } from "lucide-react";
import {
  LANGUAGE_OPTIONS,
  type AppLocale,
  parseAppLocale
} from "@/i18n/config";
import { writeLocaleCookie } from "@/lib/i18n/locale-cookie";
import { updateProfileLanguage } from "@/lib/i18n/profile-language";
import { cn } from "@/lib/utils";

type LanguageSelectorProps = {
  userId: string | null;
  /** Idioma cargado desde Supabase (fuente de verdad remota). */
  profileLanguage?: string | null;
  disabled?: boolean;
  className?: string;
  onPersisted?: (locale: AppLocale) => void;
  onPersistError?: (message: string) => void;
};

export function LanguageSelector({
  userId,
  profileLanguage,
  disabled = false,
  className,
  onPersisted,
  onPersistError
}: LanguageSelectorProps) {
  const t = useTranslations("Profile");
  const locale = parseAppLocale(useLocale());
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [optimisticLocale, setOptimisticLocale] = useState<AppLocale>(locale);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  useEffect(() => {
    setOptimisticLocale(locale);
  }, [locale]);

  // Si el perfil trae un idioma distinto a la cookie, alinea la cookie y refresca.
  useEffect(() => {
    const remote = parseAppLocale(profileLanguage, locale);
    if (!profileLanguage || remote === locale) return;

    writeLocaleCookie(remote);
    setOptimisticLocale(remote);
    startTransition(() => {
      router.refresh();
    });
  }, [profileLanguage, locale, router]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selected =
    LANGUAGE_OPTIONS.find((option) => option.code === optimisticLocale) ?? LANGUAGE_OPTIONS[0];

  const applyLocale = (nextLocale: AppLocale) => {
    if (disabled || isPending || nextLocale === optimisticLocale) {
      setOpen(false);
      return;
    }

    setOpen(false);
    setOptimisticLocale(nextLocale);

    // a) Cookie + refresh inmediato → UI en el nuevo idioma
    writeLocaleCookie(nextLocale);
    startTransition(() => {
      router.refresh();
    });

    // b) Persistencia en segundo plano
    if (!userId) return;

    void (async () => {
      const result = await updateProfileLanguage(userId, nextLocale);
      if (result.ok) {
        onPersisted?.(nextLocale);
        return;
      }
      onPersistError?.(result.error);
    })();
  };

  return (
    <div ref={rootRef} className={cn("relative space-y-2", className)}>
      <label htmlFor="language-trigger" className="text-sm font-medium text-stone-600">
        {t("language")}
      </label>

      <button
        id="language-trigger"
        type="button"
        disabled={disabled || isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3 text-left text-sm text-stone-800 shadow-sm shadow-stone-100/40 transition",
          "hover:border-stone-300 focus:border-[#4c6633]/35 focus:outline-none focus:ring-2 focus:ring-[#4c6633]/10",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef4e6] text-[#4c6633]">
          <Globe2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{selected.nativeLabel}</span>
        {isPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-stone-400" aria-hidden />
        ) : (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-stone-400 transition-transform",
              open && "rotate-180"
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        )}
      </button>

      <p className="text-[11px] leading-relaxed text-stone-500">{t("languageHint")}</p>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t("language")}
          className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg shadow-stone-200/50"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = option.code === optimisticLocale;
            return (
              <li key={option.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => applyLocale(option.code)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition",
                    isSelected
                      ? "bg-[#eef4e6]/90 text-[#3e5219]"
                      : "text-stone-700 hover:bg-stone-50"
                  )}
                >
                  <Globe2
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isSelected ? "text-[#4c6633]" : "text-stone-400"
                    )}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 font-medium">{option.nativeLabel}</span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#4c6633]" strokeWidth={2.25} />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
