"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { PremiumLabel } from "@/components/premium/premium-label";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";

export function PremiumSelfToggle() {
  const { refresh, applyPremiumProfile } = usePremium();
  const [canSelfTogglePremium, setCanSelfTogglePremium] = useState(false);
  const [isPremiumEnabled, setIsPremiumEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/profile/premium-self-toggle", {
        credentials: "include"
      });
      const payload = (await response.json()) as {
        canSelfTogglePremium?: boolean;
        isPremium?: boolean;
        isAdmin?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar tu acceso Premium.");
      }

      if (payload.isAdmin) {
        setCanSelfTogglePremium(false);
        return;
      }

      setCanSelfTogglePremium(Boolean(payload.canSelfTogglePremium));
      setIsPremiumEnabled(Boolean(payload.isPremium));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al cargar Premium.");
      setCanSelfTogglePremium(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const handleToggle = async (nextValue: boolean) => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/profile/premium-self-toggle", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPremium: nextValue })
      });

      const payload = (await response.json()) as {
        isPremium?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo actualizar Premium.");
      }

      const nextPremium = Boolean(payload.isPremium);
      setIsPremiumEnabled(nextPremium);
      applyPremiumProfile(
        nextPremium
          ? {
              is_premium: true,
              premium_trial_remaining: 0,
              premium_trial_claimed_at: null
            }
          : { is_premium: false },
        null
      );
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !canSelfTogglePremium) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-[#f8f4e8] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
          <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold text-stone-900">Modo prueba Premium</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Sandra te autorizó a activar o desactivar Premium para probar la app. Solo afecta a tu
              cuenta.
            </p>
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/80 px-3 py-2.5",
              isSaving && "opacity-70"
            )}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-800">
                {isPremiumEnabled ? (
                  <PremiumLabel size="xs" />
                ) : (
                  "Cuenta Free"
                )}
              </p>
              <p className="text-[10px] text-stone-500">
                {isPremiumEnabled
                  ? "Tienes acceso a filtros y foto del plato."
                  : "Activa Premium para probar todas las funciones."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-stone-400" /> : null}
              <input
                type="checkbox"
                checked={isPremiumEnabled}
                disabled={isSaving}
                onChange={(event) => void handleToggle(event.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-[#556B2F] focus:ring-[#556B2F]/30"
                aria-label="Activar o desactivar Premium de prueba"
              />
            </div>
          </label>

          {errorMessage ? (
            <p className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
