"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Loader2, Sparkles, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import type { HoyPageData } from "@/lib/gamification/hoy-page-data";
import { EmptyMealCard } from "@/components/hoy/empty-meal-card";
import { HoySection } from "@/components/hoy/hoy-section-header";
import { PlanSnacksSection } from "@/components/plan/plan-snacks-section";
import { Toast } from "@/components/ui/toast";
import type { MealType } from "@/lib/plan/constants";
import { MEAL_TYPES } from "@/lib/plan/constants";
import { computeRemainingMacros, type RemainingMacros } from "@/lib/plan/meal-suggestion";
import { fetchUserNutritionGoals } from "@/lib/nutrition/nutrition-profile";
import type { TodayPlanMealSummary } from "@/lib/plan/plan-nutrition";
import type { PlanSnack } from "@/lib/plan/snack-presets";
import { fillTodayPlanWithSuggestions } from "@/lib/plan/plan-service";
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

function orderSlotsForCarousel(slots: MealSlot[]): MealSlot[] {
  const byType = new Map(slots.map((slot) => [slot.mealType, slot]));
  return MEAL_TYPES.map((mealType) => byType.get(mealType) ?? { mealType, meal: null });
}

function CarouselDots({
  count,
  activeIndex,
  onSelect
}: {
  count: number;
  activeIndex: number;
  onSelect?: (index: number) => void;
}) {
  if (count <= 1) return null;

  return (
    <div
      className="mt-1.5 flex items-center justify-center gap-1.5"
      role="tablist"
      aria-label="Posición del menú"
    >
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          role="tab"
          aria-selected={index === activeIndex}
          aria-label={`Ir a comida ${index + 1}`}
          onClick={() => onSelect?.(index)}
          className={cn(
            "h-1 w-1 rounded-full transition-colors",
            index === activeIndex ? "bg-stone-500" : "bg-stone-300 hover:bg-stone-400"
          )}
        />
      ))}
    </div>
  );
}

function GenerateFullDayBanner({
  userId,
  isPremium,
  isPremiumLoading,
  isGenerating,
  onGenerate,
  onUnlockPremium
}: {
  userId: string | null | undefined;
  isPremium: boolean;
  isPremiumLoading: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onUnlockPremium: () => void;
}) {
  const t = useTranslations("Hoy");
  const premiumReady = Boolean(isPremium && !isPremiumLoading);

  const handleClick = () => {
    if (!userId) return;
    if (!premiumReady) {
      onUnlockPremium();
      return;
    }
    onGenerate();
  };

  if (!userId) {
    return (
      <Link
        href={APP_ROUTES.plan}
        className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#556B2F] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#3e5219]"
      >
        <Sparkles className="h-3 w-3" />
        {t.has("todayMenuGenerateCta")
          ? t("todayMenuGenerateCta")
          : "✨ Generar menú completo para hoy"}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isGenerating || isPremiumLoading}
      className={cn(
        "mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all disabled:cursor-wait disabled:opacity-70",
        premiumReady
          ? "border-[#4D6638]/25 bg-[#4D6638]/8 text-[#4D6638] hover:bg-[#4D6638]/15"
          : "border-amber-300/50 bg-amber-500/10 text-amber-900 hover:bg-amber-500/15"
      )}
    >
      {isGenerating ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      <span>
        {isGenerating
          ? t.has("todayMenuGenerating")
            ? t("todayMenuGenerating")
            : "Generando tu menú…"
          : t.has("proposeDayMenu")
            ? t("proposeDayMenu")
            : "✨ Proponer menú del día"}
      </span>
      {!premiumReady && !isGenerating ? (
        <span className="text-[9px] font-bold tracking-wide">👑 PRO</span>
      ) : null}
    </button>
  );
}

function GeneratingMealPlaceholder({ slotLabel }: { slotLabel: string }) {
  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center gap-1 rounded-lg border border-emerald-100/80 bg-emerald-50/40 px-1.5 py-2 text-center"
      aria-busy="true"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4D6638]" />
      <p className="text-[9px] font-semibold uppercase tracking-wide text-stone-500">{slotLabel}</p>
    </div>
  );
}

function TodayBalanceInline({
  totalKcal,
  hasVegetables,
  hasProtein
}: {
  totalKcal: number;
  hasVegetables: boolean;
  hasProtein: boolean;
}) {
  const t = useTranslations("Hoy");

  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-orange-900 ring-1 ring-orange-100">
        <Flame className="h-3 w-3" strokeWidth={2} />
        {totalKcal}
        <span className="font-semibold text-orange-800/70">kcal</span>
      </span>
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ring-1",
          hasVegetables
            ? "bg-emerald-50 ring-emerald-200"
            : "bg-stone-50 text-stone-300 ring-stone-200"
        )}
        title={t.has("todayBalanceVeggies") ? t("todayBalanceVeggies") : "Vegetales"}
      >
        🥗
      </span>
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ring-1",
          hasProtein
            ? "bg-amber-50 ring-amber-200"
            : "bg-stone-50 text-stone-300 ring-stone-200"
        )}
        title={t.has("todayBalanceProtein") ? t("todayBalanceProtein") : "Proteína"}
      >
        🥩
      </span>
    </div>
  );
}

const MEAL_CARD_FRAME = "h-[7.25rem] w-[128px] shrink-0 snap-start";

function MealStoryCard({
  mealType,
  meal
}: {
  mealType: MealType;
  meal: TodayPlanMealSummary;
}) {
  const t = useTranslations("Hoy");
  const slotLabel = t.has(mealLabelKey(mealType)) ? t(mealLabelKey(mealType)) : mealType;
  const href = meal.recipeId ? `/app-recetas/recipes/${meal.recipeId}` : APP_ROUTES.plan;

  return (
    <Link
      href={href}
      className="group flex h-full w-full flex-col overflow-hidden rounded-lg border border-stone-100/90 bg-white p-1 shadow-sm shadow-stone-100/40 transition hover:border-emerald-100 hover:shadow-md"
    >
      <div className="relative h-14 shrink-0 overflow-hidden rounded-md">
        {meal.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URLs externas de Supabase/storage
          <img
            src={meal.imageUrl}
            alt={meal.title}
            className="h-full w-full rounded-md object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br",
              mealType === "Desayuno" && "from-amber-50 to-orange-100",
              mealType === "Almuerzo" && "from-emerald-50 to-lime-100",
              mealType === "Cena" && "from-indigo-50 to-stone-100"
            )}
            aria-hidden
          >
            <UtensilsCrossed className="h-4 w-4 text-stone-400/80" strokeWidth={1.4} />
          </div>
        )}
        <span className="absolute left-1 top-1 rounded bg-white/90 px-1 py-0.5 text-[7px] font-bold uppercase tracking-[0.08em] text-stone-700 shadow-sm backdrop-blur-sm">
          {slotLabel}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-0.5 px-0.5 pt-1">
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-stone-900 group-hover:text-emerald-950">
          {meal.title}
        </p>
        {meal.kcal != null ? (
          <p className="text-[9px] font-medium tabular-nums text-stone-500">🔥 {meal.kcal} kcal</p>
        ) : (
          <p className="text-[9px] font-medium text-stone-400">—</p>
        )}
      </div>
    </Link>
  );
}

function TodayMenuCarousel({
  slots,
  userId,
  remainingMacros,
  onPlanUpdated,
  isGeneratingFullDay = false
}: {
  slots: MealSlot[];
  userId?: string | null;
  remainingMacros?: RemainingMacros | null;
  onPlanUpdated?: () => void;
  isGeneratingFullDay?: boolean;
}) {
  const ordered = useMemo(() => orderSlotsForCarousel(slots), [slots]);
  const t = useTranslations("Hoy");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: ""
  });
  const occupiedRecipeIds = useMemo(
    () =>
      ordered
        .map((slot) => slot.meal?.recipeId)
        .filter((id): id is string => Boolean(id)),
    [ordered]
  );

  useEffect(() => {
    if (!toast.visible) return;
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [toast.visible]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    let frame = 0;

    const measurePages = () => {
      const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
      // Páginas reales de scroll (no 1 dot por tarjeta): evita 3 dots cuando solo hay ~2 vistas.
      const pages =
        maxScroll <= 8
          ? 1
          : Math.min(ordered.length, Math.max(2, Math.round(maxScroll / Math.max(node.clientWidth * 0.72, 1)) + 1));
      setPageCount(pages);
      return { maxScroll, pages };
    };

    const updateActiveIndex = () => {
      const { maxScroll, pages } = measurePages();
      if (pages <= 1 || maxScroll <= 0) {
        setActiveIndex(0);
        return;
      }
      const progress = Math.min(1, Math.max(0, node.scrollLeft / maxScroll));
      const next = Math.min(pages - 1, Math.round(progress * (pages - 1)));
      setActiveIndex((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveIndex);
    };

    updateActiveIndex();
    node.addEventListener("scroll", onScroll, { passive: true });
    node.addEventListener("scrollend", updateActiveIndex);
    window.addEventListener("resize", updateActiveIndex);

    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("scroll", onScroll);
      node.removeEventListener("scrollend", updateActiveIndex);
      window.removeEventListener("resize", updateActiveIndex);
    };
  }, [ordered.length]);

  const scrollToIndex = (index: number) => {
    const node = scrollerRef.current;
    if (!node) return;
    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    if (pageCount <= 1 || maxScroll <= 0) {
      node.scrollTo({ left: 0, behavior: "smooth" });
      setActiveIndex(0);
      return;
    }
    const left = (index / Math.max(1, pageCount - 1)) * maxScroll;
    node.scrollTo({ left, behavior: "smooth" });
    setActiveIndex(index);
  };

  return (
    <div>
      <div
        ref={scrollerRef}
        className="no-scrollbar flex flex-row items-stretch gap-2 overflow-x-auto overscroll-x-contain pb-0.5 snap-x snap-mandatory"
        role="list"
        aria-label={t.has("todayMenuTitle") ? t("todayMenuTitle") : t("todayPlan")}
      >
        {ordered.map(({ mealType, meal }) => {
          const slotLabel = t.has(mealLabelKey(mealType))
            ? t(mealLabelKey(mealType))
            : mealType;

          return (
            <div key={mealType} role="listitem" className={MEAL_CARD_FRAME}>
              {meal ? (
                <MealStoryCard mealType={mealType} meal={meal} />
              ) : isGeneratingFullDay ? (
                <GeneratingMealPlaceholder slotLabel={slotLabel} />
              ) : (
                <EmptyMealCard
                  mealType={mealType}
                  slotLabel={slotLabel}
                  userId={userId}
                  remainingMacros={remainingMacros}
                  excludeRecipeIds={occupiedRecipeIds}
                  onAssigned={onPlanUpdated}
                  onAddSuccess={(message) => setToast({ visible: true, message })}
                />
              )}
            </div>
          );
        })}
      </div>

      <CarouselDots
        count={pageCount}
        activeIndex={activeIndex}
        onSelect={scrollToIndex}
      />

      <Toast message={toast.message} visible={toast.visible} variant="success" />
    </div>
  );
}

function TodayMenuSection({
  slots,
  snacks,
  weekStartISO,
  totalKcal,
  totalProtein,
  totalCarbs,
  totalFat,
  hasVegetables,
  hasProtein,
  plannedCount,
  userId,
  onPlanUpdated,
  className
}: {
  slots: MealSlot[];
  snacks: PlanSnack[];
  weekStartISO: string;
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  hasVegetables: boolean;
  hasProtein: boolean;
  plannedCount: number;
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

  useEffect(() => {
    setLocalSnacks(snacks);
  }, [snacks]);

  const title = t.has("todayMenuTitle") ? t("todayMenuTitle") : t("todayPlan");
  const isEmptyDay = plannedCount === 0 && localSnacks.length === 0;
  const hasEmptySlots = plannedCount < MEAL_TYPES.length;
  // Subtítulo solo si el día está vacío; si hay comidas, la kcal va en el meta.
  const subtitle = isEmptyDay
    ? t.has("todayMenuEmptySubtitle")
      ? t("todayMenuEmptySubtitle")
      : "Elige plato a plato o genera el menú completo"
    : undefined;

  const [dayBudget, setDayBudget] = useState<RemainingMacros | null>(null);

  useEffect(() => {
    if (!userId) {
      setDayBudget(null);
      return;
    }
    let cancelled = false;
    void fetchUserNutritionGoals(userId).then((goals) => {
      if (cancelled) return;
      setDayBudget({
        calories: goals.calorieTarget,
        protein: goals.proteinTarget,
        carbs: goals.carbsTarget,
        fat: goals.fatTarget
      });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!menuToast.visible) return;
    const timer = window.setTimeout(() => {
      setMenuToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [menuToast.visible]);

  const baseSnackKcal = snacks.reduce((sum, snack) => sum + snack.kcal, 0);
  const baseSnackProtein = snacks.reduce((sum, snack) => sum + snack.proteinGrams, 0);
  const baseSnackCarbs = snacks.reduce((sum, snack) => sum + snack.carbsGrams, 0);
  const baseSnackFat = snacks.reduce((sum, snack) => sum + snack.fatGrams, 0);
  const localSnackKcal = localSnacks.reduce((sum, snack) => sum + snack.kcal, 0);
  const localSnackProtein = localSnacks.reduce((sum, snack) => sum + snack.proteinGrams, 0);
  const localSnackCarbs = localSnacks.reduce((sum, snack) => sum + snack.carbsGrams, 0);
  const localSnackFat = localSnacks.reduce((sum, snack) => sum + snack.fatGrams, 0);

  const displayKcal = totalKcal - baseSnackKcal + localSnackKcal;
  const displayProtein = totalProtein - baseSnackProtein + localSnackProtein;
  const displayCarbs = totalCarbs - baseSnackCarbs + localSnackCarbs;
  const displayFat = totalFat - baseSnackFat + localSnackFat;

  const remainingMacros = useMemo(
    () =>
      computeRemainingMacros(
        {
          calories: displayKcal,
          protein: displayProtein,
          carbs: displayCarbs,
          fat: displayFat
        },
        dayBudget
      ),
    [dayBudget, displayCarbs, displayFat, displayKcal, displayProtein]
  );

  const handleGenerateFullDay = async () => {
    if (!userId || isGeneratingFullDay) return;
    setIsGeneratingFullDay(true);
    setMenuError(null);
    try {
      const result = await fillTodayPlanWithSuggestions({ userId, forceReplace: false });
      if (result.assigned === 0) {
        setMenuError(
          t.has("todayMenuGenerateEmpty")
            ? t("todayMenuGenerateEmpty")
            : "No encontramos recetas para completar el menú."
        );
        return;
      }
      setMenuToast({
        visible: true,
        message: t.has("dayMenuSuggestedSuccess")
          ? t("dayMenuSuggestedSuccess")
          : "✨ Menú del día sugerido con éxito"
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
    <HoySection
      className={className}
      title={title}
      subtitle={subtitle}
      meta={
        !isEmptyDay ? (
          <TodayBalanceInline
            totalKcal={displayKcal}
            hasVegetables={hasVegetables}
            hasProtein={hasProtein || displayProtein >= 12}
          />
        ) : null
      }
      action={
        <Link
          href={APP_ROUTES.plan}
          className="text-[10px] font-semibold text-[#556B2F] transition hover:text-[#3e5219]"
        >
          {t("viewPlan")}
        </Link>
      }
      contentClassName={cn(
        "overflow-hidden border p-2 sm:p-2.5",
        isEmptyDay
          ? "border-emerald-100/50 bg-gradient-to-br from-white via-emerald-50/25 to-lime-50/30"
          : "border-emerald-100/40 bg-gradient-to-br from-white via-[#FBFCF8] to-emerald-50/20"
      )}
    >
      {hasEmptySlots ? (
        <>
          <GenerateFullDayBanner
            userId={userId}
            isPremium={isPremium}
            isPremiumLoading={isPremiumLoading}
            isGenerating={isGeneratingFullDay}
            onGenerate={() => void handleGenerateFullDay()}
            onUnlockPremium={() => setShowPremiumPaywall(true)}
          />
          {menuError ? (
            <p className="mb-1.5 text-center text-[10px] text-rose-600">{menuError}</p>
          ) : null}
        </>
      ) : null}

      <TodayMenuCarousel
        slots={slots}
        userId={userId}
        remainingMacros={remainingMacros}
        onPlanUpdated={onPlanUpdated}
        isGeneratingFullDay={isGeneratingFullDay}
      />

      {weekStartISO ? (
        <div className="mt-2">
          <PlanSnacksSection
            dayLabel={getTodayWeekDay()}
            weekStartISO={weekStartISO}
            snacks={localSnacks}
            readOnly
            compact
          />
        </div>
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
    </HoySection>
  );
}

/**
 * Plan / menú de hoy:
 * - Vacío → banner generar + slots con sugerencia IA
 * - Con comidas → balance + carrusel (slots vacíos con sugerencia)
 */
export function TodayPlanNutrition({
  data,
  userId = null,
  onPlanUpdated,
  className
}: TodayPlanNutritionProps) {
  const nutrition = data?.todayPlanNutrition;
  const plannedCount = nutrition?.plannedMealCount ?? 0;
  const slots = resolveSlots(data?.todayPlanMeals);

  return (
    <TodayMenuSection
      className={className}
      slots={slots}
      snacks={data?.todayPlanSnacks ?? []}
      weekStartISO={data?.weekStartISO ?? ""}
      plannedCount={plannedCount}
      totalKcal={nutrition?.totalKcal ?? 0}
      totalProtein={nutrition?.totalProteinGrams ?? 0}
      totalCarbs={nutrition?.totalCarbsGrams ?? 0}
      totalFat={nutrition?.totalFatGrams ?? 0}
      hasVegetables={Boolean(nutrition?.hasVegetables)}
      hasProtein={Boolean(nutrition?.hasProtein)}
      userId={userId}
      onPlanUpdated={onPlanUpdated}
    />
  );
}
