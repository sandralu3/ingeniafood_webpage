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

const MUTED_DAY_TEXT = "text-[#8E8A80]";
const ACTIVE_DAY_TEXT = "text-[#5A7843]";

export function PlanDayCarousel({
  days,
  selectedDay,
  onSelectDay,
  className
}: PlanDayCarouselProps) {
  const t = useTranslations("Plan");
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const weekAssigned = days.reduce(
    (sum, day) => sum + MEAL_TYPES.filter((type) => day.slots[type] !== null).length,
    0
  );
  const weekTotal = days.length * MEAL_TYPES.length;

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  }, [selectedDay]);

  return (
    <section
      className={cn(
        "rounded-2xl bg-[#FCFBFA] px-2.5 py-2 shadow-sm shadow-stone-200/25",
        className
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="font-serif text-sm font-semibold text-stone-900">{t("yourWeek")}</h2>
            <span className="text-[11px] text-stone-500">
              {t("mealsCount", { assigned: weekAssigned, total: weekTotal })}
            </span>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
          {weekTotal > 0 ? Math.round((weekAssigned / weekTotal) * 100) : 0}%
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day) => {
          const isSelected = day.label === selectedDay;
          const assignedCount = MEAL_TYPES.filter((type) => day.slots[type] !== null).length;

          return (
            <button
              key={day.id}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              onClick={() => onSelectDay(day.label)}
              className={cn(
                "flex min-w-[3.5rem] flex-col items-center rounded-xl px-2 py-1.5 transition-colors",
                isSelected
                  ? "border border-[#88ab75]/35 bg-[#F4F6F2]"
                  : "bg-white hover:bg-[#FCFBFA]"
              )}
            >
              <span
                className={cn(
                  "text-[11px]",
                  isSelected ? cn("font-bold", ACTIVE_DAY_TEXT) : cn("font-medium", MUTED_DAY_TEXT)
                )}
              >
                {t(`daysShort.${day.label}`)}
              </span>
              <span
                className={cn(
                  "text-[9px] font-medium tabular-nums",
                  isSelected ? ACTIVE_DAY_TEXT : MUTED_DAY_TEXT
                )}
              >
                {assignedCount}/3
              </span>
              {day.nutrition.totalKcal > 0 ? (
                <span
                  className={cn(
                    "text-[8px] font-semibold tabular-nums",
                    isSelected ? "text-orange-700" : "text-stone-400"
                  )}
                >
                  {day.nutrition.totalKcal} kcal
                </span>
              ) : null}
              {day.isToday ? (
                <span
                  className={cn(
                    "mt-0.5 rounded-full px-1.5 py-px text-[7px] font-semibold uppercase tracking-wide",
                    isSelected
                      ? "bg-white/70 text-[#5A7843]"
                      : "bg-stone-50 text-[#8E8A80]"
                  )}
                >
                  {t("today")}
                </span>
              ) : (
                <span
                  className={cn(
                    "mt-0.5 text-[8px] font-medium",
                    isSelected ? ACTIVE_DAY_TEXT : MUTED_DAY_TEXT
                  )}
                >
                  {day.dateLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
