"use client";

import { useTranslations } from "next-intl";
import {
  waterToneBadgeClass,
  waterToneBarClass,
  type WaterIntakeStatus
} from "@/lib/hydration/water-status";
import { cn } from "@/lib/utils";

type Props = {
  status: WaterIntakeStatus;
  /** compact = tarjeta Dosis; report = bloque del informe modal */
  variant?: "compact" | "report";
  className?: string;
};

function toneLabel(
  tone: WaterIntakeStatus["tone"],
  t: (key: string, values?: Record<string, string | number>) => string,
  has: (key: string) => boolean
): string {
  switch (tone) {
    case "perfect":
      return has("waterDosePerfect") ? t("waterDosePerfect") : "Meta";
    case "good":
      return has("waterDoseGood") ? t("waterDoseGood") : "Bien";
    case "low":
      return has("waterDoseLow") ? t("waterDoseLow") : "Baja";
    case "empty":
    default:
      return has("waterDoseEmpty") ? t("waterDoseEmpty") : "Pendiente";
  }
}

export function WaterDoseIndicator({ status, variant = "compact", className }: Props) {
  const t = useTranslations("Hoy");
  const label = toneLabel(status.tone, t, t.has);
  const progressLabel = t.has("waterTrackerProgress")
    ? t("waterTrackerProgress", { drunk: status.drunk, goal: status.goal })
    : `${status.drunk}/${status.goal}`;

  if (variant === "report") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-stone-100 bg-white p-3 shadow-sm shadow-stone-200/40",
          className
        )}
        aria-label={`${t.has("waterDoseLabel") ? t("waterDoseLabel") : "Agua"} ${progressLabel}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
              {t.has("waterDoseLabel") ? t("waterDoseLabel") : "Hidratación"}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-stone-800">
              {progressLabel}
              <span className="ml-1.5 text-[11px] font-medium text-stone-500">
                {t.has("waterDoseGlasses") ? t("waterDoseGlasses") : "vasos"}
              </span>
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
              waterToneBadgeClass(status.tone)
            )}
          >
            {label}
          </span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div
            className={cn("h-full rounded-full transition-all duration-300", waterToneBarClass(status.tone))}
            style={{ width: `${Math.min(100, status.percent)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-stone-500">
          {status.tone === "perfect"
            ? t.has("waterDoseTipPerfect")
              ? t("waterDoseTipPerfect")
              : "¡Meta de agua cumplida hoy!"
            : t.has("waterDoseTipProgress")
              ? t("waterDoseTipProgress", {
                  remaining: Math.max(0, status.goal - status.drunk)
                })
              : `Te faltan ${Math.max(0, status.goal - status.drunk)} vasos para tu meta.`}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("mt-1.5 w-full", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1 text-[10px] text-stone-600">
          {t.has("waterDoseLabel") ? t("waterDoseLabel") : "Agua"}
          <span className="tabular-nums font-semibold text-stone-700">{progressLabel}</span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
            waterToneBadgeClass(status.tone)
          )}
        >
          {label}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone-100">
        <div
          className={cn("h-full rounded-full transition-all duration-300", waterToneBarClass(status.tone))}
          style={{ width: `${Math.min(100, status.percent)}%` }}
        />
      </div>
    </div>
  );
}
