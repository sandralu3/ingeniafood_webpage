"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, Loader2, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { CustomChallengeModal } from "@/components/hoy/custom-challenge-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createCustomChallenge,
  deleteCustomChallenge,
  fetchConfigurableChallenges,
  setRetoActiveForHoy,
  setRetoWeekdaysForHoy,
  updateCustomChallenge
} from "@/lib/gamification/challenge-service";
import {
  translateChallengeLabel
} from "@/lib/gamification/challenge-i18n";
import {
  ALL_CHALLENGE_WEEK_DAYS,
  normalizeChallengeWeekDays,
  type ConfigurableChallenge
} from "@/lib/gamification/challenges";
import { clearHoyCache } from "@/lib/gamification/hoy-cache";
import { prefetchHoyPageData } from "@/lib/gamification/prefetch-hoy-page-data";
import { WEEK_DAYS, WEEK_DAY_SHORT, type WeekDay } from "@/lib/plan/constants";
import { getTodayWeekDay } from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

function invalidateHoyAfterRetosChange(userId: string) {
  clearHoyCache(userId);
  void prefetchHoyPageData({ userId, force: true });
}

type ChallengeModalState =
  | { mode: "create" }
  | { mode: "edit"; challenge: ConfigurableChallenge };

export function ChallengesConfigView() {
  const t = useTranslations("Retos");
  const tCommon = useTranslations("Common");
  const [challenges, setChallenges] = useState<ConfigurableChallenge[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [modalState, setModalState] = useState<ChallengeModalState | null>(null);
  const [isSavingChallenge, setIsSavingChallenge] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ConfigurableChallenge | null>(null);
  const [isDeletingChallenge, setIsDeletingChallenge] = useState(false);

  const loadChallenges = useCallback(async () => {
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
        return;
      }

      setUserId(user.id);
      const configurable = await fetchConfigurableChallenges(user.id);
      setChallenges(configurable);
    } catch (error) {
      console.error("[challenges-config] Error cargando retos:", error);
      setErrorMessage(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  const toggleActive = async (challenge: ConfigurableChallenge) => {
    if (!userId || pendingId) return;

    const nextActive = !challenge.isActive;
    setPendingId(challenge.id);
    setErrorMessage(null);
    setChallenges((prev) =>
      prev.map((item) =>
        item.id === challenge.id
          ? {
              ...item,
              isActive: nextActive,
              activeDays: nextActive
                ? normalizeChallengeWeekDays(item.activeDays)
                : item.activeDays
            }
          : item
      )
    );

    try {
      await setRetoActiveForHoy({
        userId,
        retoId: challenge.id,
        active: nextActive,
        days: nextActive ? normalizeChallengeWeekDays(challenge.activeDays) : undefined
      });
      invalidateHoyAfterRetosChange(userId);
    } catch (error) {
      console.error("[challenges-config] Error actualizando reto:", error);
      setChallenges((prev) =>
        prev.map((item) =>
          item.id === challenge.id ? { ...item, isActive: !nextActive } : item
        )
      );
      setErrorMessage(t("saveToggleError"));
    } finally {
      setPendingId(null);
    }
  };

  const toggleChallengeDay = async (challenge: ConfigurableChallenge, day: WeekDay) => {
    if (!userId || !challenge.isActive || pendingId) return;

    const current = normalizeChallengeWeekDays(challenge.activeDays);
    const isSelected = current.includes(day);
    const nextDays = normalizeChallengeWeekDays(
      isSelected ? current.filter((item) => item !== day) : [...current, day]
    );

    if (nextDays.length === 0) {
      setErrorMessage(t("minOneDayError"));
      return;
    }

    const previousDays = challenge.activeDays;
    setPendingId(challenge.id);
    setErrorMessage(null);
    setChallenges((prev) =>
      prev.map((item) =>
        item.id === challenge.id ? { ...item, activeDays: nextDays } : item
      )
    );

    try {
      const saved = await setRetoWeekdaysForHoy({
        userId,
        retoId: challenge.id,
        days: nextDays
      });
      setChallenges((prev) =>
        prev.map((item) =>
          item.id === challenge.id ? { ...item, activeDays: saved } : item
        )
      );
      invalidateHoyAfterRetosChange(userId);
    } catch (error) {
      console.error("[challenges-config] Error actualizando días del reto:", error);
      setChallenges((prev) =>
        prev.map((item) =>
          item.id === challenge.id ? { ...item, activeDays: previousDays } : item
        )
      );
      setErrorMessage(t("saveDaysError"));
    } finally {
      setPendingId(null);
    }
  };

  const setChallengeAllDays = async (challenge: ConfigurableChallenge) => {
    if (!userId || !challenge.isActive || pendingId) return;
    const nextDays = [...ALL_CHALLENGE_WEEK_DAYS];
    if (
      nextDays.length === challenge.activeDays.length &&
      nextDays.every((day) => challenge.activeDays.includes(day))
    ) {
      return;
    }

    const previousDays = challenge.activeDays;
    setPendingId(challenge.id);
    setErrorMessage(null);
    setChallenges((prev) =>
      prev.map((item) =>
        item.id === challenge.id ? { ...item, activeDays: nextDays } : item
      )
    );

    try {
      const saved = await setRetoWeekdaysForHoy({
        userId,
        retoId: challenge.id,
        days: nextDays
      });
      setChallenges((prev) =>
        prev.map((item) =>
          item.id === challenge.id ? { ...item, activeDays: saved } : item
        )
      );
      invalidateHoyAfterRetosChange(userId);
    } catch (error) {
      console.error("[challenges-config] Error activando todos los días:", error);
      setChallenges((prev) =>
        prev.map((item) =>
          item.id === challenge.id ? { ...item, activeDays: previousDays } : item
        )
      );
      setErrorMessage(t("saveDaysError"));
    } finally {
      setPendingId(null);
    }
  };

  const handleCreateChallenge = async (titulo: string) => {
    if (!userId) return;

    setIsSavingChallenge(true);
    setModalErrorMessage(null);

    try {
      const created = await createCustomChallenge({ userId, titulo });
      setChallenges((prev) => [
        ...prev,
        { ...created, isActive: true, activeDays: [...ALL_CHALLENGE_WEEK_DAYS] }
      ]);
      setModalState(null);
      invalidateHoyAfterRetosChange(userId);
    } catch (error) {
      console.error("[challenges-config] Error creando meta:", error);
      setModalErrorMessage(error instanceof Error ? error.message : t("createError"));
    } finally {
      setIsSavingChallenge(false);
    }
  };

  const handleEditChallenge = async (titulo: string) => {
    if (!userId || modalState?.mode !== "edit") return;

    const { challenge } = modalState;
    setIsSavingChallenge(true);
    setModalErrorMessage(null);

    try {
      const updated = await updateCustomChallenge({
        userId,
        id: challenge.id,
        titulo
      });

      setChallenges((prev) =>
        prev.map((item) =>
          item.id === challenge.id
            ? { ...item, label: updated.label, points: updated.points }
            : item
        )
      );
      setModalState(null);
      invalidateHoyAfterRetosChange(userId);
    } catch (error) {
      console.error("[challenges-config] Error editando meta:", error);
      setModalErrorMessage(error instanceof Error ? error.message : t("editError"));
    } finally {
      setIsSavingChallenge(false);
    }
  };

  const handleDeleteChallenge = async () => {
    if (!userId || !deleteTarget) return;

    setIsDeletingChallenge(true);
    setErrorMessage(null);

    try {
      await deleteCustomChallenge({ userId, id: deleteTarget.id });
      setChallenges((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      invalidateHoyAfterRetosChange(userId);
    } catch (error) {
      console.error("[challenges-config] Error eliminando meta:", error);
      setErrorMessage(error instanceof Error ? error.message : t("deleteError"));
    } finally {
      setIsDeletingChallenge(false);
    }
  };

  const todayWeekDay = getTodayWeekDay();
  const activeCount = challenges.filter(
    (challenge) =>
      challenge.isActive &&
      normalizeChallengeWeekDays(challenge.activeDays).includes(todayWeekDay)
  ).length;
  const systemChallenges = challenges.filter((challenge) => challenge.source === "system");
  const customChallenges = challenges.filter((challenge) => challenge.source === "custom");
  const deleteLabel = deleteTarget
    ? translateChallengeLabel(deleteTarget, t)
    : "";

  return (
    <>
      <div className="-mx-4 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-2 pt-1">
        <section className="space-y-3">
          <header className="px-0.5 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
              {t("eyebrow")}
            </p>
            <h1 className="mt-0.5 font-serif text-lg font-semibold text-stone-900">{t("title")}</h1>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">{t("subtitle")}</p>
          </header>

          <div className="rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef4e6] text-[#3e5219]">
                <Target className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-900">
                  {isLoading ? tCommon("loading") : t("activeCount", { count: activeCount })}
                </p>
                <p className="text-[11px] text-stone-500">{t("activeHint")}</p>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700"
            >
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
              {t("loading")}
            </div>
          ) : (
            <>
              <ChallengeSection
                title={t("systemTitle")}
                subtitle={t("systemSubtitle")}
                challenges={systemChallenges}
                pendingId={pendingId}
                disabled={!userId}
                onToggle={(challenge) => void toggleActive(challenge)}
                onToggleDay={(challenge, day) => void toggleChallengeDay(challenge, day)}
                onSetAllDays={(challenge) => void setChallengeAllDays(challenge)}
              />

              {customChallenges.length > 0 ? (
                <ChallengeSection
                  title={t("customTitle")}
                  subtitle={t("customSubtitle")}
                  challenges={customChallenges}
                  pendingId={pendingId}
                  disabled={!userId}
                  onToggle={(challenge) => void toggleActive(challenge)}
                  onToggleDay={(challenge, day) => void toggleChallengeDay(challenge, day)}
                  onSetAllDays={(challenge) => void setChallengeAllDays(challenge)}
                  onEdit={(challenge) => {
                    setModalErrorMessage(null);
                    setModalState({ mode: "edit", challenge });
                  }}
                  onDelete={(challenge) => setDeleteTarget(challenge)}
                />
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (!userId) {
                    setErrorMessage(t("loginToCreate"));
                    return;
                  }
                  setModalErrorMessage(null);
                  setModalState({ mode: "create" });
                }}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300/80 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-500 transition hover:border-[#556B2F]/30 hover:text-[#3e5219] disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("createCustom")}
              </button>
            </>
          )}
        </section>
      </div>

      <CustomChallengeModal
        open={modalState !== null}
        mode={modalState?.mode ?? "create"}
        initialTitulo={modalState?.mode === "edit" ? modalState.challenge.label : ""}
        isSaving={isSavingChallenge}
        errorMessage={modalErrorMessage}
        onClose={() => {
          if (isSavingChallenge) return;
          setModalState(null);
          setModalErrorMessage(null);
        }}
        onSubmit={(titulo) => {
          if (modalState?.mode === "edit") {
            void handleEditChallenge(titulo);
            return;
          }
          void handleCreateChallenge(titulo);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingChallenge) {
            setDeleteTarget(null);
          }
        }}
        title={t("deleteTitle")}
        description={
          deleteTarget
            ? t("deleteDescription", { label: deleteLabel })
            : undefined
        }
        confirmLabel={t("deleteConfirm")}
        cancelLabel={tCommon("cancel")}
        destructive
        isLoading={isDeletingChallenge}
        onConfirm={() => void handleDeleteChallenge()}
      />
    </>
  );
}

function ChallengeSection({
  title,
  subtitle,
  challenges,
  pendingId,
  disabled,
  onToggle,
  onToggleDay,
  onSetAllDays,
  onEdit,
  onDelete
}: {
  title: string;
  subtitle: string;
  challenges: ConfigurableChallenge[];
  pendingId: string | null;
  disabled: boolean;
  onToggle: (challenge: ConfigurableChallenge) => void;
  onToggleDay: (challenge: ConfigurableChallenge, day: WeekDay) => void;
  onSetAllDays: (challenge: ConfigurableChallenge) => void;
  onEdit?: (challenge: ConfigurableChallenge) => void;
  onDelete?: (challenge: ConfigurableChallenge) => void;
}) {
  const t = useTranslations("Retos");
  const [focusedChallengeId, setFocusedChallengeId] = useState<string | null>(null);

  return (
    <section className="rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          <p className="text-[11px] text-stone-500">{subtitle}</p>
        </div>
        <span className="shrink-0 text-[10px] font-medium text-stone-400">
          {challenges.filter((challenge) => challenge.isActive).length}/{challenges.length}
        </span>
      </div>

      <ul className="space-y-1">
        {challenges.map((challenge) => {
          const isPending = pendingId === challenge.id;
          const isFocused = focusedChallengeId === challenge.id;
          const canManage = Boolean(onEdit && onDelete);
          const displayLabel = translateChallengeLabel(challenge, t);
          const activeDays = normalizeChallengeWeekDays(challenge.activeDays);
          const allDaysSelected =
            activeDays.length === ALL_CHALLENGE_WEEK_DAYS.length &&
            ALL_CHALLENGE_WEEK_DAYS.every((day) => activeDays.includes(day));

          return (
            <li
              key={challenge.id}
              className={cn(
                "rounded-lg px-2 py-1.5",
                challenge.isActive ? "bg-[#eef4e6]/80" : "bg-stone-50/70"
              )}
            >
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggle(challenge)}
                  disabled={disabled || Boolean(pendingId)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 text-left",
                    (disabled || pendingId) && "opacity-80"
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      challenge.isActive ? "bg-[#556B2F]" : "bg-stone-300"
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "absolute h-4 w-4 rounded-full bg-white shadow transition-transform",
                        challenge.isActive ? "translate-x-4" : "translate-x-0.5"
                      )}
                    />
                  </span>

                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-xs font-medium",
                      challenge.isActive ? "text-[#3e5219]" : "text-stone-800"
                    )}
                  >
                    {displayLabel}
                    {challenge.source === "custom" ? (
                      <span className="ml-1 text-[9px] font-semibold uppercase text-stone-400">
                        · {t("customBadge")}
                      </span>
                    ) : null}
                  </span>

                  {isPending ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#556B2F]" />
                  ) : null}
                </button>

                {canManage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit?.(challenge)}
                      disabled={disabled || Boolean(pendingId)}
                      className="shrink-0 rounded-full p-1 text-stone-400 transition-colors hover:bg-white hover:text-[#556B2F] disabled:opacity-50"
                      aria-label={t("editAria", { label: displayLabel })}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(challenge)}
                      disabled={disabled || Boolean(pendingId)}
                      className="shrink-0 rounded-full p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={t("deleteAria", { label: displayLabel })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    setFocusedChallengeId((current) =>
                      current === challenge.id ? null : challenge.id
                    )
                  }
                  className={cn(
                    "shrink-0 rounded-full p-1 transition-colors",
                    isFocused ? "bg-white text-[#556B2F]" : "text-stone-400 hover:text-[#556B2F]"
                  )}
                  aria-label={t("whyMattersAria", { label: displayLabel })}
                  aria-expanded={isFocused}
                >
                  <Info className="h-3 w-3" />
                </button>
              </div>

              {challenge.isActive ? (
                <div className="mt-1.5 space-y-1 pl-11">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-stone-500">{t("daysHint")}</p>
                    <button
                      type="button"
                      onClick={() => onSetAllDays(challenge)}
                      disabled={disabled || Boolean(pendingId) || allDaysSelected}
                      className="shrink-0 text-[10px] font-medium text-[#556B2F] transition hover:text-[#3e5219] disabled:opacity-40"
                    >
                      {t("daysAll")}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1" role="group" aria-label={t("daysHint")}>
                    {WEEK_DAYS.map((day) => {
                      const isSelected = activeDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => onToggleDay(challenge, day)}
                          disabled={disabled || Boolean(pendingId)}
                          aria-pressed={isSelected}
                          title={day}
                          className={cn(
                            "flex h-6 min-w-[1.75rem] items-center justify-center rounded-full px-1 text-[9px] font-semibold transition",
                            isSelected
                              ? "bg-[#556B2F] text-white"
                              : "bg-white/80 text-stone-500 ring-1 ring-stone-200 hover:text-[#556B2F]",
                            (disabled || pendingId) && "opacity-70"
                          )}
                        >
                          {WEEK_DAY_SHORT[day]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {isFocused ? (
                <p className="mt-1.5 rounded-md bg-white/75 px-2 py-1.5 text-[10px] leading-snug text-stone-600">
                  {challenge.source === "custom"
                    ? t("importance.custom")
                    : t.has(`importance.${challenge.id}`)
                      ? t(`importance.${challenge.id}`)
                      : t.has("importance.fallbackPremium")
                        ? t("importance.fallbackPremium")
                        : t("importance.custom")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
