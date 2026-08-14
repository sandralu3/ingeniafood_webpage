"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyMealSlot } from "@/components/plan/empty-meal-slot";
import { PlanDayProgressHeader } from "@/components/plan/plan-day-progress-header";
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
import { DEFAULT_DAY_BUDGET } from "@/lib/plan/meal-suggestion";
import { movePlanMeal } from "@/lib/plan/plan-service";
import type { PlanSnack } from "@/lib/plan/snack-presets";
import type { PlanDay } from "@/lib/plan/types";
import { getMondayOfWeek, toISODateString, canMarkPlanMealConsumedForPlanDay } from "@/lib/plan/week-utils";
import { fetchUserNutritionGoals } from "@/lib/nutrition/nutrition-profile";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type PlanDayMealsPanelProps = {
  day: PlanDay;
  weekStartISO?: string;
  onAddMeal?: (dayLabel: WeekDay, mealType: MealType) => void;
  onChangeMeal?: (dayLabel: WeekDay, meal: PlanMeal) => void;
  onSwapError?: (message: string) => void;
  onMealRemoved?: (dayLabel: WeekDay, mealType: MealType, planEntryId: string) => void;
  onConsumedChange?: (
    dayLabel: WeekDay,
    mealType: MealType,
    planEntryId: string,
    consumido: boolean
  ) => void;
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

const MEAL_SECTION_EMOJI: Record<MealType, string> = {
  Desayuno: "☀️",
  Almuerzo: "🌤️",
  Cena: "🌙"
};

export function PlanDayMealsPanel({
  day,
  weekStartISO,
  onAddMeal,
  onChangeMeal,
  onSwapError,
  onMealRemoved,
  onConsumedChange,
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
  const canMarkConsumed = canMarkPlanMealConsumedForPlanDay(resolvedWeekStart, day.label);
  const [isMoving, setIsMoving] = useState(false);
  const [calorieTarget, setCalorieTarget] = useState<number>(DEFAULT_DAY_BUDGET.calories);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const supabase = createSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return;
        const goals = await fetchUserNutritionGoals(user.id, supabase);
        if (!cancelled && goals.calorieTarget > 0) {
          setCalorieTarget(goals.calorieTarget);
        }
      } catch (error) {
        console.warn("[plan-day-meals] calorie target", error);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const dragHint =
    assignedItems > 0
      ? t.has("dragToReorderHint")
        ? t("dragToReorderHint")
        : "Toca un plato para verlo. Usa el check, mover, el lápiz o la papelera"
      : null;

  return (
    <section key={day.label} className={cn("animate-fade-in", PLAN_CARD_CLASS, className)}>
      <PlanDayProgressHeader
        dayTitle={t(`days.${day.label}`)}
        dateLabel={day.dateLabel}
        isToday={day.isToday}
        completedMeals={assignedMealTypes}
        totalMeals={MEAL_TYPES.length}
        consumedKcal={day.nutrition.totalKcal}
        targetKcal={calorieTarget}
        dragHint={dragHint}
      />

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
            const sectionEmoji = MEAL_SECTION_EMOJI[mealType];

            return (
              <li key={mealType}>
                <PlanMealDroppable
                  dayLabel={day.label}
                  mealType={mealType}
                  className="space-y-1.5 p-0.5"
                >
                  <PlanSectionDivider
                    label={
                      <>
                        <span aria-hidden>{sectionEmoji}</span> {t(`meals.${mealType}`)}
                      </>
                    }
                    accent={accent}
                  />

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
                        className={isComplement ? "pl-4" : undefined}
                      >
                        <div
                          className={cn(
                            "w-full",
                            isComplement
                              ? "rounded-xl border border-stone-200/70 bg-[#FBF8F3] px-2.5 py-2 shadow-none"
                              : "rounded-xl border border-stone-100/90 bg-white p-2.5 shadow-sm shadow-stone-100/20"
                          )}
                        >
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
                            onMoveToMealType={(toMealType) =>
                              void handleMove(
                                {
                                  dayLabel: day.label,
                                  mealType,
                                  planEntryId: meal.id,
                                  title: meal.title,
                                  imageUrl: meal.imageUrl
                                },
                                { dayLabel: day.label, mealType: toMealType }
                              )
                            }
                            moveDisabled={isMoving || isProposingDayMenu}
                            canMarkConsumed={canMarkConsumed}
                            onConsumedChange={
                              onConsumedChange
                                ? (mealType, planEntryId, consumido) =>
                                    onConsumedChange(day.label, mealType, planEntryId, consumido)
                                : undefined
                            }
                          />
                        </div>
                      </PlanMealDraggable>
                    );
                  })}

                  <div className={meals.length > 0 ? "pl-4" : undefined}>
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
