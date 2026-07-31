"use client";

import { Leaf } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type HoyGreetingHeaderProps = {
  displayName?: string | null;
  isLoading?: boolean;
  className?: string;
  levelLabel?: string | null;
};

export function HoyGreetingHeader({
  displayName,
  isLoading = false,
  className,
  levelLabel = null
}: HoyGreetingHeaderProps) {
  const t = useTranslations("Hoy");
  const showNameSkeleton = isLoading || !displayName;
  const firstName = displayName?.trim().split(/\s+/)[0] ?? displayName;
  const hello = t.has("helloName")
    ? t("helloName", { name: firstName ?? "" })
    : `¡Hola, ${firstName}! 👋`;

  return (
    <header className={cn("flex w-full items-start justify-between gap-3", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-stone-400">{t("dayInProgress")}</p>
        {showNameSkeleton ? (
          <Skeleton silent className="mt-1 h-7 w-40 rounded-md" />
        ) : (
          <h1 className="mt-0.5 truncate text-xl font-bold leading-tight text-stone-800">
            {hello}
          </h1>
        )}
        <p className="mt-1 text-xs leading-snug text-stone-500">
          {t.has("greetingSubtitle")
            ? t("greetingSubtitle")
            : "Hoy es un gran día para alimentarte bien."}
        </p>
      </div>

      {levelLabel ? (
        <div className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-stone-100/90 px-2.5 py-1.5">
          <Leaf className="h-3.5 w-3.5 text-[#3E5A3A]" strokeWidth={2} />
          <span className="text-[11px] font-bold text-stone-700">{levelLabel}</span>
        </div>
      ) : null}
    </header>
  );
}
