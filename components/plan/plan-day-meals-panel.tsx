"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyMealSlot } from "@/components/plan/empty-meal-slot";
import { PlanMealCard, type PlanMeal } from "@/components/plan/plan-meal-card";
import { PlanSectionDivider } from "@/components/plan/plan-section-divider";
import { PlanSnacksSection } from "@/components/plan/plan-snacks-section";
import {
  PlanMealDraggable,
  PlanMealDroppable,
  PlanSlotsDndProvider,
  type PlanSlotDragData
} from "@/components/plan/plan-slot-dnd";
import { ProposeDayMenuBanner } from "@/components/shared/propose-day-menu-banner";
import { MEAL_TYPES, type MealType, type WeekDay } from "@/lib/plan/constants";
import { getMealTypeSubtleAccent } from "@/lib/plan/meal-type-accent";
import { movePlanMeal } from "@/lib/plan/plan-service";
import type { PlanSnack } from "@/lib/plan/snack-presets";
import type { PlanDay } from "@/lib/plan/types";
import { getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type PlanDayMealsPanelProps = {
  day: PlanDay;
  weekStartISO?: string;
  onAddMeal?: (dayLabel: WeekDay, mealType: MealType) => void;
  onChangeMeal?: (dayLabel: WeekDay, meal: PlanMeal) => void;
  onSwapError?: (message: string) => void;
  onMealRemoved?: (dayLabel: WeekDay, mealType: MealType, planEntryId: string) => void;
  onRemoveError?: (message: string) => void;
  onMealMoved?: (
    result: NonNullable<Awaited<ReturnType<typeof movePlanMeal>>>
  ) => void;
  onSnackAdded?: (dayLabel: WeekDay, snack: PlanSnack) => void;
  onSnackRemoved?: (dayLabel: WeekDay, snackId: string) => void;
  onOpenSnackRegister?: () => void;
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
  onChangeMeal,
  onSwapError,
  onMealRemoved,
  onRemoveError,
  onMealMoved,
  onSnackAdded,
  onSnackRemoved,
  onOpenSnackRegister,
  onProposeDayMenu,
  isProposingDayMenu = false,
  isPremium = false,
  className
}: PlanDayMealsPanelProps) {
  const t = useTranslations("Plan");
  const assignedMealTypes = MEAL_TYPES.filter(
    (type) => (day.slots[type]?.length ?? 0) > 0
  ).length;
  const assignedItems = MEAL_TYPES.reduce(
    (sum, type) => sum + (day.slots[type]?.length ?? 0),
    0
  );
  const hasEmptySlots = assignedMealTypes < MEAL_TYPES.length;
  const showPropose = Boolean(onProposeDayMenu) && hasEmptySlots;
  const resolvedWeekStart = weekStartISO ?? toISODateString(getMondayOfWeek());
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = useCallback(
    async (from: PlanSlotDragData, to: { dayLabel: WeekDay; mealType: MealType }) => {
      if (isMoving || isProposingDayMenu) return;

      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        onSwapError?.(t("loginToEdit"));
        return;
      }

      setIsMoving(true);
      try {
        const result = await movePlanMeal({
          userId: user.id,
          semanaInicioISO: resolvedWeekStart,
          planEntryId: from.planEntryId,
          from: { dayLabel: from.dayLabel, mealType: from.mealType },
          to
        });

        if (!result) {
          onSwapError?.(
            t.has("moveError")
              ? t("moveError")
              : "No pudimos mover la comida. Inténtalo de nuevo."
          );
          return;
        }

        onMealMoved?.(result);
      } catch (error) {
        console.error("[plan] Error moviendo comida:", error);
        onSwapError?.(
          t.has("moveError")
            ? t("moveError")
            : "No pudimos mover la comida. Inténtalo de nuevo."
        );
      } finally {
        setIsMoving(false);
      }
    },
    [
      isMoving,
      isProposingDayMenu,
      onMealMoved,
      onSwapError,
      resolvedWeekStart,
      t
    ]
  );

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
          {assignedItems > 0 ? (
            <p className="mt-0.5 text-[10px] text-stone-400">
              {t.has("dragToReorderHint")
                ? t("dragToReorderHint")
                : "Arrastra una comida a otro hueco para cambiarla de horario"}
            </p>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
          {assignedMealTypes}/{MEAL_TYPES.length}
          {day.nutrition.totalKcal > 0 ? (
            <span className="ml-1 text-orange-800">· {day.nutrition.totalKcal} kcal</span>
          ) : null}
        </span>
      </div>

      {showPropose ? (
        <div className="mb-2.5">
          <ProposeDayMenuBanner
            isGenerating={isProposingDayMenu}
            isPremium={isPremium}
            hasPartialPlan={assignedMealTypes > 0}
            onGenerate={() => onProposeDayMenu?.()}
          />
        </div>
      ) : null}

      <PlanSlotsDndProvider
        disabled={isMoving || isProposingDayMenu}
        onMove={(from, to) => void handleMove(from, to)}
        overlay={(active) => {
          if (!active) return null;
          return (
            <div className="flex max-w-[240px] items-center gap-2 rounded-lg border border-stone-100 bg-white px-2 py-1.5 shadow-lg">
              {active.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.imageUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  draggable={false}
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-[10px] font-bold text-stone-500">
                  {active.mealType.slice(0, 3)}
                </div>
              )}
              <p className="line-clamp-2 text-xs font-semibold text-stone-800">{active.title}</p>
            </div>
          );
        }}
      >
        <ul className="space-y-1.5">
          {MEAL_TYPES.map((mealType) => {
            const meals = day.slots[mealType] ?? [];
            const accent = getMealTypeSubtleAccent(mealType);
            const slotGenerating = isProposingDayMenu && meals.length === 0;

            return (
              <li key={mealType}>
                <PlanMealDroppable
                  dayLabel={day.label}
                  mealType={mealType}
                  className="space-y-1.5 p-0.5"
                >
                  <PlanSectionDivider label={t(`meals.${mealType}`)} accent={accent} />

                  {meals.map((meal, index) => {
                    const isComplement = index > 0;
                    return (
                      <PlanMealDraggable
                        key={meal.id}
                        data={{
                          dayLabel: day.label,
                          mealType,
                          planEntryId: meal.id,
                          title: meal.title,
                          imageUrl: meal.imageUrl
                        }}
                        disabled={isMoving || isProposingDayMenu}
                        className={isComplement ? "pl-5" : undefined}
                      >
                        <div
                          className={cn(
                            "w-full",
                            isComplement
                              ? "rounded-md border border-dashed border-stone-200/80 bg-stone-50/60 px-2.5 py-1.5 shadow-none"
                              : "rounded-xl border border-stone-100/90 bg-white p-2.5 shadow-sm shadow-stone-100/20"
                          )}
                        >
                          {isComplement ? (
                            <p className="mb-1 pt-0.5 text-[8px] font-semibold uppercase tracking-wide text-stone-400">
                              {t.has("complementBadge") ? t("complementBadge") : "Complemento"}
                            </p>
                          ) : null}
                          <PlanMealCard
                            meal={meal}
                            variant="panel"
                            isComplement={isComplement}
                            onMealRemoved={(removedMealType, planEntryId) =>
                              onMealRemoved?.(day.label, removedMealType, planEntryId)
                            }
                            onRemoveError={onRemoveError ?? onSwapError}
                            onChangeMeal={
                              onChangeMeal
                                ? (selected) => onChangeMeal(day.label, selected)
                                : undefined
                            }
                          />
                        </div>
                      </PlanMealDraggable>
                    );
                  })}

                  <div className={meals.length > 0 ? "pl-5" : undefined}>
                    <EmptyMealSlot
                      mealType={mealType}
                      isGenerating={slotGenerating}
                      addComplement={meals.length > 0}
                      onAdd={() => onAddMeal?.(day.label, mealType)}
                    />
                  </div>
                </PlanMealDroppable>
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
              onOpenRegister={onOpenSnackRegister}
              onError={onRemoveError}
            />
          </li>
        </ul>
      </PlanSlotsDndProvider>
    </section>
  );
}
