"use client";

import { useState } from "react";
import { Loader2, Lock, Sparkles, X } from "lucide-react";
import { PlanSectionDivider } from "@/components/plan/plan-section-divider";
import { PremiumLabel, PremiumRichText } from "@/components/premium/premium-label";
import { usePremium } from "@/hooks/use-premium";
import { SCANNER_SECTION_ACCENTS } from "@/lib/scanner/scanner-section-accent";
import { cn } from "@/lib/utils";

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
  const {
    userId,
    isPremium,
    isPaidPremium,
    premiumTrialRemaining,
    canSimulatePremiumTrial,
    refresh
  } = usePremium();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeOk, setUpgradeOk] = useState<string | null>(null);

  if (!open) return null;

  const handleSimulateUpgrade = async () => {
    if (!userId || !canSimulatePremiumTrial || isUpgrading) return;

    setIsUpgrading(true);
    setUpgradeError(null);
    setUpgradeOk(null);

    try {
      const response = await fetch("/api/premium/simulate-trial", {
        method: "POST",
        credentials: "include"
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setUpgradeError(payload.error ?? "No pudimos activar la prueba Premium.");
        return;
      }

      setUpgradeOk("Prueba activada: 1 uso disponible.");
      await refresh();
      onUpgraded?.();
    } catch {
      setUpgradeError("No pudimos activar la prueba Premium.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const trialActive = !isPaidPremium && premiumTrialRemaining > 0;

  const title = isPaidPremium ? (
    <>
      <PremiumLabel size="xs" /> activo
    </>
  ) : trialActive ? (
    "Prueba activa"
  ) : (
    <>
      Función <PremiumLabel size="xs" />
    </>
  );

  const description = !userId ? (
    <PremiumRichText text="Inicia sesión para desbloquear Premium." size="xs" />
  ) : isPaidPremium ? (
    `${featureLabel} incluido en tu plan.`
  ) : trialActive ? (
    <PremiumRichText
      text={`Te queda ${premiumTrialRemaining} uso. Se consume al generar con filtros Premium.`}
      size="xs"
    />
  ) : (
    <PremiumRichText
      text={`${featureLabel} requiere Premium. Prueba una vez gratis.`}
      size="xs"
    />
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-upgrade-title"
        className="w-full max-w-sm overflow-hidden rounded-t-2xl border border-stone-100 bg-white shadow-2xl sm:rounded-2xl"
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

        <div className="space-y-2 px-3 py-2.5">
          {upgradeOk ? (
            <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800">
              <PremiumRichText text={upgradeOk} size="xs" />
            </p>
          ) : null}

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
              onClick={onClose}
              className="w-full rounded-full bg-[#556B2F] py-2 text-sm font-semibold text-white transition hover:bg-[#4a5f28]"
            >
              Continuar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleSimulateUpgrade()}
                disabled={!canSimulatePremiumTrial || isUpgrading}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-full bg-[#556B2F] py-2 text-sm font-semibold text-white transition hover:bg-[#4a5f28] disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Probar <PremiumLabel size="xs" /> (1 uso)
              </button>

              {!canSimulatePremiumTrial ? (
                <p className="text-center text-[10px] text-stone-400">
                  Ya usaste tu prueba simulada.
                </p>
              ) : (
                <p className="text-center text-[10px] text-stone-400">
                  Contratar <PremiumLabel size="xs" /> · próximamente
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
