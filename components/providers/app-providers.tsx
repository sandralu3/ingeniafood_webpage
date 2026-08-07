"use client";

import type { ReactNode } from "react";
import { PremiumProvider } from "@/hooks/use-premium";
import { PaddleCheckoutReturnSync } from "@/components/paddle/paddle-checkout-return-sync";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PremiumProvider>
      <PaddleCheckoutReturnSync />
      {children}
    </PremiumProvider>
  );
}
