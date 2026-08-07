"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Compacto para filas del picker / listados. */
  compact?: boolean;
};

export function SandraRecipeBadge({ className, compact = false }: Props) {
  const t = useTranslations("Common");

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-0.5 rounded-md font-bold tracking-wide text-[#556B2F]",
        compact
          ? "bg-[#eef4e6] px-1.5 py-0.5 text-[8px] uppercase"
          : "bg-[#eef4e6] px-2 py-0.5 text-[9px] uppercase",
        className
      )}
    >
      <span aria-hidden>✨</span>
      {t("sandraRecipeBadge")}
    </span>
  );
}
