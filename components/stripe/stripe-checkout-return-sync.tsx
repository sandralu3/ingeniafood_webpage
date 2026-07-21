"use client";

import { useEffect, useRef } from "react";
import { usePremium } from "@/hooks/use-premium";

/**
 * Tras volver de Stripe Checkout (?checkout=success&session_id=…),
 * sincroniza la suscripción y actualiza el estado Premium en toda la app.
 */
export function StripeCheckoutReturnSync() {
  const { refresh } = usePremium();
  const handledSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id")?.trim() ?? "";

    if (checkout !== "success" || !sessionId) {
      return;
    }

    if (handledSessionRef.current === sessionId) {
      return;
    }
    handledSessionRef.current = sessionId;

    const syncCheckout = async () => {
      try {
        await fetch("/api/stripe/sync-checkout-session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        });
      } catch (error) {
        console.warn("[stripe] No se pudo sincronizar Checkout al volver:", error);
      } finally {
        await refresh();
      }

      params.delete("checkout");
      params.delete("session_id");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    };

    void syncCheckout();
  }, [refresh]);

  return null;
}
