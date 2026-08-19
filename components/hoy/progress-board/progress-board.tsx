"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { IntelligentDoseModal } from "@/components/hoy/progress-board/IntelligentDoseModal";
import { WaterDoseIndicator } from "@/components/hoy/progress-board/water-dose-indicator";
import { HoyProgressBoardSkeleton } from "@/components/skeletons/hoy-dashboard-skeleton";
import { StreakCalendarModal } from "@/components/hoy/progress-board/progress-board-modals";
import { NutritionCoachTeaserModal } from "@/components/hoy/nutrition-coach-teaser-modal";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { useIntelligentDose } from "@/hooks/use-intelligent-dose";
import { usePremium } from "@/hooks/use-premium";
import { getBuiltinHealthyTips } from "@/lib/content/builtin-tips";
import { pickDailyTipIndex } from "@/lib/content/daily-tip";
import type { HoyPageData } from "@/lib/gamification/hoy-page-data";
import { mergeActivityIntoCompletions } from "@/lib/gamification/activity-streak";
import { getCurrentStreakDateSet } from "@/lib/gamification/weekly-metrics";
import { buildWeekConsistencyDays, type WeekConsistencyDay } from "@/lib/gamification/week-consistency";
import {
  fetchTodayWaterGlassesDrunk,
  fetchWaterGlassesGoal,
  subscribeWaterIntakeChanged
} from "@/lib/hydration/water-intake";
import { resolveWaterIntakeStatus } from "@/lib/hydration/water-status";
import { computeDayBalanceLevel } from "@/lib/premium-stories/dose-suggested-recipe";
import type { IntelligentDoseMealSnapshot } from "@/lib/premium-stories/intelligent-dose-context";
import { isLikelyLiquidMealTitle } from "@/lib/plan/plan-nutrition";
import { parseAppLocale } from "@/i18n/config";
import { toISODateString } from "@/lib/plan/week-utils";
import { cn } from "@/lib/utils";

function ConsistencyDotsWeek({ days }: { days: WeekConsistencyDay[] }) {
  return (
    <div className="mt-auto flex w-full items-start justify-between gap-0.5 pt-1.5">
      {days.map((day) => {
        const done = day.active || day.inCurrentStreak;
        return (
          <div key={day.isoDate} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
            <span
              className={cn(
                "flex h-[18px] w-[18px] items-center justify-center rounded-full sm:h-5 sm:w-5",
                done
                  ? "bg-[#F9A825] text-white"
                  : "border border-stone-200 bg-white text-transparent",
                day.isToday && !done && "ring-2 ring-[#F9A825]/30 ring-offset-1"
              )}
              title={day.label}
            >
              {done ? (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
                  <path
                    d="M2.5 6.2 4.8 8.5 9.5 3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span className="text-[8px] font-medium uppercase leading-none text-stone-400">
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Anillo compacto para la tarjeta Dosis. */
function DoseRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative h-7 w-7 shrink-0 sm:h-8 sm:w-8">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
        <defs>
          <linearGradient id="doseRingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3E5A3A" />
            <stop offset="55%" stopColor="#88C34A" />
            <stop offset="100%" stopColor="#F9A825" />
          </linearGradient>
        </defs>
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="#EDE8E0"
          strokeWidth="3.5"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="url(#doseRingGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    </div>
  );
}

function buildPlanRevision(data: HoyPageData | null): string | null {
  if (!data) return null;
  const meals = (data.todayPlanMeals ?? [])
    .map((slot) =>
      `${slot.mealType}:${(slot.meals ?? [])
        .map((meal) => `${meal.recipeId ?? ""}:${meal.kcal ?? ""}`)
        .join(",")}`
    )
    .join("|");
  const snacks = (data.todayPlanSnacks ?? [])
    .map((snack) => `${snack.id}:${snack.kcal}`)
    .join("|");
  const nutrition = data.todayPlanNutrition;
  return [
    data.fetchedAt,
    nutrition?.totalKcal ?? 0,
    nutrition?.plannedMealCount ?? 0,
    meals,
    snacks
  ].join("::");
}

/** Snapshot ligero desde el plan de Hoy para actualizar score/chips al instante. */
function snapshotFromHoyPlan(
  data: HoyPageData | null,
  calorieTarget?: number | null
): IntelligentDoseMealSnapshot | null {
  const nutrition = data?.todayPlanNutrition;
  if (!nutrition || nutrition.plannedMealCount <= 0) return null;

  const totalCalories = nutrition.totalKcal;
  const mealCount = nutrition.plannedMealCount;
  const mealTitles = (data?.todayPlanMeals ?? [])
    .flatMap((slot) => slot.meals ?? [])
    .map((meal) => meal.title)
    .filter((title): title is string => Boolean(title))
    .slice(0, 8);
  const dishes = (data?.todayPlanMeals ?? []).flatMap((slot) =>
    (slot.meals ?? []).map((meal) => {
      const title = meal.title?.trim() || "Sin título";
      return {
        mealType: slot.mealType,
        title,
        kcal: Math.max(0, Math.round(meal.kcal ?? 0)),
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
        ingredientNames: [] as string[],
        isLikelyLiquidOnly: isLikelyLiquidMealTitle(title)
      };
    })
  );
  const solidDishes = dishes.filter((d) => !d.isLikelyLiquidOnly);
  const isLikelyLiquidOnly = dishes.length > 0 && solidDishes.length === 0;
  const lowCalorieThreshold =
    typeof calorieTarget === "number" && calorieTarget > 0
      ? Math.max(600, Math.round(calorieTarget * 0.6))
      : 800;
  const isLowCalorieDay = totalCalories < lowCalorieThreshold;

  return {
    mealCount,
    totalKcal: totalCalories,
    totalCalories,
    totalProtein: nutrition.totalProteinGrams,
    totalCarbs: nutrition.totalCarbsGrams,
    totalFat: nutrition.totalFatGrams,
    hasVegetables: !isLikelyLiquidOnly && nutrition.hasVegetables,
    hasProtein: !isLikelyLiquidOnly && nutrition.hasProtein,
    mealTitles,
    mealTypesFilled: (data?.todayPlanMeals ?? [])
      .filter((slot) => (slot.meals?.length ?? 0) > 0)
      .map((slot) => slot.mealType),
    dishes,
    ingredientNames: [],
    isLowCalorieDay,
    isLikelyLiquidOnly,
    isIncompleteMenu:
      mealCount < 3 || isLowCalorieDay || isLikelyLiquidOnly
  };
}

type ProgressBoardProps = {
  data: HoyPageData | null;
  isLoading?: boolean;
  firstName?: string | null;
  className?: string;
};

export function ProgressBoard({
  data,
  isLoading = false,
  firstName = null,
  className
}: ProgressBoardProps) {
  const t = useTranslations("Hoy");
  const locale = parseAppLocale(useLocale());
  const {
    isPremium,
    isLoading: isPremiumLoading,
    userId,
    refresh: refreshPremium
  } = usePremium();
  const [streakOpen, setStreakOpen] = useState(false);
  const [doseOpen, setDoseOpen] = useState(false);
  const [coachTeaserOpen, setCoachTeaserOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [waterDrunk, setWaterDrunk] = useState(0);
  const [waterGoal, setWaterGoal] = useState<number | null>(null);

  const today = toISODateString(new Date());
  const premiumReady = isPremium && !isPremiumLoading;
  const planRevision = useMemo(() => buildPlanRevision(data), [data]);

  useEffect(() => {
    if (!userId) {
      setWaterDrunk(0);
      setWaterGoal(null);
      return;
    }

    let cancelled = false;

    const loadWater = async () => {
      try {
        const [goal, drunk] = await Promise.all([
          fetchWaterGlassesGoal(userId),
          fetchTodayWaterGlassesDrunk(userId)
        ]);
        if (cancelled) return;
        setWaterGoal(goal);
        setWaterDrunk(drunk);
      } catch (error) {
        console.error("[progress-board] Error cargando hidratación:", error);
        if (!cancelled) {
          setWaterGoal(null);
          setWaterDrunk(0);
        }
      }
    };

    void loadWater();

    const unsubscribe = subscribeWaterIntakeChanged((payload) => {
      if (payload.userId !== userId) return;
      if (typeof payload.glassesDrunk === "number") {
        setWaterDrunk(payload.glassesDrunk);
      }
      if (payload.goal !== undefined) {
        setWaterGoal(payload.goal);
      }
      // Si solo cambió la meta desde parámetros, refrescar también el conteo del día.
      if (payload.goal !== undefined && typeof payload.glassesDrunk !== "number") {
        void loadWater();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, doseOpen, data?.fetchedAt]);

  const waterStatus = useMemo(
    () => resolveWaterIntakeStatus(waterDrunk, waterGoal),
    [waterDrunk, waterGoal]
  );

  const {
    report: doseReport,
    context: doseContext,
    isLoading: isDoseLoading
  } = useIntelligentDose({
    enabled: premiumReady,
    userId,
    firstName,
    planRevision
  });

  const calorieTarget = doseContext?.nutritionGoals?.calorieTarget ?? null;
  const planSnapshot = useMemo(
    () => snapshotFromHoyPlan(data, calorieTarget),
    [data, calorieTarget]
  );

  const liveActivityDates = useMemo(
    () => (waterDrunk > 0 ? [today] : []),
    [waterDrunk, today]
  );
  const liveWeekCompletions = useMemo(
    () =>
      mergeActivityIntoCompletions(data?.weekCompletions ?? [], liveActivityDates),
    [data?.weekCompletions, liveActivityDates]
  );
  const liveStreakCompletions = useMemo(
    () =>
      mergeActivityIntoCompletions(
        data?.streakCompletions ?? data?.weekCompletions ?? [],
        liveActivityDates
      ),
    [data?.weekCompletions, data?.streakCompletions, liveActivityDates]
  );

  const weekConsistency = useMemo(
    () =>
      buildWeekConsistencyDays(liveWeekCompletions, today, liveStreakCompletions),
    [liveWeekCompletions, liveStreakCompletions, today]
  );

  const freeDailyTip = useMemo(() => {
    const tips = getBuiltinHealthyTips(locale);
    if (tips.length === 0) return "";
    const index = pickDailyTipIndex({ userId, tipsLength: tips.length, date: today });
    return tips[index]?.contenido ?? tips[0]?.contenido ?? "";
  }, [locale, userId, today]);

  // Misma fuente de verdad que IntelligentDoseModal: context completo cuando existe.
  const doseBalance = useMemo(() => {
    const live = doseContext?.mealsPlannedToday ?? planSnapshot;
    if (!live || live.mealCount <= 0) return null;
    return computeDayBalanceLevel(live, {
      calorieTarget:
        doseContext?.nutritionGoals?.calorieTarget ?? undefined
    });
  }, [doseContext, planSnapshot]);

  // Evita flash del tip free: skeleton hasta saber el plan y, si es Premium, hasta la dosis.
  const awaitingPremiumStatus = isPremiumLoading;
  const awaitingPremiumDose =
    Boolean(isPremium && !isPremiumLoading) && isDoseLoading && !doseReport && !planSnapshot;
  const showSkeleton =
    (isLoading && !data) || awaitingPremiumStatus || awaitingPremiumDose;

  const streakDays = useMemo(
    () => getCurrentStreakDateSet(liveStreakCompletions, today).size,
    [liveStreakCompletions, today]
  );
  const activeDaysThisWeek = useMemo(
    () => weekConsistency.filter((day) => day.active && day.isoDate <= today).length,
    [weekConsistency, today]
  );

  const previewHeadline =
    doseReport?.highlight?.trim() ||
    doseReport?.previewHeadline ||
    (t.has("smartDoseEmpty")
      ? t("smartDoseEmpty")
      : "Planifica tus comidas de hoy para recibir tu balance y consejos personalizados");

  const streakMotivation =
    streakDays === 0
      ? t.has("streakCardMotivateStart")
        ? t("streakCardMotivateStart")
        : "Un vaso, una comida, un escaneo o un reto: enciende tu racha."
      : t.has("streakCardMotivateKeep")
        ? t("streakCardMotivateKeep", { count: streakDays })
        : `¡Vas genial! Llevas ${streakDays} días cuidándote.`;

  const doseScore = doseBalance?.score ?? (premiumReady ? 0 : 0);
  const doseLabel =
    doseScore >= 80 ? "Excelente" : doseScore >= 55 ? "Buen ritmo" : doseScore > 0 ? "Mejorable" : "Sin datos";
  const hasProteinOk = Boolean(
    planSnapshot?.hasProtein || doseContext?.mealsPlannedToday?.hasProtein
  );
  const hasFiberOk = Boolean(
    planSnapshot?.hasVegetables || doseContext?.mealsPlannedToday?.hasVegetables
  );

  const handleDoseCardClick = () => {
    if (premiumReady) {
      setDoseOpen(true);
      return;
    }
    setCoachTeaserOpen(true);
  };

  return (
    <>
      <section className={cn(className)}>
        {showSkeleton ? (
          <HoyProgressBoardSkeleton showSectionLabel={false} />
        ) : (
          <div className="grid grid-cols-2 items-stretch rounded-[22px] border border-stone-100/80 bg-white shadow-sm shadow-stone-200/40">
            {/* —— Racha —— */}
            <button
              type="button"
              onClick={() => setStreakOpen(true)}
              data-onboarding="hoy-streak"
              className="flex min-w-0 flex-col gap-1 px-3.5 py-3 text-left transition hover:opacity-90 sm:px-4 sm:py-3.5"
            >
              <p className="flex items-center gap-1 text-[12px] font-semibold text-stone-800">
                <span aria-hidden>🔥</span>
                {t("streak")}
              </p>
              <p className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-[24px] font-bold tabular-nums leading-none text-stone-800 sm:text-[26px]">
                  {streakDays}
                </span>
                <span className="text-[11px] font-medium text-stone-600">
                  {streakDays === 1 ? "día seguido" : "días seguidos"}
                </span>
              </p>
              <p className="text-[10px] leading-snug text-stone-500">
                {streakMotivation.replace(/🔥/g, "").trim()}
              </p>
              <ConsistencyDotsWeek days={weekConsistency} />
            </button>

            {/* —— Dosis —— */}
            <button
              type="button"
              onClick={handleDoseCardClick}
              data-onboarding="hoy-dose"
              className="flex min-w-0 flex-col gap-1 border-l border-stone-100 px-3.5 py-3 text-left transition hover:opacity-90 sm:px-4 sm:py-3.5"
            >
              <p className="flex items-center gap-1 text-[12px] font-semibold text-stone-800">
                <span className="shrink-0" aria-hidden>
                  🥦
                </span>
                <span className="truncate">
                  {t.has("smartDoseTitle")
                    ? t("smartDoseTitle").replace(/👑/g, "").trim()
                    : "Dosis nutricional"}
                </span>
              </p>

              {premiumReady && doseBalance ? (
                <>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="flex items-baseline tabular-nums leading-none">
                        <span className="text-[22px] font-bold text-stone-900 sm:text-[24px]">
                          {doseScore}
                        </span>
                        <span className="text-[11px] font-semibold text-stone-400">
                          /100
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[#FDF3E3] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[#C27803]">
                        {doseLabel}
                      </span>
                    </div>
                    <DoseRing score={doseScore} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] leading-none text-stone-600">
                      Proteína
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none",
                          hasProteinOk
                            ? "bg-[#E8F0E4] text-[#3E5A3A]"
                            : "bg-stone-100 text-stone-500"
                        )}
                      >
                        {hasProteinOk ? "Bien" : "Baja"}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] leading-none text-stone-600">
                      Fibra
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none",
                          hasFiberOk
                            ? "bg-[#E8F0E4] text-[#3E5A3A]"
                            : "bg-stone-100 text-stone-500"
                        )}
                      >
                        {hasFiberOk ? "Perfecto" : "Baja"}
                      </span>
                    </span>
                  </div>

                  {waterStatus ? <WaterDoseIndicator status={waterStatus} className="mt-0" /> : null}
                </>
              ) : (
                <p className="line-clamp-2 flex-1 text-[10px] leading-snug text-stone-500">
                  💡{" "}
                  {(freeDailyTip || previewHeadline.replace(/✨/g, "").trim()).replace(
                    /^💡\s*/,
                    ""
                  )}
                </p>
              )}

              <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[10px] font-semibold text-[#3E5A3A]">
                <svg
                  viewBox="0 0 16 16"
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M2.5 12.5V8.5M5.5 12.5V6M8.5 12.5V9M11.5 12.5V4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 3.5h3v3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 3.5 9 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Ver informe
              </span>
            </button>
          </div>
        )}
      </section>

      <StreakCalendarModal
        open={streakOpen}
        onClose={() => setStreakOpen(false)}
        streakDays={streakDays}
        activeDaysThisWeek={activeDaysThisWeek}
        weekDays={weekConsistency}
      />

      <IntelligentDoseModal
        open={doseOpen && premiumReady}
        onClose={() => setDoseOpen(false)}
        report={doseReport}
        context={doseContext}
        firstName={firstName}
        isLoading={isDoseLoading}
        waterStatus={waterStatus}
      />

      <NutritionCoachTeaserModal
        open={coachTeaserOpen}
        onClose={() => setCoachTeaserOpen(false)}
        onActivated={() => {
          setCoachTeaserOpen(false);
          void refreshPremium();
          setDoseOpen(true);
        }}
        onFallbackUnlock={() => {
          setCoachTeaserOpen(false);
          setPaywallOpen(true);
        }}
      />

      <PremiumUpgradeDialog
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUpgraded={() => {
          setPaywallOpen(false);
          void refreshPremium();
        }}
        featureLabel={
          t.has("intelligentDosePaywallFeature")
            ? t("intelligentDosePaywallFeature")
            : "Desbloquea tu coach de nutrición"
        }
      />
    </>
  );
}

/** @deprecated Usa ProgressBoard */
export const WeeklyHealthScore = ProgressBoard;
