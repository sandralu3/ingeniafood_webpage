"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, Loader2, Settings2 } from "lucide-react";
import { PremiumRichText } from "@/components/premium/premium-label";
import { usePremium } from "@/hooks/use-premium";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { evaluateSubscriptionAccess } from "@/lib/billing/has-valid-subscription";
import type { SubscriptionRow } from "@/types/subscription";
import { cn } from "@/lib/utils";

async function redirectToStripeUrl(endpoint: string): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });

  const payload = (await response.json()) as { url?: string; error?: string };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? "No pudimos conectar con Stripe.");
  }

  window.location.assign(payload.url);
}

type BillingState = {
  hasActiveSubscription: boolean;
  hasStripeCustomer: boolean;
};

/**
 * Suscripción Stripe: solo visible para perfiles con `is_tester`.
 * Sin suscripción activa → checkout. Con suscripción activa + customer → portal.
 */
export function PremiumBillingActions() {
  const t = useTranslations("Profile");
  const {
    userId,
    isTester,
    isPaidPremium,
    openaiPhotoCredits,
    isLoading: isPremiumLoading,
    refresh
  } = usePremium();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingState>({
    hasActiveSubscription: false,
    hasStripeCustomer: false
  });
  const [isBillingLoading, setIsBillingLoading] = useState(true);

  const refreshBilling = useCallback(async () => {
    if (!userId) {
      setBilling({ hasActiveSubscription: false, hasStripeCustomer: false });
      setIsBillingLoading(false);
      return;
    }

    setIsBillingLoading(true);
    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("subscriptions")
        .select(
          "user_id, stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end, created_at, updated_at"
        )
        .eq("user_id", userId)
        .maybeSingle();

      const access = evaluateSubscriptionAccess((data as SubscriptionRow | null) ?? null);
      setBilling({
        hasActiveSubscription: access.hasValidSubscription,
        hasStripeCustomer: Boolean(access.stripeCustomerId?.trim())
      });
    } catch {
      setBilling({ hasActiveSubscription: false, hasStripeCustomer: false });
    } finally {
      setIsBillingLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshBilling();
  }, [refreshBilling]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout !== "canceled") return;

    void refresh();
    void refreshBilling();

    params.delete("checkout");
    params.delete("session_id");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }, [refresh, refreshBilling]);

  if (isPremiumLoading || isBillingLoading || !isTester) {
    return null;
  }

  // Solo portal si hay suscripción Stripe real. is_premium manual no basta.
  const canManageSubscription = billing.hasActiveSubscription && billing.hasStripeCustomer;
  const canStartSubscription = !billing.hasActiveSubscription;

  const handleUpgrade = async () => {
    setIsCheckoutLoading(true);
    setErrorMessage(null);
    try {
      await redirectToStripeUrl("/api/stripe/checkout-session");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("billingError"));
      setIsCheckoutLoading(false);
    }
  };

  const handleManage = async () => {
    setIsPortalLoading(true);
    setErrorMessage(null);
    try {
      await redirectToStripeUrl("/api/stripe/portal-session");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("billingError"));
      setIsPortalLoading(false);
    }
  };

  return (
    <section className="space-y-2 rounded-xl border border-[#4C6B3F]/15 bg-gradient-to-br from-[#F0F4ED] to-white p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#4C6B3F]/80">
        {t("billingEyebrow")}
      </p>
      <h2 className="text-[13px] font-bold text-stone-800">
        <PremiumRichText text={t("billingTitle")} />
      </h2>
      <p className="text-[10px] leading-snug text-stone-500">{t("billingSubtitle")}</p>

      {isPaidPremium && billing.hasActiveSubscription ? (
        <div
          className={cn(
            "rounded-lg border px-2.5 py-2 text-[10px] leading-snug",
            openaiPhotoCredits > 0
              ? "border-[#556B2F]/20 bg-[#F0F4ED] text-[#3e5219]"
              : "border-stone-200 bg-stone-50 text-stone-500"
          )}
          role="status"
        >
          {openaiPhotoCredits > 0
            ? t("photoCreditAvailable", { count: openaiPhotoCredits })
            : t("photoCreditExhausted")}
        </div>
      ) : null}

      {canStartSubscription ? (
        <button
          type="button"
          onClick={() => void handleUpgrade()}
          disabled={isCheckoutLoading}
          className={cn(
            "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-[#4C6B3F] px-3.5 text-[12px] font-semibold text-white shadow-sm transition hover:brightness-105",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {isCheckoutLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Crown className="h-3.5 w-3.5" />
          )}
          {isCheckoutLoading ? t("billingRedirecting") : t("billingUpgrade")}
        </button>
      ) : null}

      {canManageSubscription ? (
        <button
          type="button"
          onClick={() => void handleManage()}
          disabled={isPortalLoading}
          className={cn(
            "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-[#4C6B3F]/25 bg-white px-3.5 text-[12px] font-semibold text-[#4C6B3F] transition hover:bg-[#F0F4ED]",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {isPortalLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Settings2 className="h-3.5 w-3.5" />
          )}
          {isPortalLoading ? t("billingOpeningPortal") : t("billingManage")}
        </button>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="rounded-lg border border-red-100 bg-red-50/80 px-2.5 py-1.5 text-[10px] text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
