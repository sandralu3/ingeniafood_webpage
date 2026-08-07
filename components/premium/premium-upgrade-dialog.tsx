"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Loader2, Lock, Sparkles, X } from "lucide-react";
import { PlanSectionDivider } from "@/components/plan/plan-section-divider";
import { PremiumLabel, PremiumRichText } from "@/components/premium/premium-label";
import { usePremium } from "@/hooks/use-premium";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { SCANNER_SECTION_ACCENTS } from "@/lib/scanner/scanner-section-accent";

type Props = {
  open: boolean;
  onClose: () => void;
  onUpgraded?: () => void;
  featureLabel?: string;
};

export function PremiumUpgradeDialog({
  open,
  onClose,
  onUpgraded,
  featureLabel = "Filtros avanzados"
}: Props) {
  const { userId, isPremium, isCodePremium, isTester, refresh } = usePremium();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setUpgradeError(null);
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const handleCheckout = async () => {
    if (!userId || isUpgrading) return;

    setIsUpgrading(true);
    setUpgradeError(null);

    try {
      const response = await fetch("/api/paddle/checkout-session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "month" })
      });
      const payload = (await response.json()) as {
        priceId?: string;
        clientToken?: string;
        environment?: string;
        customer?: { email?: string };
        customData?: Record<string, unknown>;
        settings?: { successUrl?: string };
        error?: string;
      };

      if (!response.ok || !payload.priceId || !payload.customer?.email) {
        setUpgradeError(payload.error ?? "No pudimos abrir el pago de Premium.");
        return;
      }

      const { openPaddleCheckoutOverlay } = await import("@/lib/paddle/browser");
      await openPaddleCheckoutOverlay({
        priceId: payload.priceId,
        customerEmail: payload.customer.email,
        customData: payload.customData ?? {},
        successUrl: payload.settings?.successUrl,
        clientToken: payload.clientToken,
        environment: payload.environment
      });
    } catch {
      setUpgradeError("No pudimos abrir el pago de Premium.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const title = isPremium ? (
    <>
      <PremiumLabel size="xs" /> activo
    </>
  ) : (
    <>
      Función <PremiumLabel size="xs" />
    </>
  );

  const description = !userId ? (
    <PremiumRichText text="Inicia sesión para desbloquear Premium." size="xs" />
  ) : isPremium ? (
    isCodePremium
      ? "Acceso Premium temporal activo."
      : `${featureLabel} incluido en tu plan.`
  ) : (
    <PremiumRichText text={`${featureLabel} requiere Premium.`} size="xs" />
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-upgrade-title"
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-2xl"
      >
        <div className="border-b border-stone-100 px-3 py-2.5">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <PlanSectionDivider
                label={<PremiumLabel size="2xs" />}
                accent={SCANNER_SECTION_ACCENTS.filtros}
              />
              <div className="mt-1 flex items-start gap-2 px-0.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F5E6DF] text-[#B86B52]">
                  {isPremium ? (
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                  ) : (
                    <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                </span>
                <div className="min-w-0">
                  <h2
                    id="premium-upgrade-title"
                    className="flex flex-wrap items-center gap-1 font-serif text-sm font-semibold text-stone-900"
                  >
                    {title}
                  </h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-stone-500">{description}</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5 px-3 py-2.5">
          {upgradeError ? (
            <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
              <PremiumRichText text={upgradeError} size="xs" />
            </p>
          ) : null}

          {!userId ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-[#556B2F] py-2 text-sm font-semibold text-white transition hover:bg-[#4a5f28]"
            >
              Entendido
            </button>
          ) : isPremium ? (
            <button
              type="button"
              onClick={() => {
                void refresh();
                onUpgraded?.();
                onClose();
              }}
              className="w-full rounded-full bg-[#556B2F] py-2 text-sm font-semibold text-white transition hover:bg-[#4a5f28]"
            >
              Continuar
            </button>
          ) : isTester ? (
            <>
              <button
                type="button"
                onClick={() => void handleCheckout()}
                disabled={isUpgrading}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#556B2F] py-2 text-sm font-semibold text-white transition hover:bg-[#4a5f28] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Desbloquear <PremiumLabel size="xs" />
              </button>
              <p className="text-center text-[10px] text-stone-400">
                <Link
                  href={APP_ROUTES.perfil}
                  onClick={onClose}
                  className="font-medium text-stone-500 underline-offset-2 hover:underline"
                >
                  Ver opciones en Perfil
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="text-center text-[11px] leading-snug text-stone-500">
                Si tienes un pase de 24 horas pendiente, actívalo desde{" "}
                <Link
                  href={APP_ROUTES.hoy}
                  onClick={onClose}
                  className="font-semibold text-[#556B2F] underline-offset-2 hover:underline"
                >
                  Hoy
                </Link>
                .
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full bg-[#556B2F] py-2 text-sm font-semibold text-white transition hover:bg-[#4a5f28]"
              >
                Entendido
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
