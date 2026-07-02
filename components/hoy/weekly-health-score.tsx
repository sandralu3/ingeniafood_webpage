"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Flame, Loader2, Sparkles, Target } from "lucide-react";
import {
  fetchHealthScore,
  fetchTodayCompletedChallengeIds
} from "@/lib/gamification/challenge-service";
import {
  DEFAULT_DAILY_CHALLENGES,
  WEEKLY_HEALTH_SCORE_MAX
} from "@/lib/gamification/challenges";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type WeeklyHealthScoreProps = {
  refreshKey?: number;
  maxScore?: number;
  label?: string;
  className?: string;
};

export function WeeklyHealthScore({
  refreshKey = 0,
  maxScore = WEEKLY_HEALTH_SCORE_MAX,
  label = "Score Saludable Semanal",
  className
}: WeeklyHealthScoreProps) {
  const gradientId = `health-score-${useId().replace(/:/g, "")}`;
  const [score, setScore] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadScore = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setScore(0);
        setCompletedToday(0);
        return;
      }

      const [healthScore, completedIds] = await Promise.all([
        fetchHealthScore(user.id),
        fetchTodayCompletedChallengeIds(user.id)
      ]);

      setScore(healthScore);
      setCompletedToday(completedIds.length);
    } catch (error) {
      console.error("[weekly-health-score] Error cargando score:", error);
      setErrorMessage("No pudimos cargar tu score.");
      setScore(0);
      setCompletedToday(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadScore();
  }, [loadScore, refreshKey]);

  const safeMax = maxScore > 0 ? maxScore : WEEKLY_HEALTH_SCORE_MAX;
  const clamped = Math.min(Math.max(score, 0), safeMax);
  const percentage = Math.round((clamped / safeMax) * 100);
  const totalChallenges = DEFAULT_DAILY_CHALLENGES.length;

  const size = 118;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-neutral-100 bg-white px-5 py-5 shadow-xl shadow-stone-100/50",
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">{label}</p>

      <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4">
        <div className="space-y-3">
          <div>
            <p className="font-serif text-2xl font-semibold tracking-tight text-stone-900">
              Tu semana en marcha
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-500">
              {percentage >= 75
                ? "Ritmo excelente. Sigue así."
                : percentage >= 50
                  ? "Buen progreso. Completa los retos de hoy."
                  : "Cada hábito suma. Empieza con uno hoy."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-green-50 px-3 py-2.5">
              <div className="mb-1 flex items-center gap-1.5 text-green-700">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Logros</span>
              </div>
              <p className="text-lg font-bold text-green-800">
                {completedToday}/{totalChallenges}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 px-3 py-2.5">
              <div className="mb-1 flex items-center gap-1.5 text-amber-700">
                <Target className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Score</span>
              </div>
              <p className="text-lg font-bold text-amber-900">{clamped} pts</p>
            </div>

            <div className="col-span-2 rounded-2xl bg-orange-50 px-3 py-2.5">
              <div className="mb-1 flex items-center gap-1.5 text-orange-700">
                <Flame className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Energía</span>
              </div>
              <p className="text-sm font-semibold text-orange-900">{percentage}% de tu meta semanal</p>
            </div>
          </div>
        </div>

        <div className="relative flex h-[118px] w-[118px] shrink-0 items-center justify-center">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-[#556B2F]/60" />
          ) : (
            <>
              <svg width={size} height={size} className="-rotate-90" aria-hidden>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="#f5f5f4"
                  strokeWidth={stroke}
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                />
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#88ab75" />
                    <stop offset="100%" stopColor="#3e5219" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-serif text-2xl font-bold text-[#3e5219]">{percentage}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">
                  %
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-3 text-xs text-red-600">{errorMessage}</p>
      ) : null}
    </section>
  );
}
