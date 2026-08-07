"use client";

import { useEffect } from "react";
import { usePremium } from "@/hooks/use-premium";

/**
 * Tras volver del checkout Paddle (?checkout=success),
 * sincroniza suscripción y refresca el estado Premium del cliente.
 */
export function PaddleCheckoutReturnSync() {
  const { refresh } = usePremium();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;

    let cancelled = false;

    void (async () => {
      try {
        await fetch("/api/paddle/sync-subscription", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.warn("[paddle] No se pudo sincronizar Checkout al volver:", error);
      } finally {
        if (!cancelled) {
          await refresh();
        }
        params.delete("checkout");
        params.delete("session_id");
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
        window.history.replaceState({}, "", next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return null;
}
