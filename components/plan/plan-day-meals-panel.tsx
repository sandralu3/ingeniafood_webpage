"use client";

import { EmptyMealSlot } from "@/components/plan/empty-meal-slot";
import { PlanMealCard, type PlanMeal } from "@/components/plan/plan-meal-card";
import { MEAL_TYPES, type MealType, type WeekDay } from "@/lib/plan/constants";
import type { PlanDay } from "@/lib/plan/types";
import { cn } from "@/lib/utils";

type PlanDayMealsPanelProps = {
  day: PlanDay;
  onAddMeal?: (dayLabel: WeekDay, mealType: MealType) => void;
  onMealSwapped?: (dayLabel: WeekDay, updatedMeal: PlanMeal) => void;
  onSwapError?: (message: string) => void;
  onMealRemoved?: (dayLabel: WeekDay, mealType: MealType) => void;
  onRemoveError?: (message: string) => void;
  className?: string;
};

export function PlanDayMealsPanel({
  day,
  onAddMeal,
  onMealSwapped,
  onSwapError,
  onMealRemoved,
  onRemoveError,
  className
}: PlanDayMealsPanelProps) {
  return (
    <section
      key={day.label}
      className={cn("mt-2 flex animate-fade-in flex-col gap-4", className)}
    >
      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="text-base font-semibold text-stone-800">{day.label}</h2>
        <p className="text-xs text-stone-400">{day.dateLabel}</p>
      </div>

      {MEAL_TYPES.map((mealType) => {
        const meal = day.slots[mealType];

        return (
          <div key={mealType} className="space-y-2">
            <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">
              {mealType}
            </p>

            {meal ? (
              <PlanMealCard
                meal={meal}
                variant="panel"
                onMealSwapped={(updated) => onMealSwapped?.(day.label, updated)}
                onSwapError={onSwapError}
                onMealRemoved={(removedMealType) => onMealRemoved?.(day.label, removedMealType)}
                onRemoveError={onRemoveError}
              />
            ) : (
              <EmptyMealSlot mealType={mealType} onAdd={() => onAddMeal?.(day.label, mealType)} />
            )}
          </div>
        );
      })}
    </section>
  );
}
