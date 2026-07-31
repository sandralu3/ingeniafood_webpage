"use client";

import { useEffect, useState } from "react";
import {
  formatPremiumTimeRemaining
} from "@/lib/auth/premium-access";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Píldora sutil: tiempo restante del Premium temporal.
 */
export function PremiumRemainingBadge({ className }: Props) {
  const { isPremium, isCodePremium, premiumExpiresAt } = usePremium();
  const [label, setLabel] = useState<string | null>(() =>
    formatPremiumTimeRemaining(premiumExpiresAt)
  );

  useEffect(() => {
    const tick = () => setLabel(formatPremiumTimeRemaining(premiumExpiresAt));
    tick();
    if (!premiumExpiresAt) return;
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [premiumExpiresAt]);

  if (!isPremium || !isCodePremium || !label) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[#556B2F]/20 bg-[#F0F4ED] px-2 py-0.5 text-[10px] font-semibold text-[#3e5219]",
        className
      )}
      title="Premium temporal activo"
    >
      <span aria-hidden>⏳</span>
      Premium: {label}
    </span>
  );
}
