"use client";

import { useState } from "react";
import { ArrowRight, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { WeeklyNutritionReportModal } from "@/components/hoy/weekly-nutrition-report-modal";
import { useWeeklyNutritionReport } from "@/hooks/use-weekly-nutrition-report";
import { cn } from "@/lib/utils";

type Props = {
  userId: string | null | undefined;
  /** Lunes de la semana (p. ej. la del Plan). */
  weekStart?: Date | null;
  className?: string;
  /**
   * pill — compacto (Plan)
   * icon — solo icono (cabecera estrecha)
   * card — bloque con leyenda
   * cta — botón de acción (dosis / modales)
   */
  variant?: "card" | "pill" | "cta" | "icon";
};

export function WeeklyNutritionReportEntry({
  userId,
  weekStart = null,
  className,
  variant = "card"
}: Props) {
  const t = useTranslations("Hoy");
  const [open, setOpen] = useState(false);
  const { report, isLoading, error, refresh } = useWeeklyNutritionReport({
    userId,
    weekStart
  });

  if (!userId) return null;

  const label = t.has("weeklyReportOpen")
    ? t("weeklyReportOpen")
    : "Informe semanal";

  const openReport = () => {
    setOpen(true);
    void refresh();
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={openReport}
          aria-label={label}
          title={label}
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#556B2F]/25 bg-[#eef4e6] text-[#3e5219] transition hover:bg-[#e0ebd4]",
            className
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      ) : variant === "pill" ? (
        <button
          type="button"
          onClick={openReport}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#556B2F]/25 bg-[#eef4e6] px-2.5 py-1 text-[11px] font-bold text-[#3e5219] transition hover:bg-[#e0ebd4]",
            className
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" strokeWidth={2.25} />
          {label}
        </button>
      ) : variant === "cta" ? (
        <button
          type="button"
          onClick={openReport}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl bg-[#3E5A3A] px-3.5 py-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#2D432A] active:scale-[0.99]",
            className
          )}
        >
          <BarChart3 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          {label}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} />
        </button>
      ) : (
        <button
          type="button"
          onClick={openReport}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border border-[#556B2F]/15 bg-gradient-to-r from-[#F0F4ED] to-white px-3.5 py-3 text-left shadow-sm shadow-stone-100/40 transition hover:border-[#556B2F]/30",
            className
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#556B2F] text-white shadow-sm">
            <BarChart3 className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-[#3E5A3A]">{label}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-stone-500">
              {t.has("weeklyReportCardHint")
                ? t("weeklyReportCardHint")
                : "Revisa calorías, proteínas y consejos para tus objetivos"}
            </span>
          </span>
        </button>
      )}

      <WeeklyNutritionReportModal
        open={open}
        onClose={() => setOpen(false)}
        report={report}
        isLoading={isLoading}
        error={error}
      />
    </>
  );
}
