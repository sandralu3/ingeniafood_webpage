"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Target } from "lucide-react";
import { CustomChallengeModal } from "@/components/hoy/custom-challenge-modal";
import {
  createCustomChallenge,
  fetchConfigurableChallenges,
  setRetoActiveForHoy
} from "@/lib/gamification/challenge-service";
import type { ConfigurableChallenge } from "@/lib/gamification/challenges";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

export function ChallengesConfigView() {
  const [challenges, setChallenges] = useState<ConfigurableChallenge[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);

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

    setIsCreatingChallenge(true);
    setCreateErrorMessage(null);

    try {
      const created = await createCustomChallenge({ userId, titulo });
      setChallenges((prev) => [...prev, { ...created, isActive: true }]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("[challenges-config] Error creando meta:", error);
      setCreateErrorMessage(
        error instanceof Error ? error.message : "No pudimos crear la meta. Inténtalo de nuevo."
      );
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  const activeCount = challenges.filter((challenge) => challenge.isActive).length;
  const systemChallenges = challenges.filter((challenge) => challenge.source === "system");
  const customChallenges = challenges.filter((challenge) => challenge.source === "custom");

  return (
    <>
      <div className="-mx-4 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-white px-4 pb-8 pt-1">
        <section className="space-y-5">
          <header className="px-0.5 pt-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700/70">
              Gamificación
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-stone-900">
              Tus retos
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Elige qué metas quieres ver cada día en la pantalla de Hoy. Activa solo las que
              encajen con tu rutina.
            </p>
          </header>

          <div className="rounded-3xl border border-neutral-100 bg-white/90 px-4 py-4 shadow-xl shadow-stone-100/50">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#dce7c3] to-amber-100 text-[#3e5219]">
                <Target className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  {isLoading ? "Cargando..." : `${activeCount} retos activos en Hoy`}
                </p>
                <p className="text-xs text-stone-500">
                  Los retos desactivados no aparecerán en tu resumen diario.
                </p>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <p role="alert" className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
              Cargando retos...
            </div>
          ) : (
            <>
              <ChallengeSection
                title="Retos del sistema"
                subtitle="10 hábitos saludables predefinidos"
                challenges={systemChallenges}
                pendingId={pendingId}
                disabled={!userId}
                onToggle={(challenge) => void toggleActive(challenge)}
              />

              {customChallenges.length > 0 ? (
                <ChallengeSection
                  title="Tus metas personalizadas"
                  subtitle="Creadas por ti"
                  challenges={customChallenges}
                  pendingId={pendingId}
                  disabled={!userId}
                  onToggle={(challenge) => void toggleActive(challenge)}
                />
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (!userId) {
                    setErrorMessage("Inicia sesión para crear metas personalizadas.");
                    return;
                  }
                  setCreateErrorMessage(null);
                  setIsCreateModalOpen(true);
                }}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300/90 bg-stone-50/60 px-4 py-3.5 text-sm font-medium text-stone-500 transition hover:border-[#556B2F]/35 hover:bg-amber-50/40 hover:text-[#3e5219] disabled:opacity-60"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-500">
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </span>
                Crear meta personalizada
              </button>
            </>
          )}
        </section>
      </div>

      <CustomChallengeModal
        open={isCreateModalOpen}
        isSaving={isCreatingChallenge}
        errorMessage={createErrorMessage}
        onClose={() => {
          if (isCreatingChallenge) return;
          setIsCreateModalOpen(false);
          setCreateErrorMessage(null);
        }}
        onSubmit={(titulo) => void handleCreateChallenge(titulo)}
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
  onToggle
}: {
  title: string;
  subtitle: string;
  challenges: ConfigurableChallenge[];
  pendingId: string | null;
  disabled: boolean;
  onToggle: (challenge: ConfigurableChallenge) => void;
}) {
  return (
    <section className="rounded-3xl border border-neutral-100 bg-white/90 px-4 py-5 shadow-xl shadow-stone-100/50">
      <div className="mb-4 px-1">
        <h2 className="font-serif text-lg font-semibold text-stone-900">{title}</h2>
        <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
      </div>

      <ul className="space-y-2.5">
        {challenges.map((challenge) => {
          const isPending = pendingId === challenge.id;

          return (
            <li key={challenge.id}>
              <button
                type="button"
                onClick={() => onToggle(challenge)}
                disabled={disabled || Boolean(pendingId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3.5 text-left transition-all duration-300",
                  challenge.isActive
                    ? "border-[#556B2F]/25 bg-gradient-to-r from-[#f5f8ef] to-amber-50/60 shadow-sm"
                    : "border-neutral-100 bg-stone-50/80 hover:border-amber-200/60 hover:bg-white",
                  (disabled || pendingId) && "opacity-80"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300",
                    challenge.isActive ? "bg-[#556B2F]" : "bg-stone-300"
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "absolute h-5 w-5 rounded-full bg-white shadow transition-transform duration-300",
                      challenge.isActive ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-stone-800">{challenge.label}</span>
                  {challenge.source === "custom" ? (
                    <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-stone-400">
                      Personalizada
                    </span>
                  ) : null}
                </span>

                {isPending ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#556B2F]" />
                ) : (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    +{challenge.points}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
