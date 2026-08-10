"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Compacto para filas / tiles: etiqueta corta «Sandra», sin wrap. */
  compact?: boolean;
};

export function SandraRecipeBadge({ className, compact = false }: Props) {
  const t = useTranslations("Common");

  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-0.5 rounded-md font-bold tracking-wide text-[#556B2F]",
        compact
          ? "shrink-0 whitespace-nowrap bg-[#eef4e6] px-1.5 py-0.5 text-[8px]"
          : "bg-[#eef4e6] px-2 py-0.5 text-[9px] uppercase tracking-wider",
        className
      )}
    >
      <span aria-hidden className="leading-none">
        ✨
      </span>
      <span className="truncate leading-none">
        {compact ? t("sandraRecipeBadgeShort") : t("sandraRecipeBadge")}
      </span>
    </span>
  );
}
