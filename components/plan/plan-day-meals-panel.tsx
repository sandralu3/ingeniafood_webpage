"use client";

import { useTranslations } from "next-intl";
import { EmptyMealSlot } from "@/components/plan/empty-meal-slot";
import { PlanMealCard, type PlanMeal } from "@/components/plan/plan-meal-card";
import { PlanSectionDivider } from "@/components/plan/plan-section-divider";
import { MEAL_TYPES, type MealType, type WeekDay } from "@/lib/plan/constants";
import { getMealTypeSubtleAccent } from "@/lib/plan/meal-type-accent";
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

const PLAN_CARD_CLASS =
  "rounded-2xl bg-[#FCFBFA] px-2.5 py-2 shadow-sm shadow-stone-200/25";

export function PlanDayMealsPanel({
  day,
  onAddMeal,
  onMealSwapped,
  onSwapError,
  onMealRemoved,
  onRemoveError,
  className
}: PlanDayMealsPanelProps) {
  const t = useTranslations("Plan");
  const assignedCount = MEAL_TYPES.filter((type) => day.slots[type] !== null).length;

  return (
    <section key={day.label} className={cn("animate-fade-in", PLAN_CARD_CLASS, className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="font-serif text-sm font-semibold text-stone-900">
              {t(`days.${day.label}`)}
            </h2>
            {day.isToday ? (
              <span className="text-[10px] font-semibold text-[#556B2F]">· {t("today")}</span>
            ) : null}
            <span className="text-[11px] text-stone-500">{day.dateLabel}</span>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
          {assignedCount}/{MEAL_TYPES.length}
          {day.nutrition.totalKcal > 0 ? (
            <span className="ml-1 text-orange-800">· {day.nutrition.totalKcal} kcal</span>
          ) : null}
        </span>
      </div>

      <ul className="space-y-2">
        {MEAL_TYPES.map((mealType) => {
          const meal = day.slots[mealType];
          const accent = getMealTypeSubtleAccent(mealType);

          return (
            <li key={mealType}>
              <PlanSectionDivider label={t(`meals.${mealType}`)} accent={accent} />

              {meal ? (
                <div className="rounded-lg border border-stone-100/90 bg-white px-2 py-1.5 shadow-sm shadow-stone-100/20">
                  <PlanMealCard
                    meal={meal}
                    variant="panel"
                    onMealSwapped={(updated) => onMealSwapped?.(day.label, updated)}
                    onSwapError={onSwapError}
                    onMealRemoved={(removedMealType) =>
                      onMealRemoved?.(day.label, removedMealType)
                    }
                    onRemoveError={onRemoveError}
                  />
                </div>
              ) : (
                <EmptyMealSlot
                  mealType={mealType}
                  onAdd={() => onAddMeal?.(day.label, mealType)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
