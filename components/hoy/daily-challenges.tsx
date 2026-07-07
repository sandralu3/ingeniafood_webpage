"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Target } from "lucide-react";
import {
  completeDailyChallenge,
  fetchActiveDailyChallengesForUser,
  fetchTodayCompletedChallengeIds,
  uncompleteDailyChallenge
} from "@/lib/gamification/challenge-service";
import type { DailyChallenge } from "@/lib/gamification/challenges";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type DailyChallengesProps = {
  onHealthScoreChange?: () => void;
  className?: string;
};

export function DailyChallenges({ onHealthScoreChange, className }: DailyChallengesProps) {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
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
        setChallenges([]);
        setCompleted({});
        return;
      }

      setUserId(user.id);

      const [activeChallenges, completedIds] = await Promise.all([
        fetchActiveDailyChallengesForUser(user.id),
        fetchTodayCompletedChallengeIds(user.id)
      ]);

      setChallenges(activeChallenges);
      setCompleted(Object.fromEntries(completedIds.map((id) => [id, true])));
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
      if (nextDone) {
        await completeDailyChallenge({
          userId,
          retoId: challenge.id,
          points: challenge.points
        });
      } else {
        await uncompleteDailyChallenge({
          userId,
          retoId: challenge.id,
          points: challenge.points
        });
      }

      onHealthScoreChange?.();
    } catch (error) {
      console.error("[daily-challenges] Error guardando reto:", error);
      setCompleted((prev) => ({ ...prev, [challenge.id]: isDone }));
      setErrorMessage("No pudimos guardar el reto. Inténtalo de nuevo.");
    } finally {
      setPendingId(null);
    }
  };

  const completedCount = challenges.filter((challenge) => completed[challenge.id]).length;
  const pointsToday = challenges.reduce(
    (sum, challenge) => sum + (completed[challenge.id] ? challenge.points : 0),
    0
  );

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
            {isLoading
              ? "Cargando..."
              : challenges.length === 0
                ? "Sin retos activos"
                : `${completedCount} de ${challenges.length} completados`}
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

      {!isLoading && challenges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-200/80 bg-amber-50/40 px-4 py-6 text-center">
          <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#556B2F] shadow-sm">
            <Target className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-stone-800">Aún no tienes retos en Hoy</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Ve al módulo de Retos y activa los hábitos que quieras cumplir cada día.
          </p>
          <Link
            href={APP_ROUTES.retos}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#556B2F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4a5f28]"
          >
            Configurar mis retos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      {challenges.length > 0 ? (
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
                        isDone ? "line-through text-white/75" : "text-stone-800"
                      )}
                    >
                      {challenge.label}
                    </span>
                    {challenge.source === "custom" ? (
                      <span
                        className={cn(
                          "mt-0.5 block text-[10px] font-medium uppercase tracking-wide",
                          isDone ? "text-white/55" : "text-stone-400"
                        )}
                      >
                        Personalizada
                      </span>
                    ) : null}
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
      ) : null}

      {challenges.length > 0 ? (
        <Link
          href={APP_ROUTES.retos}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-stone-200/80 bg-stone-50/60 px-4 py-2.5 text-xs font-medium text-stone-500 transition hover:border-[#556B2F]/25 hover:text-[#3e5219]"
        >
          Gestionar retos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </section>
  );
}
