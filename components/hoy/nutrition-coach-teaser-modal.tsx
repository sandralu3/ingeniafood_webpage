"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";

type Props = {
  open: boolean;
  onClose: () => void;
  onActivated?: () => void;
  onFallbackUnlock?: () => void;
};

const MOCK_BARS = [
  { label: "Prot.", value: 72, color: "bg-[#3E5A3A]" },
  { label: "Carb.", value: 48, color: "bg-stone-400" },
  { label: "Gras.", value: 61, color: "bg-[#6B8E6B]" },
  { label: "Fibra", value: 35, color: "bg-stone-300" },
  { label: "Hierro", value: 55, color: "bg-[#F9A825]" }
];

/**
 * Teaser Free → Coach Nutricional (alineado con Neuro-Diseño HOY).
 */
export function NutritionCoachTeaserModal({
  open,
  onClose,
  onActivated,
  onFallbackUnlock
}: Props) {
  const t = useTranslations("Hoy");
  const { hasPromoClaimable, refresh } = usePremium();
  const [mounted, setMounted] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setError(null);
      setIsClaiming(false);
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const handleActivateTrial = async () => {
    if (isClaiming) return;

    if (!hasPromoClaimable) {
      onClose();
      onFallbackUnlock?.();
      return;
    }

    setIsClaiming(true);
    setError(null);
    try {
      const response = await fetch("/api/premium/claim-promo", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "No pudimos activar tu prueba de 24h.");
        return;
      }

      await refresh();
      window.dispatchEvent(new Event("ingeniafood:premium-changed"));
      onActivated?.();
      onClose();
    } catch {
      setError("No pudimos activar tu prueba de 24h.");
    } finally {
      setIsClaiming(false);
    }
  };

  const title = t.has("coachTeaserTitle") ? t("coachTeaserTitle") : "Coach Nutricional";
  const body = t.has("coachTeaserBody")
    ? t("coachTeaserBody")
    : "El Coach de IA analiza la calidad de tus comidas diarias y te dice qué nutrientes te faltan.";
  const cta = t.has("coachTeaserCta")
    ? t("coachTeaserCta")
    : "Activar prueba de 24h para ver mi informe";

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-stone-900/40 px-0 backdrop-blur-[2px] sm:items-center sm:px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-teaser-title"
        className="max-h-[88vh] w-full max-w-md overflow-hidden rounded-t-[22px] border border-stone-100 bg-[#FFF8F1] shadow-2xl shadow-stone-300/40 sm:rounded-[22px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 px-4 pt-0 pb-0">
          <SwipeToCloseHandle onClose={onClose} disabled={isClaiming} />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-stone-100/80 bg-white px-4 py-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
              Premium · IA
            </p>
            <h2
              id="coach-teaser-title"
              className="mt-1 font-serif text-xl font-semibold text-stone-800"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 p-4">
          <div className="relative overflow-hidden rounded-2xl border border-stone-100 bg-white p-3.5 shadow-sm shadow-stone-200/50">
            <div
              className="pointer-events-none absolute inset-0 bg-white/50 backdrop-blur-[2.5px]"
              aria-hidden
            />
            <div className="relative flex h-24 items-end justify-between gap-2 px-1 blur-[2.5px] select-none">
              {MOCK_BARS.map((bar) => (
                <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn("w-full max-w-[24px] rounded-t-md opacity-75", bar.color)}
                    style={{ height: `${bar.value}%` }}
                  />
                  <span className="text-[9px] font-semibold text-stone-400">{bar.label}</span>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-stone-200/80 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3E5A3A] shadow-sm">
                Vista previa
              </span>
            </div>
          </div>

          <p className="text-[13px] leading-relaxed text-stone-600">{body}</p>

          <button
            type="button"
            onClick={() => void handleActivateTrial()}
            disabled={isClaiming}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3E5A3A] px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-stone-200/50 transition hover:bg-[#2D432A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isClaiming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            {cta}
          </button>

          {error ? (
            <p className="text-center text-[11px] text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
