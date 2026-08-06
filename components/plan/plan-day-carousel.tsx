"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { MEAL_TYPES, type WeekDay } from "@/lib/plan/constants";
import type { PlanDay } from "@/lib/plan/types";
import { cn } from "@/lib/utils";

type PlanDayCarouselProps = {
  days: PlanDay[];
  selectedDay: WeekDay;
  onSelectDay: (day: WeekDay) => void;
  className?: string;
};

function dayNumberFromLabel(dateLabel: string): string {
  const match = dateLabel.trim().match(/^(\d{1,2})/);
  return match?.[1] ?? dateLabel.slice(0, 2);
}

export function PlanDayCarousel({
  days,
  selectedDay,
  onSelectDay,
  className
}: PlanDayCarouselProps) {
  const t = useTranslations("Plan");
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  }, [selectedDay]);

  return (
    <section className={cn("w-full py-0.5", className)}>
      <div className="grid w-full grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day.label === selectedDay;
          const assignedCount = MEAL_TYPES.filter(
            (type) => (day.slots[type]?.length ?? 0) > 0
          ).length;
          const progress = Math.min(1, assignedCount / MEAL_TYPES.length);
          const isComplete = assignedCount >= MEAL_TYPES.length;

          return (
            <button
              key={day.id}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              onClick={() => onSelectDay(day.label)}
              aria-current={isSelected ? "date" : undefined}
              aria-label={`${t(`days.${day.label}`)} ${day.dateLabel}${day.isToday ? ` · ${t("today")}` : ""}`}
              className={cn(
                "flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl px-0.5 pb-1.5 pt-1.5 transition-colors",
                isSelected
                  ? "border border-[#88ab75]/45 bg-[#F0F4ED] shadow-sm shadow-[#88ab75]/15"
                  : "border border-transparent bg-white/80 hover:bg-stone-50"
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wide",
                  isSelected ? "text-[#5A7843]" : "text-stone-400"
                )}
              >
                {t(`daysShort.${day.label}`)}
              </span>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums leading-none",
                  isSelected ? "text-[#3E5A3A]" : "text-stone-700"
                )}
              >
                {dayNumberFromLabel(day.dateLabel)}
              </span>
              <div
                className="mx-auto mb-0.5 h-1 w-6 max-w-[70%] overflow-hidden rounded-full bg-stone-200"
                aria-hidden
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isComplete
                      ? "bg-[#556B2F]"
                      : progress > 0
                        ? "bg-emerald-500"
                        : "bg-transparent"
                  )}
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
