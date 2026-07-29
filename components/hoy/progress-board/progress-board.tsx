"use client";

import { useMemo, useState } from "react";
import { Crown, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ProgressBoardCard } from "@/components/hoy/progress-board/progress-board-card";
import { IntelligentDoseModal } from "@/components/hoy/progress-board/IntelligentDoseModal";
import { HoyProgressBoardSkeleton } from "@/components/skeletons/hoy-dashboard-skeleton";
import { StreakCalendarModal } from "@/components/hoy/progress-board/progress-board-modals";
import { StreakCardBody } from "@/components/hoy/progress-board/progress-board-visuals";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { HoySectionHeader } from "@/components/hoy/hoy-section-header";
import { useIntelligentDose } from "@/hooks/use-intelligent-dose";
import { usePremium } from "@/hooks/use-premium";
import { getBuiltinHealthyTips } from "@/lib/content/builtin-tips";
import { pickDailyTipIndex } from "@/lib/content/daily-tip";
import type { HoyPageData } from "@/lib/gamification/hoy-page-data";
import type { WeeklyHealthMetrics } from "@/lib/gamification/weekly-metrics";
import { buildWeekConsistencyDays } from "@/lib/gamification/week-consistency";
import { computeDayBalanceLevel } from "@/lib/premium-stories/dose-suggested-recipe";
import { parseAppLocale } from "@/i18n/config";
import { toISODateString } from "@/lib/plan/week-utils";
import { cn } from "@/lib/utils";

const EMPTY_METRICS: WeeklyHealthMetrics = {
  earnedPoints: 0,
  maxPoints: 0,
  percentage: 0,
  completedToday: 0,
  totalActiveChallenges: 0,
  streakDays: 0,
  activeDaysThisWeek: 0
};

/** Altura compartida: par simétrico compacto. */
const BOARD_CARD_CLASS = "h-full min-h-[9rem] self-stretch";

type ProgressBoardProps = {
  data: HoyPageData | null;
  isLoading?: boolean;
  firstName?: string | null;
  className?: string;
};

function DoseScoreBadge({
  score,
  labelKey,
  emoji,
  excellentLabel,
  goodLabel,
  improveLabel
}: {
  score: number;
  labelKey: "excellent" | "good" | "improve";
  emoji: string;
  excellentLabel: string;
  goodLabel: string;
  improveLabel: string;
}) {
  const status =
    labelKey === "excellent" ? excellentLabel : labelKey === "good" ? goodLabel : improveLabel;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none",
        labelKey === "excellent"
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
          : labelKey === "good"
            ? "bg-amber-50 text-amber-900 ring-1 ring-amber-100"
            : "bg-rose-50 text-rose-800 ring-1 ring-rose-100"
      )}
    >
      <span className="tabular-nums">
        {score}/100 {score >= 80 ? "🌟" : emoji}
      </span>
      <span className="max-w-[4.5rem] truncate font-semibold sm:max-w-none">{status}</span>
    </span>
  );
}

/** Chips conceptuales (sin kcal: esas viven en Menú de hoy). */
function DoseConceptChips({
  hasProtein,
  hasVegetables,
  proteinLabel,
  fiberLabel
}: {
  hasProtein: boolean;
  hasVegetables: boolean;
  proteinLabel: string;
  fiberLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold ring-1",
          hasProtein
            ? "bg-[#556B2F]/10 text-[#3e5219] ring-[#556B2F]/20"
            : "bg-stone-50 text-stone-400 ring-stone-200/80"
        )}
      >
        {proteinLabel} 🥩
      </span>
      <span
        className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold ring-1",
          hasVegetables
            ? "bg-lime-50 text-lime-900 ring-lime-200/80"
            : "bg-stone-50 text-stone-400 ring-stone-200/80"
        )}
      >
        {fiberLabel} 🥗
      </span>
    </div>
  );
}

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
  const [paywallOpen, setPaywallOpen] = useState(false);

  const today = toISODateString(new Date());
  const metrics = data?.metrics ?? EMPTY_METRICS;
  const premiumReady = isPremium && !isPremiumLoading;

  const weekConsistency = useMemo(
    () =>
      buildWeekConsistencyDays(
        data?.weekCompletions ?? [],
        today,
        data?.streakCompletions ?? data?.weekCompletions ?? []
      ),
    [data?.weekCompletions, data?.streakCompletions, today]
  );

  const {
    report: doseReport,
    context: doseContext,
    isLoading: isDoseLoading
  } = useIntelligentDose({
    enabled: premiumReady,
    userId,
    firstName
  });

  const freeDailyTip = useMemo(() => {
    const tips = getBuiltinHealthyTips(locale);
    if (tips.length === 0) return "";
    const index = pickDailyTipIndex({ userId, tipsLength: tips.length, date: today });
    return tips[index]?.contenido ?? tips[0]?.contenido ?? "";
  }, [locale, userId, today]);

  const doseBalance = useMemo(() => {
    if (!doseContext?.mealsPlannedToday) return null;
    return computeDayBalanceLevel(doseContext.mealsPlannedToday, {
      calorieTarget: doseContext.nutritionGoals?.calorieTarget
    });
  }, [doseContext]);

  // Evita flash del tip free: skeleton hasta saber el plan y, si es Premium, hasta la dosis.
  const awaitingPremiumStatus = isPremiumLoading;
  const awaitingPremiumDose =
    Boolean(isPremium && !isPremiumLoading) && isDoseLoading && !doseReport;
  const showSkeleton =
    (isLoading && !data) || awaitingPremiumStatus || awaitingPremiumDose;

  const { streakDays, activeDaysThisWeek } = metrics;

  const streakTitle = `${t("streak")} 🔥`;
  // Siempre se identifica como Dosis nutricional; el contenido cambia por plan.
  const insightTitle = t.has("smartDoseTitle")
    ? t("smartDoseTitle")
    : "Dosis nutricional 👑";

  const freeDoseCta = t.has("smartDosePersonalizeCta")
    ? t("smartDosePersonalizeCta")
    : "✨ Personalizar este informe →";

  const hasPlanData = Boolean(doseReport?.hasPlanData);
  const previewHeadline =
    doseReport?.highlight?.trim() ||
    doseReport?.previewHeadline ||
    (t.has("smartDoseEmpty")
      ? t("smartDoseEmpty")
      : "Planifica tus comidas de hoy para recibir tu balance y consejos personalizados ✨");

  const todaySnapshot = doseContext?.mealsPlannedToday;

  const streakMotivation = useMemo(() => {
    const todayDot = weekConsistency.find((day) => day.isToday);
    if (streakDays === 0) {
      return t.has("streakCardMotivateStart")
        ? t("streakCardMotivateStart")
        : "Completa un hábito hoy y enciende tu racha 🔥";
    }
    if (todayDot && !todayDot.active) {
      return t.has("streakCardMotivateToday")
        ? t("streakCardMotivateToday")
        : "¡Hoy aún puedes sumar un día a tu racha!";
    }
    if (streakDays >= 7) {
      return t.has("streakCardMotivateHot")
        ? t("streakCardMotivateHot")
        : "¡Racha en llamas! Sigue con este ritmo 🔥";
    }
    return t.has("streakCardMotivateKeep")
      ? t("streakCardMotivateKeep", { count: streakDays })
      : `¡Vas genial! Llevas ${streakDays} días seguidos.`;
  }, [streakDays, t, weekConsistency]);

  const weekProgressLabel = t.has("streakWeekProgress")
    ? t("streakWeekProgress", { count: activeDaysThisWeek })
    : `${activeDaysThisWeek} activos esta semana`;

  const handleDoseCardClick = () => {
    if (premiumReady) {
      setDoseOpen(true);
      return;
    }
    setPaywallOpen(true);
  };

  return (
    <>
      <section className={cn("space-y-2", className)}>
        <HoySectionHeader title={t("progressBoard")} />

        {showSkeleton ? (
          <HoyProgressBoardSkeleton showSectionLabel={false} />
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 [grid-auto-rows:1fr]">
            <ProgressBoardCard
              title={streakTitle}
              accentBarClass="bg-[#f0c9a8]"
              accentTextClass="text-orange-800/90"
              icon={TrendingUp}
              className={BOARD_CARD_CLASS}
              onClick={() => setStreakOpen(true)}
            >
              <StreakCardBody
                days={streakDays}
                activeDaysThisWeek={activeDaysThisWeek}
                daysLabel={t("daysInARow", { count: streakDays })}
                weekDays={weekConsistency}
                motivation={streakMotivation}
                weekProgressLabel={weekProgressLabel}
              />
            </ProgressBoardCard>

            <ProgressBoardCard
              title={insightTitle}
              titleMeta={
                premiumReady && doseBalance ? (
                  <DoseScoreBadge
                    score={doseBalance.score}
                    labelKey={doseBalance.labelKey}
                    emoji={doseBalance.emoji}
                    excellentLabel={
                      t.has("intelligentDoseBalanceExcellent")
                        ? t("intelligentDoseBalanceExcellent")
                        : "Excelente"
                    }
                    goodLabel={
                      t.has("intelligentDoseBalanceGood")
                        ? t("intelligentDoseBalanceGood")
                        : "Buen ritmo"
                    }
                    improveLabel={
                      t.has("intelligentDoseBalanceImprove")
                        ? t("intelligentDoseBalanceImprove")
                        : "Mejorable"
                    }
                  />
                ) : null
              }
              accentBarClass={premiumReady ? "bg-[#d4c4a8]" : "bg-[#e8d9b8]"}
              accentTextClass={premiumReady ? "text-amber-900/90" : "text-amber-800/90"}
              icon={Crown}
              className={BOARD_CARD_CLASS}
              showChevron={!premiumReady}
              onClick={handleDoseCardClick}
            >
              {premiumReady ? (
                <div className="flex min-h-0 flex-1 flex-col justify-between gap-2">
                  <div className="space-y-1.5">
                    <p className="line-clamp-2 text-[10px] font-bold leading-snug text-stone-800">
                      {previewHeadline}
                    </p>
                    {hasPlanData && todaySnapshot ? (
                      <DoseConceptChips
                        hasProtein={todaySnapshot.hasProtein}
                        hasVegetables={todaySnapshot.hasVegetables}
                        proteinLabel={
                          t.has("intelligentDoseChipProtein")
                            ? t("intelligentDoseChipProtein")
                            : "Proteína"
                        }
                        fiberLabel={
                          t.has("intelligentDoseChipFiber")
                            ? t("intelligentDoseChipFiber")
                            : "Fibra"
                        }
                      />
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "mt-auto inline-flex w-fit max-w-full items-center rounded-full px-2 py-0.5 text-[9px] font-semibold leading-none transition",
                      hasPlanData
                        ? "bg-[#556B2F]/12 text-[#3e5219] ring-1 ring-[#556B2F]/20 group-hover:bg-[#556B2F]/18"
                        : "bg-amber-50 text-amber-900/80 ring-1 ring-amber-100"
                    )}
                  >
                    {hasPlanData
                      ? t.has("intelligentDoseCardCtaShort")
                        ? t("intelligentDoseCardCtaShort")
                        : "✨ Ver informe"
                      : t.has("intelligentDoseOpenCta")
                        ? t("intelligentDoseOpenCta")
                        : "Ver tu análisis →"}
                  </span>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 pr-3">
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-amber-800/70">
                      {t.has("tipOfDayTitle") ? t("tipOfDayTitle") : "Tip del día 💡"}
                    </p>
                    <p className="text-[10px] leading-snug text-stone-600">
                      {freeDailyTip ||
                        (t.has("smartDoseEmpty")
                          ? t("smartDoseEmpty")
                          : "Consejos personalizados con Premium.")}
                    </p>
                  </div>
                  <span className="mt-auto inline-flex w-fit max-w-full items-center rounded-full bg-[#556B2F]/10 px-2 py-0.5 text-[9px] font-semibold text-[#3e5219] ring-1 ring-[#556B2F]/15 transition group-hover:bg-[#556B2F]/16">
                    {freeDoseCta}
                  </span>
                </div>
              )}
            </ProgressBoardCard>
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
