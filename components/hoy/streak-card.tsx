"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ConsistencyDots } from "@/components/hoy/progress-board/progress-board-visuals";
import {
  buildWeekConsistencyDays,
  type WeekConsistencyDay
} from "@/lib/gamification/week-consistency";
import { toISODateString } from "@/lib/plan/week-utils";
import { cn } from "@/lib/utils";
import { usePremium } from "@/hooks/use-premium";

type StreakCardProps = {
  streakDays: number;
  weekCompletions?: Array<{ reto_id: string; completado_at: string }>;
  streakCompletions?: Array<{ reto_id: string; completado_at: string }>;
  className?: string;
};

/** Racha de hábitos a ancho completo (sin economía de créditos). */
export function StreakCard({
  streakDays,
  weekCompletions = [],
  streakCompletions,
  className
}: StreakCardProps) {
  const t = useTranslations("Hoy");
  const { isPremium } = usePremium();

  const today = toISODateString(new Date());
  const weekDays: WeekConsistencyDay[] = useMemo(
    () =>
      buildWeekConsistencyDays(
        weekCompletions,
        today,
        streakCompletions ?? weekCompletions
      ),
    [weekCompletions, streakCompletions, today]
  );

  return (
    <div
      className={cn(
        "flex min-h-[6.75rem] flex-col rounded-2xl p-3 shadow-sm",
        isPremium
          ? "bg-white/70 shadow-stone-100/40 ring-1 ring-stone-100/60"
          : "border border-orange-100/50 bg-gradient-to-br from-[#FFF7F0]/95 via-white to-orange-50/50",
        className
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-orange-800/80">
        {t.has("streakCardTitle") ? t("streakCardTitle") : "Tu racha"} 🔥
      </p>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p className="text-2xl font-bold leading-none tabular-nums text-stone-900">
          {streakDays}
          <span className="ml-1.5 text-sm font-semibold text-stone-500">
            {t("daysInARow", { count: streakDays })}
          </span>
        </p>
        <ConsistencyDots days={weekDays} className="shrink-0" />
      </div>
    </div>
  );
}

/** @deprecated Usar StreakCard */
export const CreditsWidget = StreakCard;
