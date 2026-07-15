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
  updateCustomChallenge
} from "@/lib/gamification/challenge-service";
import { getChallengeImportanceMessage } from "@/lib/gamification/challenge-importance";
import type { ConfigurableChallenge } from "@/lib/gamification/challenges";
import { clearHoyCache } from "@/lib/gamification/hoy-cache";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type ChallengeModalState =
  | { mode: "create" }
  | { mode: "edit"; challenge: ConfigurableChallenge };

export function ChallengesConfigView() {
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
      setErrorMessage("No pudimos cargar tus retos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  const toggleActive = async (challenge: ConfigurableChallenge) => {
    if (!userId || pendingId) return;

    const nextActive = !challenge.isActive;
    setPendingId(challenge.id);
    setErrorMessage(null);
    setChallenges((prev) =>
      prev.map((item) => (item.id === challenge.id ? { ...item, isActive: nextActive } : item))
    );

    try {
      await setRetoActiveForHoy({
        userId,
        retoId: challenge.id,
        active: nextActive
      });
      clearHoyCache(userId);
    } catch (error) {
      console.error("[challenges-config] Error actualizando reto:", error);
      setChallenges((prev) =>
        prev.map((item) => (item.id === challenge.id ? { ...item, isActive: !nextActive } : item))
      );
      setErrorMessage("No pudimos guardar el cambio. Inténtalo de nuevo.");
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
      setChallenges((prev) => [...prev, { ...created, isActive: true }]);
      setModalState(null);
      clearHoyCache(userId);
    } catch (error) {
      console.error("[challenges-config] Error creando meta:", error);
      setModalErrorMessage(
        error instanceof Error ? error.message : "No pudimos crear la meta. Inténtalo de nuevo."
      );
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
      clearHoyCache(userId);
    } catch (error) {
      console.error("[challenges-config] Error editando meta:", error);
      setModalErrorMessage(
        error instanceof Error ? error.message : "No pudimos guardar los cambios. Inténtalo de nuevo."
      );
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
      clearHoyCache(userId);
    } catch (error) {
      console.error("[challenges-config] Error eliminando meta:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "No pudimos eliminar la meta. Inténtalo de nuevo."
      );
    } finally {
      setIsDeletingChallenge(false);
    }
  };

  const activeCount = challenges.filter((challenge) => challenge.isActive).length;
  const systemChallenges = challenges.filter((challenge) => challenge.source === "system");
  const customChallenges = challenges.filter((challenge) => challenge.source === "custom");

  return (
    <>
      <div className="-mx-4 -mb-6 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-6 pt-1">
        <section className="space-y-3">
          <header className="px-0.5 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
              Hábitos
            </p>
            <h1 className="mt-0.5 font-serif text-lg font-semibold text-stone-900">Tus retos</h1>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Activa los hábitos que quieras ver cada día en Hoy.
            </p>
          </header>

          <div className="rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef4e6] text-[#3e5219]">
                <Target className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-900">
                  {isLoading ? "Cargando..." : `${activeCount} retos activos en Hoy`}
                </p>
                <p className="text-[11px] text-stone-500">
                  Los desactivados no aparecen en tu resumen diario.
                </p>
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
              Cargando retos...
            </div>
          ) : (
            <>
              <ChallengeSection
                title="Retos del sistema"
                subtitle="10 hábitos predefinidos"
                challenges={systemChallenges}
                pendingId={pendingId}
                disabled={!userId}
                onToggle={(challenge) => void toggleActive(challenge)}
              />

              {customChallenges.length > 0 ? (
                <ChallengeSection
                  title="Tus metas personalizadas"
                  subtitle="Creadas por ti · puedes editarlas o eliminarlas"
                  challenges={customChallenges}
                  pendingId={pendingId}
                  disabled={!userId}
                  onToggle={(challenge) => void toggleActive(challenge)}
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
                    setErrorMessage("Inicia sesión para crear metas personalizadas.");
                    return;
                  }
                  setModalErrorMessage(null);
                  setModalState({ mode: "create" });
                }}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300/80 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-500 transition hover:border-[#556B2F]/30 hover:text-[#3e5219] disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear meta personalizada
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
        title="Eliminar meta personalizada"
        description={
          deleteTarget
            ? `¿Seguro que quieres eliminar "${deleteTarget.label}"? Se quitará de Hoy y se borrará su historial de cumplimiento.`
            : undefined
        }
        confirmLabel="Eliminar meta"
        cancelLabel="Cancelar"
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
  onEdit,
  onDelete
}: {
  title: string;
  subtitle: string;
  challenges: ConfigurableChallenge[];
  pendingId: string | null;
  disabled: boolean;
  onToggle: (challenge: ConfigurableChallenge) => void;
  onEdit?: (challenge: ConfigurableChallenge) => void;
  onDelete?: (challenge: ConfigurableChallenge) => void;
}) {
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
                    {challenge.label}
                    {challenge.source === "custom" ? (
                      <span className="ml-1 text-[9px] font-semibold uppercase text-stone-400">
                        · Propio
                      </span>
                    ) : null}
                  </span>

                  {isPending ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#556B2F]" />
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold tabular-nums text-amber-800">
                      +{challenge.points}
                    </span>
                  )}
                </button>

                {canManage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit?.(challenge)}
                      disabled={disabled || Boolean(pendingId)}
                      className="shrink-0 rounded-full p-1 text-stone-400 transition-colors hover:bg-white hover:text-[#556B2F] disabled:opacity-50"
                      aria-label={`Editar meta: ${challenge.label}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(challenge)}
                      disabled={disabled || Boolean(pendingId)}
                      className="shrink-0 rounded-full p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Eliminar meta: ${challenge.label}`}
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
                  aria-label={`Por qué importa: ${challenge.label}`}
                  aria-expanded={isFocused}
                >
                  <Info className="h-3 w-3" />
                </button>
              </div>

              {isFocused ? (
                <p className="mt-1.5 rounded-md bg-white/75 px-2 py-1.5 text-[10px] leading-snug text-stone-600">
                  {getChallengeImportanceMessage(challenge)}{" "}
                  <span className="font-semibold text-[#556B2F]">+{challenge.points} pts</span> al
                  completarlo.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
