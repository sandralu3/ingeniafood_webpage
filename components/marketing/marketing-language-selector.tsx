"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Check, ChevronDown, Globe2, Loader2 } from "lucide-react";
import {
  LANGUAGE_OPTIONS,
  type AppLocale,
  parseAppLocale
} from "@/i18n/config";
import { writeLocaleCookie } from "@/lib/i18n/locale-cookie";
import { cn } from "@/lib/utils";

type MarketingLanguageSelectorProps = {
  className?: string;
};

/**
 * Selector de idioma para la landing (marketing).
 * Actualiza cookie NEXT_LOCALE + refresh; no requiere sesión.
 */
export function MarketingLanguageSelector({ className }: MarketingLanguageSelectorProps) {
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

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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
    if (isPending || nextLocale === optimisticLocale) {
      setOpen(false);
      return;
    }

    setOpen(false);
    setOptimisticLocale(nextLocale);
    writeLocaleCookie(nextLocale);

    // Ruta corta /en o /es para entry points localizados (cookie + redirect).
    startTransition(() => {
      router.replace(`/${nextLocale}`);
      router.refresh();
    });
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label="Language"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-full border border-stone-300/80 bg-white/90 px-3 text-sm font-semibold text-stone-700 shadow-sm backdrop-blur-sm transition",
          "hover:border-[#556B2F]/40 hover:text-[#556B2F] focus:outline-none focus:ring-2 focus:ring-[#556B2F]/20"
        )}
      >
        <Globe2 className="h-3.5 w-3.5 text-[#556B2F]" strokeWidth={1.75} aria-hidden />
        <span className="uppercase tracking-wide">{optimisticLocale}</span>
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" aria-hidden />
        ) : (
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-stone-400 transition-transform", open && "rotate-180")}
            strokeWidth={1.75}
            aria-hidden
          />
        )}
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute right-0 z-[60] mt-2 min-w-[10.5rem] overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg shadow-stone-200/60"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = option.code === selected.code;
            return (
              <li key={option.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => applyLocale(option.code)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition",
                    isSelected
                      ? "bg-[#eef4e6] text-[#3e5219]"
                      : "text-stone-700 hover:bg-stone-50"
                  )}
                >
                  <span className="w-6 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    {option.code}
                  </span>
                  <span className="flex-1 font-medium">{option.nativeLabel}</span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-[#556B2F]" strokeWidth={2.25} />
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
