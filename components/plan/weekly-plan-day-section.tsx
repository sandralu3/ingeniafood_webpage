"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { EmptyMealSlot } from "@/components/plan/empty-meal-slot";
import { PlanMealCard, type PlanMeal } from "@/components/plan/plan-meal-card";
import { MEAL_TYPES, type MealType, type WeekDay } from "@/lib/plan/constants";
import type { PlanDay } from "@/lib/plan/types";
import { cn } from "@/lib/utils";

export type { PlanDay, PlanDaySlots } from "@/lib/plan/types";

type WeeklyPlanDaySectionProps = {
  day: PlanDay;
  defaultExpanded?: boolean;
  onAddMeal?: (dayLabel: WeekDay, mealType: MealType) => void;
  onMealSwapped?: (dayLabel: WeekDay, updatedMeal: PlanMeal) => void;
  onSwapError?: (message: string) => void;
  onMealRemoved?: (dayLabel: WeekDay, mealType: MealType) => void;
  onRemoveError?: (message: string) => void;
  className?: string;
};

export function WeeklyPlanDaySection({
  day,
  defaultExpanded = false,
  onAddMeal,
  onMealSwapped,
  onSwapError,
  onMealRemoved,
  onRemoveError,
  className
}: WeeklyPlanDaySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || day.isToday);
  const assignedCount = MEAL_TYPES.filter((type) => day.slots[type] !== null).length;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl bg-white/90 shadow-sm shadow-stone-100/30",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition hover:bg-stone-50/60"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5">
          <h2
            className={cn(
              "text-sm font-semibold",
              day.isToday ? "text-[#3e5219]" : "text-stone-900"
            )}
          >
            {day.label}
          </h2>
          {day.isToday ? (
            <span className="rounded-full bg-gradient-to-r from-[#dce7c3] to-amber-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3e5219]">
              Hoy
            </span>
          ) : null}
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
            {assignedCount}/3
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-400">{day.dateLabel}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-stone-400 transition-transform duration-300",
              isExpanded ? "rotate-180" : "rotate-0"
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-stone-100/80 px-2.5 pb-2.5 pt-2">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {MEAL_TYPES.map((mealType) => {
                const meal = day.slots[mealType];

                return (
                  <div
                    key={mealType}
                    className="flex w-[11.5rem] min-w-[11.5rem] flex-shrink-0 flex-col gap-2 sm:w-auto sm:min-w-0 sm:flex-1"
                  >
                    <p className="px-0.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                      {mealType}
                    </p>

                    {meal ? (
                      <PlanMealCard
                        meal={meal}
                        variant="slot"
                        onMealSwapped={(updated) => onMealSwapped?.(day.label, updated)}
                        onSwapError={onSwapError}
                        onMealRemoved={(mealType) => onMealRemoved?.(day.label, mealType)}
                        onRemoveError={onRemoveError}
                        className="h-full"
                      />
                    ) : (
                      <EmptyMealSlot
                        variant="slot"
                        mealType={mealType}
                        onAdd={() => onAddMeal?.(day.label, mealType)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
