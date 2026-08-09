"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Droplets } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  fetchTodayWaterGlassesDrunk,
  fetchWaterGlassesGoal,
  nextGlassesDrunkAfterTap,
  setTodayWaterGlassesDrunk
} from "@/lib/hydration/water-intake";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

type Props = {
  userId: string | null;
};

function WaterGlassIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 40 56"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        d="M8 4h24l-2.4 44.5c-.2 3.2-2.8 5.5-6 5.5h-7.2c-3.2 0-5.8-2.3-6-5.5L8 4Z"
        fill={filled ? "#7EB8D4" : "#F8FAFB"}
        stroke={filled ? "#3D7A9A" : "#C9D3D8"}
        strokeWidth="2.25"
        strokeLinejoin="round"
      />
      {filled ? (
        <path
          d="M10.2 18h19.6l-1.5 28.2c-.1 1.9-1.7 3.3-3.6 3.3h-9.4c-1.9 0-3.5-1.4-3.6-3.3L10.2 18Z"
          fill="#4FA3C7"
          opacity="0.92"
        />
      ) : null}
      <path
        d="M7 4h26"
        stroke={filled ? "#3D7A9A" : "#B0BCC2"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {filled ? (
        <path
          d="M14 26c2.5 1.5 5 1.5 7.5 0s5-1.5 7.5 0"
          fill="none"
          stroke="#E8F6FC"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
      ) : null}
    </svg>
  );
}

export function WaterGlassesTracker({ userId }: Props) {
  const t = useTranslations("Hoy");
  const [goal, setGoal] = useState<number | null>(null);
  const [drunk, setDrunk] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setGoal(null);
      setDrunk(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [nextGoal, nextDrunk] = await Promise.all([
        fetchWaterGlassesGoal(userId),
        fetchTodayWaterGlassesDrunk(userId)
      ]);
      setGoal(nextGoal);
      setDrunk(nextGoal ? Math.min(nextDrunk, nextGoal) : 0);
    } catch (error) {
      console.error("[water-glasses-tracker] Error cargando hidratación:", error);
      setGoal(null);
      setDrunk(0);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTap = async (index: number) => {
    if (!userId || !goal || pendingIndex !== null) return;

    const previous = drunk;
    const next = nextGlassesDrunkAfterTap(drunk, index, goal);
    if (next === previous) return;

    setPendingIndex(index);
    setDrunk(next);

    const result = await setTodayWaterGlassesDrunk(userId, next, goal);
    if (!result.ok) {
      setDrunk(previous);
    } else {
      setDrunk(result.glassesDrunk);
    }
    setPendingIndex(null);
  };

  if (isLoading) {
    return (
      <div
        className="h-[4.75rem] animate-pulse rounded-[22px] bg-stone-100/80"
        aria-hidden
      />
    );
  }

  if (!userId) {
    return null;
  }

  if (!goal || goal < 1) {
    return (
      <section
        className="rounded-[22px] border border-dashed border-[#3D7A9A]/25 bg-gradient-to-br from-[#F3F9FC] to-white p-3.5 shadow-sm shadow-stone-200/40 sm:p-4"
        aria-label={t("waterTrackerTitle")}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F4F9] text-[#3D7A9A]">
            <Droplets className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-stone-800">
              {t.has("waterSetupTitle") ? t("waterSetupTitle") : "Agua de hoy"}
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-stone-500 sm:text-xs">
              {t.has("waterSetupHint")
                ? t("waterSetupHint")
                : "Configura cuántos vasos quieres beber al día para llevar el seguimiento aquí."}
            </p>
            <Link
              href={`${APP_ROUTES.parametros}#water-glasses`}
              className="mt-2.5 inline-flex items-center rounded-full bg-[#3D7A9A] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              {t.has("waterSetupCta") ? t("waterSetupCta") : "Configurar vasos de agua"}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-[22px] border border-stone-100/80 bg-white p-3.5 shadow-sm shadow-stone-200/50 sm:p-4"
      aria-label={t("waterTrackerTitle")}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8F0E4] text-[#3E5A3A]">
            <Droplets className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-stone-800">
              {t("waterTrackerTitle")}{" "}
              <span className="font-medium tabular-nums text-stone-500">
                {t("waterTrackerProgress", { drunk, goal })}
              </span>
            </h2>
            <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
              {t("waterTrackerHint")}
            </p>
          </div>
        </div>
        <Link
          href={`${APP_ROUTES.parametros}#water-glasses`}
          className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-[#3E5A3A] transition hover:bg-[#E8F0E4] hover:underline"
          aria-label={t("waterEditAria")}
        >
          {t("edit")}
        </Link>
      </div>

      <div
        className="flex w-full items-end gap-0.5"
        role="group"
        aria-label={t("waterTrackerProgress", { drunk, goal })}
      >
        {Array.from({ length: goal }, (_, index) => {
          const filled = index < drunk;
          return (
            <button
              key={`glass-${index}`}
              type="button"
              onClick={() => void handleTap(index)}
              disabled={pendingIndex !== null}
              aria-pressed={filled}
              aria-label={
                filled
                  ? t("waterGlassFilledAria", { n: index + 1 })
                  : t("waterGlassEmptyAria", { n: index + 1 })
              }
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-end rounded-md bg-transparent py-0.5 transition active:scale-95 disabled:opacity-70",
                "hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4FA3C7]/35"
              )}
            >
              <WaterGlassIcon
                filled={filled}
                className={cn(
                  "h-6 w-full max-w-[22px] transition duration-200",
                  filled ? "drop-shadow-sm" : "opacity-90"
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
