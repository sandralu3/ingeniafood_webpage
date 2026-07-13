"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Droplets,
  Footprints,
  Info,
  Leaf,
  Loader2,
  ScanLine,
  Target,
  UtensilsCrossed
} from "lucide-react";
import {
  completeDailyChallenge,
  uncompleteDailyChallenge
} from "@/lib/gamification/challenge-service";
import { getChallengeImportanceMessage } from "@/lib/gamification/challenge-importance";
import type { DailyChallenge } from "@/lib/gamification/challenges";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { ChallengeRowSkeleton } from "@/components/skeletons/hoy-dashboard-skeleton";
import { cn } from "@/lib/utils";

type DailyChallengesProps = {
  userId: string | null;
  challenges: DailyChallenge[];
  completedIds: string[];
  isLoading?: boolean;
  onDataChange?: () => void;
  className?: string;
};

function resolveChallengeIcon(label: string) {
  const normalized = label.toLowerCase();

  if (/agua|hidrat/i.test(normalized)) return Droplets;
  if (/camin|pausa activa/i.test(normalized)) return Footprints;
  if (/vegetal|verdura/i.test(normalized)) return Leaf;
  if (/escane/i.test(normalized)) return ScanLine;
  if (/cocin|comida casera|desayun|proteín/i.test(normalized)) return UtensilsCrossed;

  return Target;
}

export function DailyChallenges({
  userId,
  challenges,
  completedIds,
  isLoading = false,
  onDataChange,
  className
}: DailyChallengesProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedChallengeId, setFocusedChallengeId] = useState<string | null>(null);

  useEffect(() => {
    setCompleted(Object.fromEntries(completedIds.map((id) => [id, true])));
  }, [completedIds]);

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

      onDataChange?.();
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
  const showSkeleton = isLoading && challenges.length === 0;

  return (
    <section
      className={cn(
        "rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30",
        className
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="font-serif text-sm font-semibold text-stone-900">Retos del día</h2>
            {!showSkeleton && challenges.length > 0 ? (
              <span className="text-[11px] text-stone-500">
                {completedCount}/{challenges.length}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {challenges.length > 0 ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
              +{pointsToday} pts
            </span>
          ) : null}
          <Link
            href={APP_ROUTES.retos}
            className="text-[10px] font-semibold text-[#556B2F] transition hover:text-[#3e5219]"
          >
            Editar
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <p role="alert" className="mb-2 rounded-xl bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {showSkeleton ? (
        <ul className="space-y-1" aria-hidden>
          {Array.from({ length: 5 }).map((_, index) => (
            <ChallengeRowSkeleton key={index} />
          ))}
        </ul>
      ) : null}

      {!showSkeleton && challenges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-200/80 bg-amber-50/40 px-3 py-4 text-center">
          <p className="text-xs font-semibold text-stone-800">Aún no tienes retos en Hoy</p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Activa hábitos en el módulo de Retos.
          </p>
          <Link
            href={APP_ROUTES.retos}
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#556B2F] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#4a5f28]"
          >
            Configurar
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}

      {challenges.length > 0 ? (
        <ul className="space-y-1">
          {challenges.map((challenge) => {
            const isDone = Boolean(completed[challenge.id]);
            const isPending = pendingId === challenge.id;
            const isFocused = focusedChallengeId === challenge.id;
            const ChallengeIcon = resolveChallengeIcon(challenge.label);

            return (
              <li
                key={challenge.id}
                className={cn(
                  "rounded-lg px-2 py-1.5",
                  isDone ? "bg-[#eef4e6]/80" : "bg-stone-50/70"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void toggleChallenge(challenge)}
                    disabled={showSkeleton || !userId || Boolean(pendingId)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 text-left",
                      (!userId || pendingId) && "opacity-80"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                        isDone
                          ? "border-[#556B2F]/20 bg-[#556B2F] text-white"
                          : "border-stone-200 bg-white text-[#556B2F]/75"
                      )}
                      aria-hidden
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isDone ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : (
                        <ChallengeIcon className="h-2.5 w-2.5" strokeWidth={2} />
                      )}
                    </span>

                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-xs font-medium",
                        isDone ? "text-[#3e5219]/65 line-through" : "text-stone-800"
                      )}
                    >
                      {challenge.label}
                      {challenge.source === "custom" ? (
                        <span className="ml-1 text-[9px] font-semibold uppercase text-stone-400">
                          · Propio
                        </span>
                      ) : null}
                    </span>

                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-bold tabular-nums",
                        isDone ? "text-[#556B2F]/70" : "text-amber-800"
                      )}
                    >
                      +{challenge.points}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFocusedChallengeId((current) =>
                        current === challenge.id ? null : challenge.id
                      )
                    }
                    className={cn(
                      "shrink-0 rounded-full p-1 transition-colors",
                      isFocused
                        ? "bg-white text-[#556B2F]"
                        : "text-stone-400 hover:text-[#556B2F]"
                    )}
                    aria-label={`Por qué importa: ${challenge.label}`}
                    aria-expanded={isFocused}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>

                {isFocused ? (
                  <p className="mt-1.5 rounded-md bg-white/75 px-2 py-1.5 text-[10px] leading-snug text-stone-600">
                    {getChallengeImportanceMessage(challenge)}{" "}
                    <span className="font-semibold text-[#556B2F]">+{challenge.points} pts</span> hoy.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
