"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyMealSlot } from "@/components/plan/empty-meal-slot";
import { PlanMealCard, type PlanMeal } from "@/components/plan/plan-meal-card";
import { PlanSectionDivider } from "@/components/plan/plan-section-divider";
import { PlanSnacksSection } from "@/components/plan/plan-snacks-section";
import { MEAL_TYPES, type MealType, type WeekDay } from "@/lib/plan/constants";
import { getMealTypeSubtleAccent } from "@/lib/plan/meal-type-accent";
import type { PlanSnack } from "@/lib/plan/snack-presets";
import type { PlanDay } from "@/lib/plan/types";
import { getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";
import { cn } from "@/lib/utils";

type PlanDayMealsPanelProps = {
  day: PlanDay;
  weekStartISO?: string;
  onAddMeal?: (dayLabel: WeekDay, mealType: MealType) => void;
  onMealSwapped?: (dayLabel: WeekDay, updatedMeal: PlanMeal) => void;
  onSwapError?: (message: string) => void;
  onMealRemoved?: (dayLabel: WeekDay, mealType: MealType) => void;
  onRemoveError?: (message: string) => void;
  onSnackAdded?: (dayLabel: WeekDay, snack: PlanSnack) => void;
  onSnackRemoved?: (dayLabel: WeekDay, snackId: string) => void;
  onProposeDayMenu?: () => void;
  isProposingDayMenu?: boolean;
  isPremium?: boolean;
  className?: string;
};

const PLAN_CARD_CLASS =
  "rounded-2xl bg-[#FCFBFA] px-2.5 py-2 shadow-sm shadow-stone-200/25";

export function PlanDayMealsPanel({
  day,
  weekStartISO,
  onAddMeal,
  onMealSwapped,
  onSwapError,
  onMealRemoved,
  onRemoveError,
  onSnackAdded,
  onSnackRemoved,
  onProposeDayMenu,
  isProposingDayMenu = false,
  isPremium = false,
  className
}: PlanDayMealsPanelProps) {
  const t = useTranslations("Plan");
  const assignedCount = MEAL_TYPES.filter((type) => day.slots[type] !== null).length;
  const dayIsEmpty = assignedCount === 0;
  const showPropose = Boolean(onProposeDayMenu) && dayIsEmpty;
  const resolvedWeekStart = weekStartISO ?? toISODateString(getMondayOfWeek());

  return (
    <section key={day.label} className={cn("animate-fade-in", PLAN_CARD_CLASS, className)}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
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

      {showPropose ? (
        <div className="mb-2.5">
          <button
            type="button"
            onClick={onProposeDayMenu}
            disabled={isProposingDayMenu}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-wait disabled:opacity-70",
              isPremium
                ? "border-[#4D6638]/30 bg-[#4D6638]/10 text-[#4D6638] hover:bg-[#4D6638]/20"
                : "border-amber-300/60 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20"
            )}
          >
            {isProposingDayMenu ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            <span>
              {isProposingDayMenu
                ? t.has("proposingDayMenu")
                  ? t("proposingDayMenu")
                  : "Generando menú…"
                : t.has("proposeDayMenu")
                  ? t("proposeDayMenu")
                  : "✨ Proponer menú del día"}
            </span>
            {!isPremium && !isProposingDayMenu ? (
              <span className="ml-0.5 text-[10px] font-bold tracking-wide">👑 PRO</span>
            ) : null}
          </button>
        </div>
      ) : null}

      <ul className="space-y-2">
        {MEAL_TYPES.map((mealType) => {
          const meal = day.slots[mealType];
          const accent = getMealTypeSubtleAccent(mealType);
          const slotGenerating = isProposingDayMenu && !meal;

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
                  isGenerating={slotGenerating}
                  onAdd={() => onAddMeal?.(day.label, mealType)}
                />
              )}
            </li>
          );
        })}

        <li>
          <PlanSnacksSection
            dayLabel={day.label}
            weekStartISO={resolvedWeekStart}
            snacks={day.snacks ?? []}
            onSnackAdded={(snack) => onSnackAdded?.(day.label, snack)}
            onSnackRemoved={(snackId) => onSnackRemoved?.(day.label, snackId)}
            onError={onRemoveError}
          />
        </li>
      </ul>
    </section>
  );
}
