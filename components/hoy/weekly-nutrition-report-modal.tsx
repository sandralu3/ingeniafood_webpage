"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  X
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";
import type { WeeklyNutritionReport } from "@/lib/nutrition/weekly-nutrition-report";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  report: WeeklyNutritionReport | null;
  isLoading?: boolean;
  error?: string | null;
};

function MacroBar({
  label,
  value,
  target,
  unit,
  accentClass
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  accentClass: string;
}) {
  const ratio = target > 0 ? Math.min(1.35, value / target) : 0;
  const pct = Math.round(ratio * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-stone-600">{label}</span>
        <span className="text-[11px] font-bold text-stone-800">
          {value}
          {unit}
          <span className="font-medium text-stone-400"> / {target}{unit}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className={cn("h-full rounded-full transition-all duration-500", accentClass)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function DayDot({
  status
}: {
  status: WeeklyNutritionReport["dayBreakdown"][number]["calorieStatus"];
}) {
  const color =
    status === "on_target"
      ? "bg-[#556B2F]"
      : status === "low"
        ? "bg-amber-400"
        : status === "high"
          ? "bg-rose-400"
          : "bg-stone-200";
  return <span className={cn("h-2.5 w-2.5 rounded-full", color)} aria-hidden />;
}

export function WeeklyNutritionReportModal({
  open,
  onClose,
  report,
  isLoading = false,
  error = null
}: Props) {
  const t = useTranslations("Hoy");
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[180] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-[#F7F5F1] shadow-xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <SwipeToCloseHandle onClose={onClose} />
        <header className="flex items-start justify-between gap-3 border-b border-stone-200/70 px-5 pb-3 pt-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">
              {t.has("weeklyReportEyebrow") ? t("weeklyReportEyebrow") : "Informe semanal"}
            </p>
            <h2 id={titleId} className="mt-0.5 font-serif text-lg font-semibold text-stone-900">
              {t.has("weeklyReportTitle")
                ? t("weeklyReportTitle")
                : "Tu nutrición de la semana"}
            </h2>
            {report ? (
              <p className="mt-1 text-[11px] text-stone-500">
                {report.basis === "consumed"
                  ? t.has("weeklyReportBasisConsumed")
                    ? t("weeklyReportBasisConsumed")
                    : "Basado en platos marcados «Ya comí» y snacks"
                  : t.has("weeklyReportBasisPlanned")
                    ? t("weeklyReportBasisPlanned")
                    : "Basado en tu plan (marca «Ya comí» para afinar)"}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.has("close") ? t("close") : "Cerrar"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm ring-1 ring-stone-200/80 transition hover:text-stone-800"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-stone-500">
              <Loader2 className="h-6 w-6 animate-spin text-[#556B2F]" />
              <p className="text-xs">
                {t.has("weeklyReportLoading")
                  ? t("weeklyReportLoading")
                  : "Preparando tu informe…"}
              </p>
            </div>
          ) : null}

          {!isLoading && error ? (
            <p className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-3 text-xs text-rose-700">
              {error}
            </p>
          ) : null}

          {!isLoading && !error && report ? (
            <>
              <section className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm shadow-stone-100/50">
                <div className="mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#556B2F]" strokeWidth={2} />
                  <h3 className="text-sm font-bold text-stone-800">
                    {t.has("weeklyReportAverages")
                      ? t("weeklyReportAverages")
                      : "Media diaria (días con comidas)"}
                  </h3>
                </div>
                <div className="space-y-3">
                  <MacroBar
                    label={t.has("weeklyReportKcal") ? t("weeklyReportKcal") : "Calorías"}
                    value={report.avgDailyKcal}
                    target={report.calorieTarget}
                    unit=" kcal"
                    accentClass="bg-[#556B2F]"
                  />
                  <MacroBar
                    label={t.has("weeklyReportProtein") ? t("weeklyReportProtein") : "Proteínas"}
                    value={report.avgDailyProteinGrams}
                    target={report.proteinTarget}
                    unit=" g"
                    accentClass="bg-sky-600"
                  />
                  <MacroBar
                    label={t.has("weeklyReportCarbs") ? t("weeklyReportCarbs") : "Carbs"}
                    value={report.avgDailyCarbsGrams}
                    target={report.carbsTarget}
                    unit=" g"
                    accentClass="bg-amber-500"
                  />
                  <MacroBar
                    label={t.has("weeklyReportFat") ? t("weeklyReportFat") : "Grasas"}
                    value={report.avgDailyFatGrams}
                    target={report.fatTarget}
                    unit=" g"
                    accentClass="bg-violet-500"
                  />
                </div>
                <p className="mt-3 text-[10px] text-stone-400">
                  {t.has("weeklyReportDaysSummary")
                    ? t("weeklyReportDaysSummary", {
                        withMeals: report.daysWithMeals,
                        onTarget: report.daysOnCalorieTarget,
                        veg: report.daysWithVegetables,
                        protein: report.daysWithProtein
                      })
                    : `${report.daysWithMeals} días con comidas · ${report.daysOnCalorieTarget} en objetivo kcal · ${report.daysWithVegetables} con vegetales · ${report.daysWithProtein} con proteína`}
                </p>
              </section>

              <section className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm shadow-stone-100/50">
                <h3 className="mb-2.5 text-sm font-bold text-stone-800">
                  {t.has("weeklyReportByDay") ? t("weeklyReportByDay") : "Día a día"}
                </h3>
                <ul className="space-y-1.5">
                  {report.dayBreakdown.map((day) => (
                    <li
                      key={`${day.dayLabel}-${day.dateLabel}`}
                      className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-[11px]"
                    >
                      <span className="inline-flex items-center gap-2 font-semibold text-stone-700">
                        <DayDot status={day.calorieStatus} />
                        {day.dayLabel}
                        {day.isToday ? (
                          <span className="rounded-full bg-[#eef4e6] px-1.5 py-0.5 text-[9px] font-bold text-[#3e5219]">
                            {t.has("today") ? t("today") : "Hoy"}
                          </span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-stone-500">
                        {day.mealCount === 0
                          ? "—"
                          : `${day.kcal} kcal · ${day.proteinGrams}g prot.`}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-stone-400">
                  {t.has("weeklyReportLegend")
                    ? t("weeklyReportLegend")
                    : "Verde = en objetivo · Ámbar = bajo · Rosa = alto"}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-stone-800">
                  <Sparkles className="h-4 w-4 text-[#556B2F]" strokeWidth={2} />
                  {t.has("weeklyReportRecommendations")
                    ? t("weeklyReportRecommendations")
                    : "Recomendaciones"}
                </h3>
                <ul className="space-y-2">
                  {report.recommendations.map((rec) => {
                    const Icon =
                      rec.tone === "highlight"
                        ? CheckCircle2
                        : rec.tone === "improve"
                          ? Lightbulb
                          : Target;
                    const message = t.has(rec.messageKey)
                      ? t(rec.messageKey, rec.values)
                      : rec.messageKey;
                    return (
                      <li
                        key={rec.id}
                        className={cn(
                          "flex gap-2.5 rounded-2xl border px-3 py-2.5 text-[12px] leading-relaxed",
                          rec.tone === "highlight" &&
                            "border-[#556B2F]/15 bg-[#F0F4ED] text-[#3e5219]",
                          rec.tone === "improve" &&
                            "border-amber-100 bg-amber-50/80 text-amber-950",
                          rec.tone === "action" &&
                            "border-sky-100 bg-sky-50/80 text-sky-950"
                        )}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                        <span>{message}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <div className="flex flex-col gap-2 pb-2">
                {!report.goalsComplete ? (
                  <Link
                    href={APP_ROUTES.parametros}
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-full bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3e5219]"
                  >
                    {t.has("weeklyReportCtaGoals")
                      ? t("weeklyReportCtaGoals")
                      : "Configurar mis objetivos"}
                  </Link>
                ) : (
                  <Link
                    href={APP_ROUTES.plan}
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-full bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3e5219]"
                  >
                    {t.has("weeklyReportCtaPlan")
                      ? t("weeklyReportCtaPlan")
                      : "Ajustar el plan semanal"}
                  </Link>
                )}
                <Link
                  href={APP_ROUTES.scanner}
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-[#556B2F]/30 hover:text-[#3e5219]"
                >
                  {t.has("weeklyReportCtaScan")
                    ? t("weeklyReportCtaScan")
                    : "Generar una receta"}
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
