"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  translateChallengeImportance,
  translateChallengeLabel
} from "@/lib/gamification/challenge-i18n";
import type { DailyChallenge } from "@/lib/gamification/challenges";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { ChallengeRowSkeleton } from "@/components/skeletons/hoy-dashboard-skeleton";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

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

function ChallengeInfoButton({
  label,
  importance,
  open,
  onOpenChange
}: {
  label: string;
  importance: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onOpenChange]);

  return (
    <span className="relative inline-flex shrink-0" ref={panelRef}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(!open);
        }}
        className="ml-1.5 text-stone-400 transition hover:text-stone-600"
        aria-label={`Por qué importa: ${label}`}
        aria-expanded={open}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-1.5 w-52 -translate-x-1/2 rounded-xl border border-stone-100 bg-white px-2.5 py-2 text-[10px] font-normal leading-snug text-stone-600 shadow-md shadow-stone-200/60"
        >
          {importance}
        </span>
      ) : null}
    </span>
  );
}

export function DailyChallenges({
  userId,
  challenges,
  completedIds,
  isLoading = false,
  onDataChange,
  className
}: DailyChallengesProps) {
  const t = useTranslations("Hoy");
  const tRetos = useTranslations("Retos");
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoChallengeId, setInfoChallengeId] = useState<string | null>(null);

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
      setErrorMessage(t("saveChallengeError"));
    } finally {
      setPendingId(null);
    }
  };

  const completedCount = challenges.filter((challenge) => completed[challenge.id]).length;
  const showSkeleton = isLoading && challenges.length === 0;

  return (
    <section
      className={cn(
        "space-y-1 rounded-[22px] border border-stone-100/80 bg-white p-4 shadow-sm shadow-stone-200/50",
        className
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-stone-800">
          {t.has("dailyHabits") ? t("dailyHabits") : t("dailyChallenges")}{" "}
          {!showSkeleton && challenges.length > 0 ? (
            <span className="font-medium text-stone-500">
              {completedCount}/{challenges.length}
            </span>
          ) : null}
        </h2>
        <Link
          href={APP_ROUTES.retos}
          className="text-xs font-semibold text-[#3E5A3A] transition hover:underline"
        >
          {t("edit")}
        </Link>
      </div>

      {errorMessage ? (
        <p role="alert" className="rounded-xl bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {showSkeleton ? (
        <ul className="space-y-1" aria-hidden>
          {Array.from({ length: 4 }).map((_, index) => (
            <ChallengeRowSkeleton key={index} />
          ))}
        </ul>
      ) : null}

      {!showSkeleton && challenges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center">
          <p className="text-xs font-semibold text-stone-800">{t("noChallengesTitle")}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{t("noChallengesHint")}</p>
          <Link
            href={APP_ROUTES.retos}
            className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#3E5A3A] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#2D432A]"
          >
            {t("configure")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}

      {challenges.length > 0 ? (
        <ul>
          {challenges.map((challenge) => {
            const isDone = Boolean(completed[challenge.id]);
            const isPending = pendingId === challenge.id;
            const displayLabel = translateChallengeLabel(challenge, tRetos);
            const ChallengeIcon = resolveChallengeIcon(challenge.label);
            const importance = translateChallengeImportance(challenge, tRetos);

            return (
              <li
                key={challenge.id}
                className="flex items-center justify-between border-b border-stone-100 px-1 py-2 last:border-0"
              >
                <div className="flex min-w-0 flex-1 items-center">
                  <span
                    className={cn(
                      "mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      isDone
                        ? "bg-[#3E5A3A] text-white"
                        : "bg-stone-50 text-[#3E5A3A]/80"
                    )}
                    aria-hidden
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isDone ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : (
                      <ChallengeIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => void toggleChallenge(challenge)}
                    disabled={showSkeleton || !userId || Boolean(pendingId)}
                    className={cn(
                      "min-w-0 truncate text-left text-xs font-semibold text-stone-700",
                      isDone && "text-stone-400 line-through",
                      (!userId || pendingId) && "opacity-80"
                    )}
                  >
                    {displayLabel}
                  </button>

                  <ChallengeInfoButton
                    label={displayLabel}
                    importance={importance}
                    open={infoChallengeId === challenge.id}
                    onOpenChange={(next) =>
                      setInfoChallengeId(next ? challenge.id : null)
                    }
                  />

                  {challenge.source === "custom" ? (
                    <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-stone-400">
                      {t.has("customBadge") ? t("customBadge") : "Propio"}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => void toggleChallenge(challenge)}
                  disabled={showSkeleton || !userId || Boolean(pendingId)}
                  className={cn(
                    "ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isDone
                      ? "border-[#3E5A3A] bg-[#3E5A3A] text-white"
                      : "border-stone-300 bg-white hover:border-[#3E5A3A]"
                  )}
                  aria-label={
                    isDone ? `Desmarcar ${displayLabel}` : `Completar ${displayLabel}`
                  }
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  ) : isDone ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : null}
                </button>
              </li>
            );
          })}
          <li>
            <Link
              href={APP_ROUTES.retos}
              className="flex cursor-pointer items-center gap-3 py-2 text-xs font-medium text-stone-500 transition hover:text-stone-800"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-stone-300 text-stone-400">
                +
              </span>
              {t.has("addCustomChallenge")
                ? t("addCustomChallenge")
                : "Añadir un reto personalizado"}
            </Link>
          </li>
        </ul>
      ) : null}
    </section>
  );
}
