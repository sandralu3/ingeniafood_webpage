"use client";

import { useEffect, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onClaimed?: (message: string) => void;
};

/**
 * Píldora dorada: activa las 24h Premium del referido.
 */
export function PromoClaimBanner({ className, onClaimed }: Props) {
  const t = useTranslations("Hoy");
  const { hasPromoClaimable, isPremium, isLoading, refresh } = usePremium();
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void refresh({ showLoading: false });
  }, [refresh]);

  if (isLoading || isPremium || !hasPromoClaimable) {
    return success ? (
      <div
        className={cn(
          "rounded-2xl border border-[#F6E2C3] bg-[#FDF3E3] px-3.5 py-2.5 text-xs font-bold text-stone-800 shadow-sm shadow-stone-200/50",
          className
        )}
        role="status"
      >
        {success}
      </div>
    ) : null;
  }

  const handleClaim = async () => {
    if (isClaiming) return;
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
        setError(payload.error ?? "No pudimos activar tu pase Premium.");
        return;
      }

      const message =
        payload.message ??
        (t.has("promoClaimSuccess")
          ? t("promoClaimSuccess")
          : "¡Tu pase Premium de 24 horas ya está activo! Disfruta la experiencia.");
      setSuccess(message);
      await refresh();
      window.dispatchEvent(new Event("ingeniafood:premium-changed"));
      onClaimed?.(message);
    } catch {
      setError("No pudimos activar tu pase Premium.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#F6E2C3] bg-[#FDF3E3] px-3.5 py-2.5 shadow-sm shadow-stone-200/50">
        <div className="flex min-w-0 items-start gap-2">
          <Crown className="mt-0.5 h-4 w-4 shrink-0 text-[#F9A825]" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="text-xs font-bold text-stone-800">
              {t.has("promoClaimTitle")
                ? t("promoClaimTitle")
                : "Pase Premium de 24 horas disponible"}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
              {t.has("promoClaimDescription")
                ? t("promoClaimDescription")
                : "Actívalo ahora y desbloquea la IA + foto real del plato."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleClaim()}
          disabled={isClaiming}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl bg-[#3E5A3A] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#2D432A] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isClaiming ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {t.has("promoClaimCtaShort") ? t("promoClaimCtaShort") : "Activar 24H ✨"}
        </button>
      </div>
      {error ? (
        <p className="px-1 text-[10px] text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
