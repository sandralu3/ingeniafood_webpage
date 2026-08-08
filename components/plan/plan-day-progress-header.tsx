"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Props = {
  dayTitle: string;
  dateLabel: string;
  isToday?: boolean;
  completedMeals: number;
  totalMeals: number;
  consumedKcal: number;
  targetKcal: number;
  dragHint?: string | null;
  className?: string;
};

function DonutProgress({
  value,
  max,
  size = 56,
  stroke = 6
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = circumference * (1 - ratio);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-amber-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-amber-500 transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-bold leading-none text-stone-800">
          {value}/{max}
        </span>
      </div>
    </div>
  );
}

export function PlanDayProgressHeader({
  dayTitle,
  dateLabel,
  isToday = false,
  completedMeals,
  totalMeals,
  consumedKcal,
  targetKcal,
  dragHint,
  className
}: Props) {
  const t = useTranslations("Plan");
  const formattedTarget = useMemo(
    () =>
      new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(
        Math.max(0, Math.round(targetKcal))
      ),
    [targetKcal]
  );
  const formattedConsumed = useMemo(
    () =>
      new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(
        Math.max(0, Math.round(consumedKcal))
      ),
    [consumedKcal]
  );

  return (
    <div className={cn("mb-3 flex items-center gap-3", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <h2 className="font-serif text-sm font-semibold text-stone-900">{dayTitle}</h2>
          {isToday ? (
            <span className="text-[10px] font-semibold text-[#556B2F]">
              · {t("today")}
            </span>
          ) : null}
          <span className="text-[11px] text-stone-500">{dateLabel}</span>
        </div>
        {dragHint ? (
          <p className="mt-0.5 text-[10px] leading-snug text-stone-400">{dragHint}</p>
        ) : null}
      </div>

      <DonutProgress value={completedMeals} max={totalMeals} />

      <div className="shrink-0 text-right">
        <p className="text-base font-bold leading-none text-orange-600">
          {formattedConsumed}{" "}
          <span className="text-[11px] font-semibold">kcal</span>
        </p>
        <p className="mt-1 text-[10px] font-medium text-stone-400">
          {t("calorieGoalLabel", { kcal: formattedTarget })}
        </p>
      </div>
    </div>
  );
}
