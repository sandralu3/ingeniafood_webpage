"use client";

import Link from "next/link";
import { Check, Plus, UtensilsCrossed, X } from "lucide-react";
import {
  translateChallengeLabel
} from "@/lib/gamification/challenge-i18n";
import type { DailyChallenge } from "@/lib/gamification/challenges";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type HoyDetailModalProps = {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

function HoyDetailModal({
  open,
  onClose,
  eyebrow,
  title,
  description,
  children
}: HoyDetailModalProps) {
  const tCommon = useTranslations("Common");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hoy-detail-modal-title"
        className="max-h-[88vh] w-full max-w-md overflow-hidden rounded-t-3xl border border-neutral-100 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
              {eyebrow}
            </p>
            <h2 id="hoy-detail-modal-title" className="mt-1 font-serif text-xl font-semibold text-stone-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-stone-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            aria-label={tCommon("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(88vh-5.5rem)] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

type TodayAchievementsModalProps = {
  open: boolean;
  onClose: () => void;
  challenges: DailyChallenge[];
  completed: Record<string, boolean>;
};

export function TodayAchievementsModal({
  open,
  onClose,
  challenges,
  completed
}: TodayAchievementsModalProps) {
  const t = useTranslations("Hoy");
  const tRetos = useTranslations("Retos");
  const tNav = useTranslations("Nav");
  const completedCount = challenges.filter((challenge) => completed[challenge.id]).length;

  return (
    <HoyDetailModal
      open={open}
      onClose={onClose}
      eyebrow={tNav("hoy")}
      title={t("achievementsTitle")}
      description={t("achievementsDescription", {
        completed: completedCount,
        total: challenges.length
      })}
    >
      <ul className="space-y-2">
        {challenges.map((challenge) => {
          const isDone = Boolean(completed[challenge.id]);
          const displayLabel = translateChallengeLabel(challenge, tRetos);

          return (
            <li
              key={challenge.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
                isDone
                  ? "border-[#556B2F]/20 bg-[#f4f7ed]"
                  : "border-stone-100 bg-stone-50/70"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                  isDone
                    ? "border-[#556B2F] bg-[#556B2F] text-white"
                    : "border-stone-300 bg-white text-transparent"
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isDone ? "text-[#3e5219]" : "text-stone-700"
                  )}
                >
                  {displayLabel}
                </p>
                <p className="text-[10px] text-stone-400">
                  {isDone ? t("completed") : t("pending")} · +{challenge.points} pts
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={APP_ROUTES.scanner}
          onClick={onClose}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a5f28]"
        >
          <UtensilsCrossed className="h-4 w-4" />
          {t("addMeal")}
        </Link>
        <Link
          href={APP_ROUTES.retos}
          onClick={onClose}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-[#556B2F]/30 hover:text-[#3e5219]"
        >
          <Plus className="h-4 w-4" />
          {t("manageChallenges")}
        </Link>
      </div>
    </HoyDetailModal>
  );
}

type WeeklyProgressModalProps = {
  open: boolean;
  onClose: () => void;
  earnedPoints: number;
  maxPoints: number;
  percentage: number;
  dailyPoints: Array<{ label: string; points: number; isToday: boolean }>;
};

export function WeeklyProgressModal({
  open,
  onClose,
  earnedPoints,
  maxPoints,
  percentage,
  dailyPoints
}: WeeklyProgressModalProps) {
  const t = useTranslations("Hoy");
  const maxDaily = Math.max(...dailyPoints.map((day) => day.points), 1);
  const ofMax = maxPoints > 0 ? t("weeklyProgressOfMax", { max: maxPoints }) : "";

  return (
    <HoyDetailModal
      open={open}
      onClose={onClose}
      eyebrow={t("weekEyebrow")}
      title={t("weeklyProgressTitle")}
      description={t("weeklyProgressDescription", {
        earned: earnedPoints,
        ofMax,
        percentage
      })}
    >
      <div className="mb-4 rounded-2xl bg-amber-50/80 px-4 py-3">
        <p className="text-2xl font-bold text-amber-900">
          {earnedPoints}
          {maxPoints > 0 ? (
            <span className="text-base font-semibold text-amber-700/80">/{maxPoints}</span>
          ) : null}
          <span className="ml-1 text-sm font-semibold text-amber-700/80">PTS</span>
        </p>
        <p className="mt-1 text-xs text-amber-800/80">
          {t("weeklyGoalReached", { percentage })}
        </p>
      </div>

      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
        {t("pointsHistory")}
      </p>
      <ul className="space-y-2">
        {dailyPoints.map((day) => (
          <li key={day.label} className="flex items-center gap-3">
            <span
              className={cn(
                "w-8 text-[11px] font-semibold uppercase",
                day.isToday ? "text-[#556B2F]" : "text-stone-400"
              )}
            >
              {day.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  day.isToday ? "bg-[#88ab75]" : "bg-amber-300"
                )}
                style={{ width: `${Math.max(8, (day.points / maxDaily) * 100)}%` }}
              />
            </div>
            <span className="w-10 text-right text-xs font-semibold text-stone-600">
              +{day.points}
            </span>
          </li>
        ))}
      </ul>
    </HoyDetailModal>
  );
}

type StreakCalendarModalProps = {
  open: boolean;
  onClose: () => void;
  streakDays: number;
  activeDaysThisWeek: number;
  weekDays: Array<{
    label: string;
    isoDate: string;
    active: boolean;
    inCurrentStreak: boolean;
    isToday: boolean;
  }>;
};

export function StreakCalendarModal({
  open,
  onClose,
  streakDays,
  activeDaysThisWeek,
  weekDays
}: StreakCalendarModalProps) {
  const t = useTranslations("Hoy");
  const daysLabel = t("daysInARow", { count: streakDays });

  return (
    <HoyDetailModal
      open={open}
      onClose={onClose}
      eyebrow={t("streakEyebrow")}
      title={t("streakCalendarTitle")}
      description={
        streakDays > 0
          ? t("streakDescription", { days: streakDays, daysLabel })
          : t("streakStartHint")
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3">
        <p className="font-serif text-3xl font-bold text-orange-900">{streakDays}</p>
        <div>
          <p className="text-sm text-orange-800/90">{daysLabel}</p>
          {activeDaysThisWeek > streakDays ? (
            <p className="text-xs text-orange-700/80">
              {t("activeDaysThisWeek", { count: activeDaysThisWeek })}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
        {t("thisWeek")}
      </p>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div
            key={day.isoDate}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border px-1 py-2",
              day.inCurrentStreak
                ? "border-orange-200 bg-orange-50"
                : day.active
                  ? "border-stone-200 bg-stone-50/80"
                  : "border-stone-100 bg-stone-50/80",
              day.isToday && day.inCurrentStreak && "ring-2 ring-[#556B2F]/20"
            )}
          >
            <span className="text-[10px] font-semibold uppercase text-stone-400">{day.label}</span>
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
                day.inCurrentStreak
                  ? "bg-orange-500 text-white"
                  : day.active
                    ? "bg-stone-300 text-white"
                    : "bg-white text-stone-300"
              )}
            >
              {day.active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : "·"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
        <span className="font-semibold text-orange-700">{t("streakLegendOrange")}</span>
        {t("streakLegendOrangePart")}{" "}
        <span className="font-semibold text-stone-600">{t("streakLegendGray")}</span>
        {t("streakLegendGrayPart")}
      </p>
    </HoyDetailModal>
  );
}

type NutritionImpactModalProps = {
  open: boolean;
  onClose: () => void;
  hydration: number;
  vegetables: number;
  protein: number;
  totalKcal?: number;
  planHasVegetables?: boolean;
  planHasProteinBreakfast?: boolean;
};

export function NutritionImpactModal({
  open,
  onClose,
  hydration,
  vegetables,
  protein,
  totalKcal = 0,
  planHasVegetables = false,
  planHasProteinBreakfast = false
}: NutritionImpactModalProps) {
  const t = useTranslations("Hoy");
  const metrics = [
    {
      key: "hydration",
      label: t("hydrationLabel"),
      value: hydration,
      color: "bg-sky-400",
      tip: t("hydrationTip")
    },
    {
      key: "vegetables",
      label: t("vegetablesLabel"),
      value: vegetables,
      color: "bg-emerald-400",
      tip: t("vegetablesTip")
    },
    {
      key: "protein",
      label: t("proteinImpactLabel"),
      value: protein,
      color: "bg-amber-400",
      tip: t("proteinImpactTip")
    }
  ] as const;

  return (
    <HoyDetailModal
      open={open}
      onClose={onClose}
      eyebrow={t("nutritionEyebrow")}
      title={t("nutritionTitle")}
      description={
        totalKcal > 0
          ? t("nutritionDescWithKcal", { kcal: totalKcal })
          : t("nutritionDescFallback")
      }
    >
      {totalKcal > 0 ? (
        <p className="mb-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs text-orange-900">
          {t("todayPlanKcalLabel")} <span className="font-bold">{totalKcal} kcal</span>
          {planHasVegetables ? t("includesVegetables") : ""}
          {planHasProteinBreakfast ? t("proteinBreakfastSuffix") : ""}
        </p>
      ) : null}
      <ul className="space-y-3">
        {metrics.map((metric) => (
          <li key={metric.key} className="rounded-2xl border border-stone-100 bg-stone-50/60 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-800">{metric.label}</p>
              <span className="text-sm font-bold text-stone-700">{metric.value}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-200/80">
              <div
                className={cn("h-full rounded-full transition-all duration-500", metric.color)}
                style={{ width: `${metric.value}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">{metric.tip}</p>
          </li>
        ))}
      </ul>
    </HoyDetailModal>
  );
}
