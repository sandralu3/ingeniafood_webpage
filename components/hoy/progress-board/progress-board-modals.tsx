"use client";

import Link from "next/link";
import { Check, Plus, UtensilsCrossed, X } from "lucide-react";
import type { DailyChallenge } from "@/lib/gamification/challenges";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

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
            aria-label="Cerrar"
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
  const completedCount = challenges.filter((challenge) => completed[challenge.id]).length;

  return (
    <HoyDetailModal
      open={open}
      onClose={onClose}
      eyebrow="Hoy"
      title="Logros del día"
      description={`${completedCount} de ${challenges.length} retos completados hoy.`}
    >
      <ul className="space-y-2">
        {challenges.map((challenge) => {
          const isDone = Boolean(completed[challenge.id]);

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
                  {challenge.label}
                </p>
                <p className="text-[10px] text-stone-400">
                  {isDone ? "Completado" : "Pendiente"} · +{challenge.points} pts
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
          Añadir comida
        </Link>
        <Link
          href={APP_ROUTES.retos}
          onClick={onClose}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-[#556B2F]/30 hover:text-[#3e5219]"
        >
          <Plus className="h-4 w-4" />
          Gestionar retos
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
  const maxDaily = Math.max(...dailyPoints.map((day) => day.points), 1);

  return (
    <HoyDetailModal
      open={open}
      onClose={onClose}
      eyebrow="Semana"
      title="Progreso semanal"
      description={`Llevas ${earnedPoints}${maxPoints > 0 ? ` de ${maxPoints}` : ""} puntos (${percentage}% de tu meta).`}
    >
      <div className="mb-4 rounded-2xl bg-amber-50/80 px-4 py-3">
        <p className="text-2xl font-bold text-amber-900">
          {earnedPoints}
          {maxPoints > 0 ? (
            <span className="text-base font-semibold text-amber-700/80">/{maxPoints}</span>
          ) : null}
          <span className="ml-1 text-sm font-semibold text-amber-700/80">PTS</span>
        </p>
        <p className="mt-1 text-xs text-amber-800/80">{percentage}% de la meta semanal alcanzada</p>
      </div>

      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
        Histórico de puntos
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
  weekDays: Array<{ label: string; isoDate: string; completed: boolean; isToday: boolean }>;
};

export function StreakCalendarModal({
  open,
  onClose,
  streakDays,
  weekDays
}: StreakCalendarModalProps) {
  return (
    <HoyDetailModal
      open={open}
      onClose={onClose}
      eyebrow="Racha"
      title="Calendario de consistencia"
      description={
        streakDays > 0
          ? `Vas ${streakDays} día${streakDays === 1 ? "" : "s"} seguidos cumpliendo al menos un reto.`
          : "Completa un reto hoy para empezar tu racha."
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3">
        <p className="font-serif text-3xl font-bold text-orange-900">{streakDays}</p>
        <p className="text-sm text-orange-800/90">
          día{streakDays === 1 ? "" : "s"} de racha activa
        </p>
      </div>

      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
        Esta semana
      </p>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div
            key={day.isoDate}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border px-1 py-2",
              day.completed
                ? "border-orange-200 bg-orange-50"
                : "border-stone-100 bg-stone-50/80",
              day.isToday && "ring-2 ring-[#556B2F]/20"
            )}
          >
            <span className="text-[10px] font-semibold uppercase text-stone-400">{day.label}</span>
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
                day.completed
                  ? "bg-orange-500 text-white"
                  : "bg-white text-stone-300"
              )}
            >
              {day.completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : "·"}
            </span>
          </div>
        ))}
      </div>
    </HoyDetailModal>
  );
}

type NutritionImpactModalProps = {
  open: boolean;
  onClose: () => void;
  hydration: number;
  vegetables: number;
  protein: number;
};

export function NutritionImpactModal({
  open,
  onClose,
  hydration,
  vegetables,
  protein
}: NutritionImpactModalProps) {
  const metrics = [
    {
      key: "hydration",
      label: "Hidratación / Agua",
      value: hydration,
      color: "bg-sky-400",
      tip: "Beber suficiente agua mejora tu energía y digestión."
    },
    {
      key: "vegetables",
      label: "Vegetales",
      value: vegetables,
      color: "bg-emerald-400",
      tip: "Añadir vegetales a tus comidas aporta fibra y micronutrientes."
    },
    {
      key: "protein",
      label: "Proteínas",
      value: protein,
      color: "bg-amber-400",
      tip: "La proteína en el desayuno ayuda a mantener la saciedad."
    }
  ] as const;

  return (
    <HoyDetailModal
      open={open}
      onClose={onClose}
      eyebrow="Nutrición"
      title="Impacto nutricional de hoy"
      description="Estimación basada en los retos activos que has completado hoy."
    >
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
