"use client";

import { useState } from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { PremiumLabel, PremiumRichText } from "@/components/premium/premium-label";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";

export default function TestPremiumPage() {
  const {
    userId,
    isPremium,
    isPaidPremium,
    premiumTrialRemaining,
    canSimulatePremiumTrial,
    isLoading,
    error,
    refresh
  } = usePremium();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeOk, setUpgradeOk] = useState<string | null>(null);

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

      setUpgradeOk("Prueba activada: tienes 1 uso de funciones Premium.");
      await refresh();
    } catch {
      setUpgradeError("No pudimos activar la prueba Premium.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const trialActive = !isPaidPremium && premiumTrialRemaining > 0;

  return (
    <main className="-mx-4 -mb-6 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-6 pt-2">
      <section className="mx-auto w-full max-w-md space-y-3">
        <header className="rounded-2xl bg-white/90 px-3 py-3 shadow-sm shadow-stone-100/30">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
            Test <PremiumLabel size="xs" />
          </p>
          <h1 className="mt-1 font-serif text-lg font-semibold text-stone-900">/test-premium</h1>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            <PremiumRichText text="Prueba simulada: 1 uso de funciones Premium por cuenta." size="xs" />
          </p>
        </header>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-3 text-xs text-stone-500 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]/60" />
            Cargando tu plan…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
            {error}
          </div>
        ) : !userId ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-3 py-3 text-xs text-stone-700">
            <PremiumRichText text="Inicia sesión para probar Premium." size="xs" />
          </div>
        ) : isPremium ? (
          <div className="rounded-2xl border border-[#88ab75]/35 bg-white px-3 py-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#eef4e6] text-[#556B2F]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1 text-sm font-semibold text-stone-900">
                  {isPaidPremium ? (
                    <>
                      <PremiumLabel size="xs" /> activo
                    </>
                  ) : (
                    <>
                      Prueba <PremiumLabel size="xs" /> activa
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
                  {isPaidPremium ? (
                    <PremiumRichText text="Acceso ilimitado a funciones Premium." size="xs" />
                  ) : (
                    <PremiumRichText
                      text={`Te queda ${premiumTrialRemaining} uso. Se consume al generar una receta con filtros Premium.`}
                      size="xs"
                    />
                  )}
                </p>
                <div className="mt-2 rounded-xl border border-stone-100 bg-[#FCFBFA] px-3 py-3">
                  <p className="text-xs font-semibold text-stone-800">Feature exclusiva</p>
                  <p className="mt-1 text-[11px] text-stone-500">
                    Ejemplo: filtros avanzados, análisis nutricional, etc.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-stone-50 text-stone-600">
                <Lock className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900">
                  <PremiumRichText text="Esta es una característica Premium." size="xs" />
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
                  {trialActive ? (
                    "Tu prueba ya fue consumida."
                  ) : canSimulatePremiumTrial ? (
                    <PremiumRichText text="Puedes probar Premium una sola vez." size="xs" />
                  ) : (
                    "Ya reclamaste tu prueba simulada."
                  )}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <button
                type="button"
                disabled
                className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-400"
              >
                Acción <PremiumLabel size="xs" /> (deshabilitada)
              </button>

              <button
                type="button"
                onClick={() => void handleSimulateUpgrade()}
                disabled={!canSimulatePremiumTrial || isUpgrading}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full border border-[#88ab75]/45 bg-[#eef4e6]/70 px-4 py-2 text-sm font-semibold text-[#556B2F] transition hover:bg-[#eef4e6] disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Probar <PremiumLabel size="xs" /> (1 uso)
              </button>

              {upgradeOk ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  <PremiumRichText text={upgradeOk} size="xs" />
                </p>
              ) : null}

              {upgradeError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <PremiumRichText text={upgradeError} size="xs" />
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

