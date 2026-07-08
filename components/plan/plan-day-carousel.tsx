"use client";

import { useEffect, useRef } from "react";
import { MEAL_TYPES, WEEK_DAY_SHORT, type WeekDay } from "@/lib/plan/constants";
import type { PlanDay } from "@/lib/plan/types";
import { cn } from "@/lib/utils";

type PlanDayCarouselProps = {
  days: PlanDay[];
  selectedDay: WeekDay;
  onSelectDay: (day: WeekDay) => void;
  className?: string;
};

export function PlanDayCarousel({
  days,
  selectedDay,
  onSelectDay,
  className
}: PlanDayCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  }, [selectedDay]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex gap-3 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
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
              "flex min-w-[64px] flex-col items-center justify-center rounded-2xl border p-3 transition-all duration-300",
              isSelected
                ? "scale-105 border-[#4C6B3F] bg-[#4C6B3F] text-white shadow-md shadow-[#4C6B3F]/30 transition-transform"
                : "border-stone-100 bg-white text-stone-500 hover:border-stone-200 hover:bg-stone-50 active:scale-95"
            )}
          >
            <span
              className={cn(
                "text-xs font-bold tracking-tight",
                isSelected ? "text-white" : "text-stone-500"
              )}
            >
              {WEEK_DAY_SHORT[day.label]}
            </span>
            <span
              className={cn(
                "mt-0.5 text-[10px] font-medium tabular-nums",
                isSelected ? "text-white" : "text-stone-500"
              )}
            >
              {assignedCount}/3
            </span>
            {day.isToday ? (
              <span
                className={cn(
                  "mt-1 rounded-full px-1.5 py-px text-[8px] font-bold uppercase tracking-wide",
                  isSelected ? "bg-white/20 text-white" : "bg-olive-100 text-olive-700"
                )}
              >
                Hoy
              </span>
            ) : (
              <span
                className={cn(
                  "mt-1 text-[9px] font-medium",
                  isSelected ? "text-white/90" : "text-stone-400"
                )}
              >
                {day.dateLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
