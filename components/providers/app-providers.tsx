"use client";

import type { ReactNode } from "react";
import { PremiumProvider } from "@/hooks/use-premium";

export function AppProviders({ children }: { children: ReactNode }) {
  return <PremiumProvider>{children}</PremiumProvider>;
}
