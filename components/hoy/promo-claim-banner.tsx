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
 * Banner compacto: activa las 24h Premium del referido (mock cream + CTA con fondo).
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
          "rounded-[18px] bg-[#F6E2C3] px-3.5 py-2 text-xs font-bold text-stone-800",
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

  const ctaLabel = t.has("promoClaimCtaShort")
    ? t("promoClaimCtaShort").replace(/\s*✨\s*/g, "").trim()
    : "Activar 24H";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2 rounded-[18px] bg-[#F6E2C3] px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Crown className="h-3.5 w-3.5 shrink-0 text-[#C27803]" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold leading-tight text-[#3D2E1F]">
              {t.has("promoClaimTitle")
                ? t("promoClaimTitle")
                : "Pase Premium de 24 horas disponible"}
            </p>
            <p className="mt-0.5 truncate text-[10px] leading-tight text-[#5C4A32]">
              {t.has("promoClaimDescription")
                ? t("promoClaimDescription")
                : "Actívalo ahora y desbloquea IA + foto real del plato."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleClaim()}
          disabled={isClaiming}
          className="inline-flex shrink-0 items-center justify-center gap-0.5 rounded-full bg-gradient-to-br from-[#5C7A54] via-[#3E5A3A] to-[#2F452C] px-2.5 py-1.5 text-[10px] font-bold leading-none text-white shadow-sm shadow-[#3E5A3A]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isClaiming ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          <span>{ctaLabel}</span>
          <span className="text-[9px] text-[#F9A825]" aria-hidden>
            ✦
          </span>
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
