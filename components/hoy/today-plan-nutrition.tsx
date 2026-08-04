"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Coffee,
  Flame,
  Leaf,
  Loader2,
  Moon,
  Plus
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { HoyPageData } from "@/lib/gamification/hoy-page-data";
import { clearHoyCache } from "@/lib/gamification/hoy-cache";
import { PlanSnacksSection } from "@/components/plan/plan-snacks-section";
import {
  PlanMealDraggable,
  PlanMealDroppable,
  PlanSlotsDndProvider,
  type PlanSlotDragData
} from "@/components/plan/plan-slot-dnd";
import {
  ProposeDayMenuBanner,
  PROPOSE_DAY_MENU_FALLBACK_HREF
} from "@/components/shared/propose-day-menu-banner";
import { Toast } from "@/components/ui/toast";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import { MEAL_TYPES } from "@/lib/plan/constants";
import type { TodayPlanMealSummary } from "@/lib/plan/plan-nutrition";
import type { PlanSnack } from "@/lib/plan/snack-presets";
import { fillTodayPlanWithSuggestions, movePlanMeal } from "@/lib/plan/plan-service";
import { getTodayWeekDay } from "@/lib/plan/week-utils";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { usePremium } from "@/hooks/use-premium";

type TodayPlanNutritionProps = {
  data: HoyPageData | null;
  userId?: string | null;
  onPlanUpdated?: () => void;
  className?: string;
};

type MealSlot = {
  mealType: MealType;
  meal: TodayPlanMealSummary | null;
};

function mealLabelKey(mealType: MealType): "mealSlotBreakfast" | "mealSlotLunch" | "mealSlotDinner" {
  if (mealType === "Desayuno") return "mealSlotBreakfast";
  if (mealType === "Cena") return "mealSlotDinner";
  return "mealSlotLunch";
}

function resolveSlots(meals: HoyPageData["todayPlanMeals"] | undefined): MealSlot[] {
  if (meals && meals.length > 0) return meals;
  return MEAL_TYPES.map((mealType) => ({ mealType, meal: null }));
}

function orderMealSlots(slots: MealSlot[]): MealSlot[] {
  const byType = new Map(slots.map((slot) => [slot.mealType, slot]));
  return MEAL_TYPES.map((mealType) => byType.get(mealType) ?? { mealType, meal: null });
}

const SLOT_BADGE: Record<MealType, string> = {
  Desayuno: "bg-[#E8F0E4] text-[#3E5A3A]",
  Almuerzo: "bg-[#E8F0E4] text-[#3E5A3A]",
  Cena: "bg-[#EDE8F8] text-[#5B4B9A]"
};

const SLOT_PLACEHOLDER: Record<MealType, string> = {
  Desayuno: "from-amber-50 to-orange-100",
  Almuerzo: "from-emerald-50 to-lime-100",
  Cena: "from-stone-100 to-stone-200"
};

function MealPhotoCard({
  mealType,
  meal,
  isGenerating = false,
  compact = false
}: {
  mealType: MealType;
  meal: TodayPlanMealSummary | null;
  isGenerating?: boolean;
  /** Overlay de arrastre: sin Link. */
  compact?: boolean;
}) {
  const t = useTranslations("Hoy");
  const slotLabel = t.has(mealLabelKey(mealType)) ? t(mealLabelKey(mealType)) : mealType;
  const PlannedIcon = mealType === "Desayuno" ? Coffee : mealType === "Cena" ? Moon : Leaf;
  const href = meal?.recipeId
    ? `/app-recetas/recipes/${meal.recipeId}`
    : APP_ROUTES.plan;
  const unplanned = t.has("mealUnplanned") ? t("mealUnplanned") : "Sin planificar";
  const addLabel = t.has("addMeal") ? t("addMeal") : "Añadir";

  const cardClass =
    "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm shadow-stone-200/40 transition hover:shadow-md";

  /* —— Slot vacío compacto (misma altura que foto planificada) —— */
  if (!meal && !isGenerating) {
    const emptyBody = (
      <div className="m-1.5 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/60 p-3 text-center transition-all hover:bg-stone-100/70">
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide",
            SLOT_BADGE[mealType]
          )}
        >
          {slotLabel}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-stone-600 shadow-sm">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span className="text-[10px] font-semibold text-stone-600">{addLabel}</span>
      </div>
    );

    if (compact) {
      return (
        <div className={cardClass} role="listitem">
          {emptyBody}
        </div>
      );
    }

    return (
      <Link href={href} className={cardClass} role="listitem">
        {emptyBody}
      </Link>
    );
  }

  const filledBody = (
    <>
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-stone-100">
        {meal?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meal.imageUrl}
            alt={meal.title}
            className="h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br",
              SLOT_PLACEHOLDER[mealType]
            )}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#3E5A3A]" />
            ) : (
              <PlannedIcon className="h-6 w-6 text-stone-400/70" strokeWidth={1.4} />
            )}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-stone-700 shadow-sm backdrop-blur-sm">
          {slotLabel}
        </span>
      </div>

      <div className="mt-auto px-2 pb-2 pt-1.5">
        <p className="line-clamp-2 min-h-[2rem] text-[11px] font-bold leading-snug text-stone-800">
          {meal
            ? meal.title
            : isGenerating
              ? t.has("todayMenuGenerating")
                ? t("todayMenuGenerating")
                : "Generando…"
              : unplanned}
        </p>
        {meal?.kcal != null ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-stone-500">
            <Flame className="h-3 w-3 text-[#F9A825]" strokeWidth={2} />
            {meal.kcal} kcal
          </p>
        ) : null}
      </div>
    </>
  );

  if (compact) {
    return (
      <div className={cardClass} role="listitem">
        {filledBody}
      </div>
    );
  }

  return (
    <Link href={href} className={cardClass} role="listitem">
      {filledBody}
    </Link>
  );
}

function TodayMealGrid({
  slots,
  dayLabel,
  weekStartISO,
  userId,
  isGeneratingFullDay = false,
  onSlotsChanged,
  onMoveError
}: {
  slots: MealSlot[];
  dayLabel: WeekDay;
  weekStartISO: string;
  userId?: string | null;
  isGeneratingFullDay?: boolean;
  onSlotsChanged?: (slots: MealSlot[]) => void;
  onMoveError?: (message: string) => void;
}) {
  const ordered = useMemo(() => orderMealSlots(slots), [slots]);
  const t = useTranslations("Hoy");
  const tPlan = useTranslations("Plan");
  const [isMoving, setIsMoving] = useState(false);
  const canDrag = Boolean(userId && weekStartISO && !isGeneratingFullDay);

  const handleMove = useCallback(
    async (from: PlanSlotDragData, to: { dayLabel: WeekDay; mealType: MealType }) => {
      if (!userId || !weekStartISO || isMoving) return;

      const previous = ordered;
      const fromSlot = previous.find((slot) => slot.mealType === from.mealType);
      const toSlot = previous.find((slot) => slot.mealType === to.mealType);
      if (!fromSlot?.meal) return;

      // Optimistic UI
      const optimistic = previous.map((slot) => {
        if (slot.mealType === from.mealType) {
          return {
            mealType: slot.mealType,
            meal: toSlot?.meal
              ? { ...toSlot.meal, mealType: from.mealType }
              : null
          };
        }
        if (slot.mealType === to.mealType) {
          return {
            mealType: slot.mealType,
            meal: { ...fromSlot.meal!, mealType: to.mealType }
          };
        }
        return slot;
      });
      onSlotsChanged?.(optimistic);

      setIsMoving(true);
      try {
        const result = await movePlanMeal({
          userId,
          semanaInicioISO: weekStartISO,
          from: { dayLabel: from.dayLabel, mealType: from.mealType },
          to
        });

        if (!result) {
          onSlotsChanged?.(previous);
          onMoveError?.(
            tPlan.has("moveError")
              ? tPlan("moveError")
              : "No pudimos mover la comida. Inténtalo de nuevo."
          );
          return;
        }

        const confirmed = previous.map((slot) => {
          if (slot.mealType === result.source.mealType) {
            const meal = result.source.meal;
            return {
              mealType: slot.mealType,
              meal: meal
                ? {
                    mealType: result.source.mealType,
                    title: meal.title,
                    kcal: meal.kcal ?? null,
                    hasVegetables: Boolean(meal.hasVegetables),
                    hasProtein: Boolean(meal.hasProtein),
                    imageUrl: meal.imageUrl?.trim() || null,
                    recipeId: meal.recipeId ?? null,
                    planEntryId: meal.id ?? null
                  }
                : null
            };
          }
          if (slot.mealType === result.target.mealType) {
            const meal = result.target.meal;
            return {
              mealType: slot.mealType,
              meal: meal
                ? {
                    mealType: result.target.mealType,
                    title: meal.title,
                    kcal: meal.kcal ?? null,
                    hasVegetables: Boolean(meal.hasVegetables),
                    hasProtein: Boolean(meal.hasProtein),
                    imageUrl: meal.imageUrl?.trim() || null,
                    recipeId: meal.recipeId ?? null,
                    planEntryId: meal.id ?? null
                  }
                : null
            };
          }
          return slot;
        });
        onSlotsChanged?.(confirmed);
        clearHoyCache(userId);
      } catch {
        onSlotsChanged?.(previous);
        onMoveError?.(
          tPlan.has("moveError")
            ? tPlan("moveError")
            : "No pudimos mover la comida. Inténtalo de nuevo."
        );
      } finally {
        setIsMoving(false);
      }
    },
    [isMoving, onMoveError, onSlotsChanged, ordered, tPlan, userId, weekStartISO]
  );

  const grid = (
    <div
      className="grid grid-cols-3 items-stretch gap-3"
      role="list"
      aria-label={t.has("todayMenuTitle") ? t("todayMenuTitle") : t("todayPlan")}
    >
      {ordered.map(({ mealType, meal }) => (
        <PlanMealDroppable
          key={mealType}
          dayLabel={dayLabel}
          mealType={mealType}
          disabled={!canDrag || isMoving}
          className="h-full min-h-0"
        >
          {meal?.planEntryId && canDrag ? (
            <PlanMealDraggable
              data={{
                dayLabel,
                mealType,
                planEntryId: meal.planEntryId,
                title: meal.title,
                imageUrl: meal.imageUrl
              }}
              disabled={isMoving}
              className="h-full"
            >
              <MealPhotoCard
                mealType={mealType}
                meal={meal}
                isGenerating={false}
              />
            </PlanMealDraggable>
          ) : (
            <MealPhotoCard
              mealType={mealType}
              meal={meal}
              isGenerating={isGeneratingFullDay && !meal}
            />
          )}
        </PlanMealDroppable>
      ))}
    </div>
  );

  if (!canDrag) {
    return grid;
  }

  return (
    <PlanSlotsDndProvider
      disabled={isMoving}
      onMove={(from, to) => void handleMove(from, to)}
      overlay={(active) => {
        if (!active) return null;
        const slot = ordered.find((item) => item.mealType === active.mealType);
        return (
          <div className="w-[30vw] max-w-[7.5rem]">
            <MealPhotoCard
              mealType={active.mealType}
              meal={slot?.meal ?? null}
              compact
            />
          </div>
        );
      }}
    >
      {grid}
    </PlanSlotsDndProvider>
  );
}

function TodayMenuSection({
  slots,
  snacks,
  weekStartISO,
  userId,
  onPlanUpdated,
  className
}: {
  slots: MealSlot[];
  snacks: PlanSnack[];
  weekStartISO: string;
  userId?: string | null;
  onPlanUpdated?: () => void;
  className?: string;
}) {
  const t = useTranslations("Hoy");
  const { isPremium, isLoading: isPremiumLoading, refresh: refreshPremium } = usePremium();
  const [isGeneratingFullDay, setIsGeneratingFullDay] = useState(false);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuToast, setMenuToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: ""
  });
  const [localSnacks, setLocalSnacks] = useState<PlanSnack[]>(snacks);
  const [localSlots, setLocalSlots] = useState<MealSlot[]>(() => orderMealSlots(slots));
  const dayLabel = getTodayWeekDay();

  useEffect(() => {
    setLocalSnacks(snacks);
  }, [snacks]);

  useEffect(() => {
    setLocalSlots(orderMealSlots(slots));
  }, [slots]);

  const title = t.has("todayMenuTitle") ? t("todayMenuTitle") : t("todayPlan");
  const plannedCountLocal = localSlots.filter((slot) => slot.meal != null).length;
  const hasEmptySlots = plannedCountLocal < MEAL_TYPES.length;
  const displayMealKcal = localSlots.reduce(
    (sum, slot) => sum + (slot.meal?.kcal ?? 0),
    0
  );

  useEffect(() => {
    if (!menuToast.visible) return;
    const timer = window.setTimeout(() => {
      setMenuToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [menuToast.visible]);

  const localSnackKcal = localSnacks.reduce((sum, snack) => sum + snack.kcal, 0);
  const displayKcal = displayMealKcal + localSnackKcal;

  const handleGenerateFullDay = async () => {
    if (!userId || isGeneratingFullDay) return;
    setIsGeneratingFullDay(true);
    setMenuError(null);
    try {
      const result = await fillTodayPlanWithSuggestions({ userId, forceReplace: false });
      if (result.assigned === 0) {
        setMenuError(
          result.skippedOccupied > 0
            ? t.has("todayMenuAlreadyFull")
              ? t("todayMenuAlreadyFull")
              : "Este día ya tiene todas las comidas asignadas."
            : t.has("todayMenuGenerateEmpty")
              ? t("todayMenuGenerateEmpty")
              : "No encontramos recetas para completar el menú."
        );
        return;
      }
      setMenuToast({
        visible: true,
        message:
          result.skippedOccupied > 0 && t.has("dayMenuCompletedRemaining")
            ? t("dayMenuCompletedRemaining")
            : t.has("dayMenuSuggestedSuccess")
              ? t("dayMenuSuggestedSuccess")
              : "Menú del día sugerido con éxito"
      });
      onPlanUpdated?.();
    } catch {
      setMenuError(
        t.has("todayMenuGenerateError")
          ? t("todayMenuGenerateError")
          : "No pudimos generar el menú. Inténtalo de nuevo."
      );
    } finally {
      setIsGeneratingFullDay(false);
    }
  };

  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[#3E5A3A]">{title}</h2>
          {plannedCountLocal > 0 ? (
            <p className="text-[10px] text-stone-400">
              {t.has("dragToReorderHint")
                ? t("dragToReorderHint")
                : "Mantén pulsado y arrastra para cambiar de horario"}
            </p>
          ) : null}
        </div>
        <Link
          href={APP_ROUTES.plan}
          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 transition hover:text-[#3E5A3A]"
        >
          <Flame className="h-3.5 w-3.5 text-[#F9A825]" strokeWidth={2} />
          {displayKcal} kcal
          <span className="text-[#3E5A3A]">{t("viewPlan")}</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#3E5A3A]" />
        </Link>
      </div>

      {hasEmptySlots ? (
        <ProposeDayMenuBanner
          isGenerating={isGeneratingFullDay}
          isPremium={isPremium}
          isPremiumLoading={isPremiumLoading}
          hasPartialPlan={plannedCountLocal > 0}
          onGenerate={() => void handleGenerateFullDay()}
          onUnlockPremium={() => setShowPremiumPaywall(true)}
          hrefWhenUnauthenticated={userId ? undefined : PROPOSE_DAY_MENU_FALLBACK_HREF}
        />
      ) : null}

      {menuError ? (
        <p className="text-center text-[10px] text-rose-600">{menuError}</p>
      ) : null}

      <TodayMealGrid
        slots={localSlots}
        dayLabel={dayLabel}
        weekStartISO={weekStartISO}
        userId={userId}
        isGeneratingFullDay={isGeneratingFullDay}
        onSlotsChanged={setLocalSlots}
        onMoveError={(message) => {
          setMenuError(message);
        }}
      />

      {weekStartISO && localSnacks.length > 0 ? (
        <PlanSnacksSection
          dayLabel={dayLabel}
          weekStartISO={weekStartISO}
          snacks={localSnacks}
          readOnly
          variant="hoy"
        />
      ) : null}

      <PremiumUpgradeDialog
        open={showPremiumPaywall}
        onClose={() => setShowPremiumPaywall(false)}
        onUpgraded={() => void refreshPremium()}
        featureLabel={
          t.has("proposeDayMenuFeature")
            ? t("proposeDayMenuFeature")
            : "Proponer menú del día con IA"
        }
      />

      <Toast message={menuToast.message} visible={menuToast.visible} variant="success" />
    </section>
  );
}

/**
 * Plan / menú de hoy: carrusel visual Desayuno · Almuerzo · Cena + snacks.
 */
export function TodayPlanNutrition({
  data,
  userId = null,
  onPlanUpdated,
  className
}: TodayPlanNutritionProps) {
  const slots = resolveSlots(data?.todayPlanMeals);

  return (
    <TodayMenuSection
      className={className}
      slots={slots}
      snacks={data?.todayPlanSnacks ?? []}
      weekStartISO={data?.weekStartISO ?? ""}
      userId={userId}
      onPlanUpdated={onPlanUpdated}
    />
  );
}
