"use client";

import { useState } from "react";
import { Loader2, Ticket } from "lucide-react";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onRedeemed?: (message: string) => void;
  compact?: boolean;
};

/**
 * Formulario discreto para canjear código Premium temporal (24h).
 */
export function PremiumCodeRedeemForm({ className, onRedeemed, compact = false }: Props) {
  const { userId, isPremium, refresh } = usePremium();
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  if (!userId || isPremium) {
    return null;
  }

  const handleRedeem = async () => {
    if (!code.trim() || isRedeeming) return;
    setIsRedeeming(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/premium/redeem-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() })
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "No pudimos canjear el código.");
        return;
      }

      const message =
        payload.message ??
        "¡Felicidades! Tienes 24 horas de acceso Premium ilimitado.";
      setSuccess(message);
      setCode("");
      await refresh();
      onRedeemed?.(message);
    } catch {
      setError("No pudimos canjear el código.");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {compact && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1.5 text-[11px] font-medium text-stone-500 underline-offset-2 hover:text-stone-700 hover:underline"
        >
          <Ticket className="h-3 w-3" strokeWidth={2} />
          ¿Tienes un código de acceso?
        </button>
      ) : (
        <>
          <p className="text-[11px] font-medium text-stone-500">
            ¿Tienes un código de acceso?
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="Ingresar código"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold tracking-wide text-stone-800 outline-none ring-[#556B2F]/30 placeholder:font-medium placeholder:tracking-normal placeholder:text-stone-400 focus:ring-2"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleRedeem();
                }
              }}
            />
            <button
              type="button"
              onClick={() => void handleRedeem()}
              disabled={isRedeeming || !code.trim()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-stone-800 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRedeeming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Canjear"}
            </button>
          </div>
        </>
      )}

      {error ? (
        <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-[#F0F4ED] px-2.5 py-1.5 text-[11px] font-medium text-[#3e5219]">
          {success}
        </p>
      ) : null}
    </div>
  );
}
