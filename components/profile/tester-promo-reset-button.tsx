"use client";

import { useCallback, useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";

/**
 * Reset de prueba Premium: solo visible para tester/admin.
 */
export function TesterPromoResetButton({ className }: { className?: string }) {
  const t = useTranslations("Profile");
  const { role, isTester, refresh } = usePremium();
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReset = isTester || role === "admin" || role === "tester";

  const handleReset = useCallback(async () => {
    if (isResetting) return;
    setIsResetting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/premium/reset-tester-trial", {
        method: "POST",
        credentials: "include"
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "No pudimos resetear la prueba.");
        return;
      }

      await refresh({ showLoading: false });
      window.dispatchEvent(new Event("ingeniafood:premium-changed"));
      setMessage(
        t.has("testerResetSuccess")
          ? t("testerResetSuccess")
          : "Prueba reseteada. Ve a HOY para activar las 24h."
      );
    } catch {
      setError("No pudimos resetear la prueba.");
    } finally {
      setIsResetting(false);
    }
  }, [isResetting, refresh, t]);

  if (!canReset) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => void handleReset()}
        disabled={isResetting}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-amber-300/80 bg-amber-50/60 px-3.5 py-2 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isResetting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Wrench className="h-3.5 w-3.5" strokeWidth={2} />
        )}
        {t.has("testerResetCta")
          ? t("testerResetCta")
          : "🛠️ Resetear Prueba Premium (Modo Tester)"}
      </button>
      {message ? (
        <p className="rounded-lg bg-[#F0F4ED] px-2.5 py-1.5 text-[10px] font-medium text-[#3e5219]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
