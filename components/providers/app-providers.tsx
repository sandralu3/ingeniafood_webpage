"use client";

import type { ReactNode } from "react";
import { PremiumProvider } from "@/hooks/use-premium";
import { StripeCheckoutReturnSync } from "@/components/stripe/stripe-checkout-return-sync";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PremiumProvider>
      <StripeCheckoutReturnSync />
      {children}
    </PremiumProvider>
  );
}
