"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
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
import type { DailyChallenge } from "@/lib/gamification/challenges";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
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
        "rounded-2xl border border-neutral-100 bg-white/90 px-3.5 py-3.5 shadow-md shadow-stone-100/40 backdrop-blur-sm",
        className
      )}
    >
      <div className="mb-2.5 flex items-end justify-between gap-3 px-0.5">
        <div>
          <h2 className="font-serif text-base font-semibold text-stone-900">Retos del día</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {showSkeleton
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

      {showSkeleton ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#556B2F]/60" />
        </div>
      ) : null}

      {!showSkeleton && challenges.length === 0 ? (
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
        <ul className="space-y-1.5">
          {challenges.map((challenge) => {
            const isDone = Boolean(completed[challenge.id]);
            const isPending = pendingId === challenge.id;
            const isFocused = focusedChallengeId === challenge.id;
            const ChallengeIcon = resolveChallengeIcon(challenge.label);

            return (
              <li key={challenge.id} className="group relative">
                <button
                  type="button"
                  onClick={() => void toggleChallenge(challenge)}
                  disabled={showSkeleton || !userId || Boolean(pendingId)}
                  className={cn(
                    "relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2 pr-14 text-left transition-all duration-300",
                    isDone
                      ? "border-[#556B2F]/25 bg-gradient-to-r from-[#556B2F] via-[#6b8a3e] to-[#7a9a47] shadow-lg shadow-[#556B2F]/15"
                      : "border-neutral-100 bg-stone-50/80 hover:-translate-y-0.5 hover:border-amber-200/70 hover:bg-white hover:shadow-md",
                    (!userId || pendingId) && "opacity-80"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isDone
                        ? "scale-105 border-white/90 bg-white text-[#556B2F] shadow-sm"
                        : "border-stone-300 bg-white text-[#556B2F]/70"
                    )}
                    aria-hidden
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#556B2F]" />
                    ) : isDone ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : (
                      <ChallengeIcon className="h-3 w-3" strokeWidth={2} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[13px] font-semibold leading-tight transition-all duration-300",
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
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors",
                      isDone ? "bg-white/20 text-white" : "bg-amber-50 text-amber-800"
                    )}
                  >
                    +{challenge.points}
                  </span>
                </button>

                <div
                  className={cn(
                    "absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 transition-all duration-200",
                    isFocused
                      ? "opacity-100"
                      : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                  )}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFocusedChallengeId((current) =>
                        current === challenge.id ? null : challenge.id
                      );
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-200/80 bg-white/95 text-stone-500 shadow-sm transition hover:border-[#556B2F]/30 hover:text-[#556B2F]"
                    aria-label={`Detalles del reto: ${challenge.label}`}
                    title="Detalles del reto"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    href={APP_ROUTES.retos}
                    onClick={(event) => event.stopPropagation()}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-200/80 bg-white/95 text-stone-500 shadow-sm transition hover:border-amber-300 hover:text-amber-700"
                    aria-label="Gestionar retos"
                    title="Gestionar retos"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {isFocused ? (
                  <p className="mt-1 rounded-lg bg-stone-100/90 px-2.5 py-1.5 text-[10px] leading-relaxed text-stone-600">
                    Marca este hábito al completarlo hoy. Suma{" "}
                    <span className="font-semibold text-[#556B2F]">+{challenge.points} pts</span> a
                    tu progreso semanal.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {challenges.length > 0 ? (
        <Link
          href={APP_ROUTES.retos}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200/80 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-500 transition hover:border-[#556B2F]/25 hover:text-[#3e5219]"
        >
          Gestionar retos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </section>
  );
}
