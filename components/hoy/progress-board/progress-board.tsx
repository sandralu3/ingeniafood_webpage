"use client";

import { useCallback, useEffect, useState } from "react";
import { Droplets, Leaf, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";
import { ProgressBoardCard } from "@/components/hoy/progress-board/progress-board-card";
import {
  NutritionImpactModal,
  StreakCalendarModal,
  TodayAchievementsModal,
  WeeklyProgressModal
} from "@/components/hoy/progress-board/progress-board-modals";
import {
  ConsistencyDots,
  METRIC_DENOMINATOR_CLASS,
  METRIC_NUMBER_CLASS,
  MiniRingChart,
  MiniSemiArc,
  MiniSparkline,
  StreakBadge
} from "@/components/hoy/progress-board/progress-board-visuals";
import type { DailyChallenge } from "@/lib/gamification/challenges";
import {
  fetchActiveDailyChallengesForUser,
  fetchAllChallengesForUser,
  fetchCompletionsInRange,
  fetchTodayCompletedChallengeIds,
  fetchWeeklyHealthMetrics
} from "@/lib/gamification/challenge-service";
import { calculateNutritionImpact } from "@/lib/gamification/nutrition-impact";
import type { WeeklyHealthMetrics } from "@/lib/gamification/weekly-metrics";
import {
  buildDailyPointsHistory,
  buildWeekConsistencyDays
} from "@/lib/gamification/week-consistency";
import { getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
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

type ActiveModal = "today" | "weekly" | "streak" | "nutrition" | null;

type ProgressBoardProps = {
  refreshKey?: number;
  className?: string;
};

export function ProgressBoard({ refreshKey = 0, className }: ProgressBoardProps) {
  const [metrics, setMetrics] = useState<WeeklyHealthMetrics>(EMPTY_METRICS);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [dailyPoints, setDailyPoints] = useState<
    Array<{ label: string; points: number; isToday: boolean }>
  >([]);
  const [weekConsistency, setWeekConsistency] = useState(
    buildWeekConsistencyDays([])
  );
  const [nutrition, setNutrition] = useState({
    hydration: 0,
    vegetables: 0,
    protein: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const loadBoard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setMetrics(EMPTY_METRICS);
        setChallenges([]);
        setCompleted({});
        setDailyPoints([]);
        setWeekConsistency(buildWeekConsistencyDays([]));
        setNutrition({ hydration: 0, vegetables: 0, protein: 0 });
        return;
      }

      const today = toISODateString(new Date());
      const weekStart = toISODateString(getMondayOfWeek());

      const [
        weeklyMetrics,
        activeChallenges,
        allChallenges,
        completedIds,
        weekCompletions
      ] = await Promise.all([
        fetchWeeklyHealthMetrics(user.id),
        fetchActiveDailyChallengesForUser(user.id),
        fetchAllChallengesForUser(user.id),
        fetchTodayCompletedChallengeIds(user.id),
        fetchCompletionsInRange(user.id, weekStart, today)
      ]);

      setMetrics(weeklyMetrics);
      setChallenges(activeChallenges);
      setCompleted(Object.fromEntries(completedIds.map((id) => [id, true])));
      setDailyPoints(
        buildDailyPointsHistory({
          completions: weekCompletions,
          challenges: allChallenges,
          today
        })
      );
      setWeekConsistency(buildWeekConsistencyDays(weekCompletions, today));
      setNutrition(calculateNutritionImpact(activeChallenges, completedIds));
    } catch (error) {
      console.error("[progress-board] Error cargando tablero:", error);
      setErrorMessage("No pudimos cargar tu tablero de progreso.");
      setMetrics(EMPTY_METRICS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard, refreshKey]);

  const {
    earnedPoints,
    maxPoints,
    percentage,
    completedToday,
    totalActiveChallenges,
    streakDays
  } = metrics;

  return (
    <>
      <section className={cn("space-y-2", className)}>
        <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
          Tablero de progreso
        </p>

        {isLoading ? (
          <div className="flex h-28 items-center justify-center rounded-2xl border border-stone-100 bg-white shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-[#556B2F]/60" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <ProgressBoardCard
              title="Hoy: Logros"
              accentBarClass="bg-[#88ab75]"
              accentTextClass="text-[#4c6633]"
              icon={Sparkles}
              onClick={() => setActiveModal("today")}
            >
              <p className={METRIC_NUMBER_CLASS}>
                {completedToday}
                <span className={METRIC_DENOMINATOR_CLASS}>/{totalActiveChallenges}</span>
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-stone-500">Retos completados</p>
            </ProgressBoardCard>

            <ProgressBoardCard
              title="Progreso semanal"
              accentBarClass="bg-[#e8d9b8]"
              accentTextClass="text-amber-800/90"
              icon={Target}
              onClick={() => setActiveModal("weekly")}
            >
              <div className="flex items-end justify-between gap-1.5">
                <div>
                  <p className={METRIC_NUMBER_CLASS}>
                    {earnedPoints}
                    {maxPoints > 0 ? (
                      <span className={METRIC_DENOMINATOR_CLASS}>/{maxPoints}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-800/80">
                    PTS
                  </p>
                </div>
                <div className="relative flex items-center justify-center">
                  <MiniRingChart value={percentage} />
                  <span className="absolute text-[9px] font-bold text-[#3e5219]">{percentage}%</span>
                </div>
              </div>
              <MiniSparkline
                values={dailyPoints.map((day) => day.points)}
                className="mt-0.5 opacity-80"
              />
            </ProgressBoardCard>

            <ProgressBoardCard
              title="Racha"
              accentBarClass="bg-[#f0c9a8]"
              accentTextClass="text-orange-800/90"
              icon={TrendingUp}
              onClick={() => setActiveModal("streak")}
            >
              <StreakBadge days={streakDays} />
              <ConsistencyDots days={weekConsistency} className="mt-1.5" />
            </ProgressBoardCard>

            <ProgressBoardCard
              title="Impacto nutricional"
              accentBarClass="bg-[#b8ddd4]"
              accentTextClass="text-teal-800/90"
              icon={Leaf}
              onClick={() => setActiveModal("nutrition")}
            >
              <div className="flex items-end justify-between gap-0.5 px-0.5">
                <MiniSemiArc value={nutrition.hydration} color="#38bdf8" label="Agua" />
                <MiniSemiArc value={nutrition.vegetables} color="#34d399" label="Veg." />
                <MiniSemiArc value={nutrition.protein} color="#fbbf24" label="Prot." />
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-[9px] text-stone-400">
                <Droplets className="h-2.5 w-2.5" />
                Basado en tus retos de hoy
              </p>
            </ProgressBoardCard>
          </div>
        )}

        {errorMessage ? <p className="px-1 text-xs text-red-600">{errorMessage}</p> : null}
      </section>

      <TodayAchievementsModal
        open={activeModal === "today"}
        onClose={() => setActiveModal(null)}
        challenges={challenges}
        completed={completed}
      />

      <WeeklyProgressModal
        open={activeModal === "weekly"}
        onClose={() => setActiveModal(null)}
        earnedPoints={earnedPoints}
        maxPoints={maxPoints}
        percentage={percentage}
        dailyPoints={dailyPoints}
      />

      <StreakCalendarModal
        open={activeModal === "streak"}
        onClose={() => setActiveModal(null)}
        streakDays={streakDays}
        weekDays={weekConsistency}
      />

      <NutritionImpactModal
        open={activeModal === "nutrition"}
        onClose={() => setActiveModal(null)}
        hydration={nutrition.hydration}
        vegetables={nutrition.vegetables}
        protein={nutrition.protein}
      />
    </>
  );
}

/** @deprecated Usa ProgressBoard */
export const WeeklyHealthScore = ProgressBoard;
