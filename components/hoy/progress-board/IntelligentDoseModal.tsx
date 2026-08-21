"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Target, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  computeDayBalanceLevel,
  buildDoseSuggestedRecipe,
  extractIdeaFromActionText,
  inferIngredientsFromIdea,
  type DoseSuggestedRecipe
} from "@/lib/premium-stories/dose-suggested-recipe";
import type {
  IntelligentDoseReport,
  IntelligentDoseUserContext
} from "@/lib/premium-stories/intelligent-dose-context";
import { NutritionProfileCallout } from "@/components/hoy/progress-board/nutrition-profile-callout";
import { WaterDoseIndicator } from "@/components/hoy/progress-board/water-dose-indicator";
import { WeeklyNutritionReportEntry } from "@/components/hoy/weekly-nutrition-report-entry";
import type { WaterIntakeStatus } from "@/lib/hydration/water-status";
import {
  hasDoseSuggestionGenerated,
  markDoseSuggestionGenerated
} from "@/lib/premium-stories/dose-suggestion-generated";
import {
  getMondayOfWeek,
  getWeekDayFromDate,
  toISODateString
} from "@/lib/plan/week-utils";
import {
  savePendingPlanAssignment,
  saveScannerInitialMode
} from "@/lib/plan/plan-pending-assignment";
import { saveScannerGenerationSeed } from "@/lib/scanner/scanner-generation-seed";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";

type IntelligentDoseModalProps = {
  open: boolean;
  onClose: () => void;
  report: IntelligentDoseReport | null;
  context?: IntelligentDoseUserContext | null;
  firstName?: string | null;
  isLoading?: boolean;
  waterStatus?: WaterIntakeStatus | null;
  userId?: string | null;
};

function resolveSuggestedRecipe(
  report: IntelligentDoseReport,
  context: IntelligentDoseUserContext | null | undefined
): DoseSuggestedRecipe | null {
  if (report.suggestedRecipe) return report.suggestedRecipe;
  if (!context) {
    const idea = extractIdeaFromActionText(report.action);
    if (!idea) return null;
    return {
      idea,
      ingredients: inferIngredientsFromIdea(idea),
      planMealType: "Cena",
      recipeMealType: "cena"
    };
  }
  return buildDoseSuggestedRecipe(context.mealsPlannedToday);
}

function MacroChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-stone-100 bg-white px-2.5 py-1 text-[10px] font-semibold text-stone-600 shadow-sm shadow-stone-200/40">
      {label}
    </span>
  );
}

function RichDoseBody({ text }: { text: string }) {
  const parts = text.split(
    /(\d+[\d.,]*\s*(?:kcal|g)\b|prote[ií]na(?:s)?|vegetales?|verduras?|fibra|infusiones?|comida s[oó]lida)/gi
  );

  return (
    <p className="mt-1 text-[12px] leading-relaxed text-stone-600">
      {parts.map((part, index) => {
        if (!part) return null;
        const isKeyword =
          /^\d+[\d.,]*\s*(?:kcal|g)$/i.test(part) ||
          /^(prote[ií]na(?:s)?|vegetales?|verduras?|fibra|infusiones?|comida s[oó]lida)$/i.test(
            part
          );
        return isKeyword ? (
          <strong key={`${part}-${index}`} className="font-semibold text-stone-800">
            {part}
          </strong>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </p>
  );
}

function InsightCard({
  label,
  children,
  icon
}: {
  label: string;
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <li className="rounded-2xl border border-stone-100 bg-white p-3.5 shadow-sm shadow-stone-200/40">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
        {icon ? `${icon} ` : null}
        {label.replace(/^[🌟💡🎯☀️]\s*/, "")}
      </p>
      {children}
    </li>
  );
}

function DoseRingMini({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg className="h-11 w-11 -rotate-90" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#F5F0E8" strokeWidth="5" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="#F9A825"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-stone-800">
        {clamped}
      </span>
    </div>
  );
}

export function IntelligentDoseModal({
  open,
  onClose,
  report,
  context = null,
  firstName = null,
  isLoading = false,
  waterStatus = null,
  userId = null
}: IntelligentDoseModalProps) {
  const t = useTranslations("Hoy");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const balance = useMemo(() => {
    if (!context?.mealsPlannedToday) return null;
    return computeDayBalanceLevel(context.mealsPlannedToday, {
      calorieTarget: context.nutritionGoals?.calorieTarget
    });
  }, [context]);

  const macros = context?.mealsPlannedToday;
  const profileIncomplete = context?.nutritionGoals
    ? !context.nutritionGoals.isComplete
    : true;
  const dateKey = context?.dateKey ?? toISODateString(new Date());
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAlreadyGenerated(hasDoseSuggestionGenerated(dateKey));
  }, [open, dateKey]);

  if (!open) return null;

  const eyebrow = t.has("intelligentDoseEyebrow")
    ? t("intelligentDoseEyebrow")
    : "Tu coach de nutrición";
  const title = t.has("intelligentDoseTitle")
    ? t("intelligentDoseTitle")
    : "Tu análisis nutricional";
  const name = firstName?.trim().split(/\s+/).filter(Boolean)[0] || null;
  const description = name
    ? t.has("intelligentDoseGreeting")
      ? t("intelligentDoseGreeting", { name })
      : `¡Hola ${name}! Aquí tienes tu balance de hoy.`
    : t.has("intelligentDoseDescription")
      ? t("intelligentDoseDescription")
      : "Basado en tu plan y hábitos de hoy.";

  const balanceLabel =
    balance?.labelKey === "excellent"
      ? t.has("intelligentDoseBalanceExcellent")
        ? t("intelligentDoseBalanceExcellent")
        : "En excelente camino"
      : balance?.labelKey === "good"
        ? t.has("intelligentDoseBalanceGood")
          ? t("intelligentDoseBalanceGood")
          : "Buen ritmo"
        : t.has("intelligentDoseBalanceImprove")
          ? t("intelligentDoseBalanceImprove")
          : "Hay margen de mejora";

  const handleGenerateSuggested = () => {
    if (!report || alreadyGenerated) return;
    const suggestion = resolveSuggestedRecipe(report, context);
    if (!suggestion) return;

    const tomorrow = new Date();
    tomorrow.setHours(12, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayLabel = getWeekDayFromDate(tomorrow);
    const weekStartISO = toISODateString(getMondayOfWeek(tomorrow));

    markDoseSuggestionGenerated(dateKey);
    setAlreadyGenerated(true);

    savePendingPlanAssignment({
      dayLabel,
      mealType: suggestion.planMealType,
      weekStartISO
    });
    saveScannerInitialMode("pantry");
    saveScannerGenerationSeed({
      idea: suggestion.idea,
      ingredients: suggestion.ingredients,
      recipeMealType: suggestion.recipeMealType,
      autoGenerate: true,
      source: "intelligent-dose"
    });

    onClose();
    router.push(
      `${APP_ROUTES.scanner}?from=dose&auto=1&meal=${encodeURIComponent(suggestion.recipeMealType)}&idea=${encodeURIComponent(suggestion.idea.slice(0, 80))}`
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-stone-900/40 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intelligent-dose-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-[22px] border border-stone-100 bg-[#FFF8F1] shadow-2xl shadow-stone-300/40 sm:rounded-[22px]"
      >
        <div className="shrink-0 px-4 pt-0 pb-0">
          <SwipeToCloseHandle onClose={onClose} disabled={false} />
        </div>

        <div className="shrink-0 border-b border-stone-100/80 bg-white px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                {eyebrow}
              </p>
              <h2
                id="intelligent-dose-title"
                className="mt-1 font-serif text-xl font-semibold leading-tight text-stone-800"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-[11px] leading-snug text-stone-500">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              aria-label={tCommon("close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {balance ? (
            <div className="rounded-2xl border border-stone-100 bg-white p-3.5 shadow-sm shadow-stone-200/40">
              <div className="flex items-center gap-3">
                <DoseRingMini score={balance.score} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                    {t.has("intelligentDoseBalanceEyebrow")
                      ? t("intelligentDoseBalanceEyebrow")
                      : "Balance del día"}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-stone-800">
                    {balance.score}/100
                    <span className="ml-2 rounded-full bg-[#FDF3E3] px-2 py-0.5 text-[10px] font-bold text-[#8A6A1F]">
                      {balanceLabel}
                    </span>
                  </p>
                  {context?.nutritionGoals?.isComplete ? (
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      {t.has("intelligentDoseVsTarget")
                        ? t("intelligentDoseVsTarget", {
                            consumed: macros?.totalCalories ?? 0,
                            target: balance.calorieTarget
                          })
                        : `${macros?.totalCalories ?? 0} / ${balance.calorieTarget} kcal meta`}
                    </p>
                  ) : null}
                </div>
              </div>

              {balance.calorieWarning ? (
                <p className="mt-2.5 rounded-xl border border-stone-100 bg-stone-50 px-2.5 py-2 text-[10px] font-medium leading-snug text-stone-600">
                  {balance.calorieWarning === "low"
                    ? t.has("intelligentDoseCalorieWarnLow")
                      ? t("intelligentDoseCalorieWarnLow", {
                          target: balance.calorieTarget
                        })
                      : `Vas por debajo del 60% de tu meta (~${balance.calorieTarget} kcal). Suma comida sólida.`
                    : balance.calorieWarning === "below"
                      ? t.has("intelligentDoseCalorieWarnBelow")
                        ? t("intelligentDoseCalorieWarnBelow", {
                            consumed: macros?.totalCalories ?? 0,
                            target: balance.calorieTarget,
                            remaining: Math.max(
                              0,
                              balance.calorieTarget - (macros?.totalCalories ?? 0)
                            )
                          })
                        : `Estás por debajo de tu meta (~${macros?.totalCalories ?? 0} / ${balance.calorieTarget} kcal). Te faltan ~${Math.max(0, balance.calorieTarget - (macros?.totalCalories ?? 0))} kcal.`
                      : balance.calorieWarning === "above"
                        ? t.has("intelligentDoseCalorieWarnAbove")
                          ? t("intelligentDoseCalorieWarnAbove", {
                              consumed: macros?.totalCalories ?? 0,
                              target: balance.calorieTarget
                            })
                          : `Estás por encima de tu meta (~${macros?.totalCalories ?? 0} / ${balance.calorieTarget} kcal).`
                        : t.has("intelligentDoseCalorieWarnHigh")
                          ? t("intelligentDoseCalorieWarnHigh", {
                              target: balance.calorieTarget
                            })
                          : `Superaste el 130% de tu meta (~${balance.calorieTarget} kcal). Revisa porciones.`}
                </p>
              ) : null}
            </div>
          ) : null}

          {profileIncomplete ? (
            <NutritionProfileCallout variant="modal" onNavigate={onClose} />
          ) : null}

          {macros && macros.mealCount > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <MacroChip label={`🔥 ${macros.totalCalories} kcal`} />
              <MacroChip label={`🥩 ${macros.totalProtein}g Prot`} />
              {macros.totalCarbs > 0 ? (
                <MacroChip label={`${macros.totalCarbs}g Carb`} />
              ) : null}
              {macros.totalFat > 0 ? <MacroChip label={`${macros.totalFat}g Grasas`} /> : null}
            </div>
          ) : null}

          {waterStatus ? <WaterDoseIndicator status={waterStatus} variant="report" /> : null}

          {userId ? (
            <WeeklyNutritionReportEntry userId={userId} variant="cta" />
          ) : null}

          {isLoading && !report ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[11px] text-stone-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E5A3A]" />
              {t.has("smartDoseLoading") ? t("smartDoseLoading") : "Preparando tu dosis…"}
            </div>
          ) : null}

          {report && !report.hasPlanData ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-stone-200 bg-white px-3.5 py-4 text-center shadow-sm">
              <p className="text-[12px] leading-snug text-stone-600">{report.previewHeadline}</p>
              <Link
                href={APP_ROUTES.plan}
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl bg-[#3E5A3A] px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-[#2D432A]"
              >
                {t.has("intelligentDoseAddMealsCta")
                  ? t("intelligentDoseAddMealsCta")
                  : "Añadir comidas al Plan"}
              </Link>
            </div>
          ) : null}

          {report?.hasPlanData ? (
            <ul className="space-y-2.5">
              <InsightCard
                icon="☀️"
                label={
                  t.has("intelligentDoseHighlightFriendly")
                    ? t("intelligentDoseHighlightFriendly")
                    : "Tu estrella de hoy"
                }
              >
                <RichDoseBody text={report.highlight} />
              </InsightCard>
              <InsightCard
                icon="💡"
                label={
                  t.has("intelligentDoseImproveFriendly")
                    ? t("intelligentDoseImproveFriendly")
                    : "Oportunidad para crecer"
                }
              >
                <RichDoseBody text={report.improve} />
              </InsightCard>
              <InsightCard
                icon="🎯"
                label={
                  t.has("intelligentDoseActionFriendly")
                    ? t("intelligentDoseActionFriendly")
                    : "Tu reto para mañana"
                }
              >
                <RichDoseBody text={report.action} />
                {resolveSuggestedRecipe(report, context) ? (
                  alreadyGenerated ? (
                    <p className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-[10px] font-semibold text-stone-600">
                      <Check className="h-3 w-3 text-[#3E5A3A]" />
                      {t.has("intelligentDoseGenerateDone")
                        ? t("intelligentDoseGenerateDone")
                        : "Ya generaste la receta sugerida para mañana"}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateSuggested}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#3E5A3A] px-3.5 py-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#2D432A]"
                    >
                      <Target className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {t.has("intelligentDoseGenerateCta")
                        ? t("intelligentDoseGenerateCta").replace(/✨/g, "").trim()
                        : "Generar receta sugerida para mañana"}
                    </button>
                  )
                ) : null}
              </InsightCard>
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
