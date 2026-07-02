"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  completeDailyChallenge,
  fetchTodayCompletedChallengeIds,
  uncompleteDailyChallenge
} from "@/lib/gamification/challenge-service";
import {
  DEFAULT_DAILY_CHALLENGES,
  type DailyChallenge
} from "@/lib/gamification/challenges";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type DailyChallengesProps = {
  challenges?: DailyChallenge[];
  onHealthScoreChange?: (score: number) => void;
  className?: string;
};

export function DailyChallenges({
  challenges = DEFAULT_DAILY_CHALLENGES,
  onHealthScoreChange,
  className
}: DailyChallengesProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadTodayChallenges = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setCompleted({});
        return;
      }

      setUserId(user.id);
      const completedIds = await fetchTodayCompletedChallengeIds(user.id);
      const map = Object.fromEntries(completedIds.map((id) => [id, true]));
      setCompleted(map);
    } catch (error) {
      console.error("[daily-challenges] Error cargando retos:", error);
      setErrorMessage("No pudimos cargar tus retos de hoy.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTodayChallenges();
  }, [loadTodayChallenges]);

  const toggleChallenge = async (challenge: DailyChallenge) => {
    if (!userId || pendingId) return;

    const isDone = Boolean(completed[challenge.id]);
    const nextDone = !isDone;

    setPendingId(challenge.id);
    setErrorMessage(null);
    setCompleted((prev) => ({ ...prev, [challenge.id]: nextDone }));

    try {
      const newScore = nextDone
        ? await completeDailyChallenge({
            userId,
            retoId: challenge.id,
            points: challenge.points
          })
        : await uncompleteDailyChallenge({
            userId,
            retoId: challenge.id,
            points: challenge.points
          });

      onHealthScoreChange?.(newScore);
    } catch (error) {
      console.error("[daily-challenges] Error guardando reto:", error);
      setCompleted((prev) => ({ ...prev, [challenge.id]: isDone }));
      setErrorMessage("No pudimos guardar el reto. Inténtalo de nuevo.");
    } finally {
      setPendingId(null);
    }
  };

  const completedCount = challenges.filter((c) => completed[c.id]).length;
  const pointsToday = challenges.reduce((sum, c) => sum + (completed[c.id] ? c.points : 0), 0);

  return (
    <section
      className={cn(
        "rounded-3xl border border-neutral-100 bg-white/90 px-4 py-5 shadow-xl shadow-stone-100/50 backdrop-blur-sm",
        className
      )}
    >
      <div className="mb-4 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-900">Retos del día</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {isLoading ? "Cargando..." : `${completedCount} de ${challenges.length} completados`}
          </p>
        </div>
        <span className="rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900 shadow-sm">
          +{pointsToday} pts
        </span>
      </div>

      {errorMessage ? (
        <p role="alert" className="mb-3 rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <ul className="space-y-2.5">
        {challenges.map((challenge) => {
          const isDone = Boolean(completed[challenge.id]);
          const isPending = pendingId === challenge.id;

          return (
            <li key={challenge.id}>
              <button
                type="button"
                onClick={() => void toggleChallenge(challenge)}
                disabled={isLoading || !userId || Boolean(pendingId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3.5 text-left transition-all duration-300",
                  isDone
                    ? "border-[#556B2F]/25 bg-gradient-to-r from-[#556B2F] via-[#6b8a3e] to-[#7a9a47] shadow-lg shadow-[#556B2F]/20"
                    : "border-neutral-100 bg-stone-50/80 hover:border-amber-200/60 hover:bg-white hover:shadow-md",
                  (!userId || pendingId) && "opacity-80"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isDone
                      ? "scale-110 border-white/90 bg-white text-[#556B2F] shadow-sm"
                      : "border-stone-300 bg-white text-transparent"
                  )}
                  aria-hidden
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
                  ) : (
                    <Check
                      className={cn(
                        "h-4 w-4 transition-all duration-300",
                        isDone ? "scale-100 opacity-100" : "scale-50 opacity-0"
                      )}
                      strokeWidth={3}
                    />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-semibold transition-all duration-300",
                      isDone
                        ? "line-through text-white/75"
                        : "text-stone-800"
                    )}
                  >
                    {challenge.label}
                  </span>
                </span>

                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    isDone ? "bg-white/20 text-white" : "bg-amber-50 text-amber-800"
                  )}
                >
                  +{challenge.points}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
