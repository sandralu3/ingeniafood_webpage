"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, X } from "lucide-react";
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
import { hoySectionLabelClass } from "@/components/hoy/hoy-section-header";
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

type IntelligentDoseModalProps = {
  open: boolean;
  onClose: () => void;
  report: IntelligentDoseReport | null;
  context?: IntelligentDoseUserContext | null;
  firstName?: string | null;
  isLoading?: boolean;
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
    <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-600 shadow-sm ring-1 ring-stone-200/80">
      {label}
    </span>
  );
}

/** Resalta kcal, macros y palabras clave alimentarias. */
function RichDoseBody({ text }: { text: string }) {
  const parts = text.split(
    /(\d+[\d.,]*\s*(?:kcal|g)\b|prote[ií]na(?:s)?|vegetales?|verduras?|fibra|infusiones?|comida s[oó]lida)/gi
  );

  return (
    <p className="mt-1 text-[11px] leading-snug text-stone-600">
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
  emphasized = false
}: {
  label: string;
  children: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <li
      className={cn(
        "rounded-2xl border px-3 py-2.5",
        emphasized
          ? "border-[#556B2F]/20 bg-gradient-to-br from-[#F7FAF2] to-white"
          : "border-stone-100 bg-white/90"
      )}
    >
      <p className={cn(hoySectionLabelClass, emphasized && "text-[#7A8F5C]")}>{label}</p>
      {children}
    </li>
  );
}

export function IntelligentDoseModal({
  open,
  onClose,
  report,
  context = null,
  firstName = null,
  isLoading = false
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
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intelligent-dose-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-stone-100 bg-stone-50/95 shadow-2xl sm:rounded-3xl"
      >
        <div className="shrink-0 border-b border-stone-100 bg-white/90 px-4 py-3.5 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={hoySectionLabelClass}>{eyebrow}</p>
              <h2
                id="intelligent-dose-title"
                className="mt-1 text-lg font-bold leading-tight tracking-tight text-stone-800"
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

          {balance ? (
            <div
              className={cn(
                "mt-3 rounded-2xl px-3 py-2",
                balance.labelKey === "excellent"
                  ? "bg-emerald-50 ring-1 ring-emerald-100"
                  : balance.labelKey === "good"
                    ? "bg-amber-50 ring-1 ring-amber-100"
                    : "bg-rose-50 ring-1 ring-rose-100"
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={hoySectionLabelClass}>
                  {t.has("intelligentDoseBalanceEyebrow")
                    ? t("intelligentDoseBalanceEyebrow")
                    : "Balance del día"}
                </span>
                <span className="text-[11px] font-bold tabular-nums text-stone-800">
                  {t.has("intelligentDoseBalanceScore")
                    ? t("intelligentDoseBalanceScore", { score: balance.score })
                    : `Nivel de balance: ${balance.score}/100`}{" "}
                  {balance.score >= 80 ? "🌟" : balance.emoji}
                </span>
                <span className="text-[10px] font-semibold text-stone-600">
                  {balanceLabel} {balance.emoji}
                </span>
              </div>
              {context?.nutritionGoals?.isComplete ? (
                <p className="mt-1 text-[10px] font-medium text-stone-500">
                  {t.has("intelligentDoseVsTarget")
                    ? t("intelligentDoseVsTarget", {
                        consumed: macros?.totalCalories ?? 0,
                        target: balance.calorieTarget
                      })
                    : `${macros?.totalCalories ?? 0} / ${balance.calorieTarget} kcal meta`}
                </p>
              ) : null}
            </div>
          ) : null}

          {profileIncomplete ? (
            <NutritionProfileCallout variant="modal" onNavigate={onClose} />
          ) : null}

          {balance?.calorieWarning ? (
            <p
              className={cn(
                "mt-2 rounded-xl px-2.5 py-1.5 text-[10px] font-medium leading-snug",
                balance.calorieWarning === "low" || balance.calorieWarning === "below"
                  ? "bg-amber-50 text-amber-950 ring-1 ring-amber-100"
                  : "bg-rose-50 text-rose-900 ring-1 ring-rose-100"
              )}
            >
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

          {macros && macros.mealCount > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              <MacroChip label={`${macros.totalCalories} kcal 🔥`} />
              <MacroChip label={`${macros.totalProtein}g Prot 🥩`} />
              {macros.totalCarbs > 0 ? (
                <MacroChip label={`${macros.totalCarbs}g Carb`} />
              ) : null}
              {macros.totalFat > 0 ? <MacroChip label={`${macros.totalFat}g Grasas`} /> : null}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
          {isLoading && !report ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[11px] text-stone-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#556B2F]" />
              {t.has("smartDoseLoading") ? t("smartDoseLoading") : "Preparando tu dosis…"}
            </div>
          ) : null}

          {report && !report.hasPlanData ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-amber-200/80 bg-amber-50/50 px-3.5 py-4 text-center">
              <p className="text-[11px] leading-snug text-stone-600">{report.previewHeadline}</p>
              <Link
                href={APP_ROUTES.plan}
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full bg-[#556B2F] px-3.5 py-2 text-[11px] font-semibold text-white transition hover:brightness-105"
              >
                {t.has("intelligentDoseAddMealsCta")
                  ? t("intelligentDoseAddMealsCta")
                  : "Añadir comidas al Plan"}
              </Link>
            </div>
          ) : null}

          {report?.hasPlanData ? (
            <ul className="space-y-2">
              <InsightCard
                label={
                  t.has("intelligentDoseHighlightFriendly")
                    ? t("intelligentDoseHighlightFriendly")
                    : "🌟 Tu estrella de hoy"
                }
              >
                <RichDoseBody text={report.highlight} />
              </InsightCard>
              <InsightCard
                label={
                  t.has("intelligentDoseImproveFriendly")
                    ? t("intelligentDoseImproveFriendly")
                    : "💡 Oportunidad para crecer"
                }
              >
                <RichDoseBody text={report.improve} />
              </InsightCard>
              <InsightCard
                emphasized
                label={
                  t.has("intelligentDoseActionFriendly")
                    ? t("intelligentDoseActionFriendly")
                    : "🎯 Tu reto para mañana"
                }
              >
                <RichDoseBody text={report.action} />
                {resolveSuggestedRecipe(report, context) ? (
                  alreadyGenerated ? (
                    <p className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
                      <Check className="h-3 w-3" />
                      {t.has("intelligentDoseGenerateDone")
                        ? t("intelligentDoseGenerateDone")
                        : "Ya generaste la receta sugerida para mañana"}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateSuggested}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#556B2F] px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#3e5219]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {t.has("intelligentDoseGenerateCta")
                        ? t("intelligentDoseGenerateCta")
                        : "✨ Generar receta sugerida para mañana"}
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
