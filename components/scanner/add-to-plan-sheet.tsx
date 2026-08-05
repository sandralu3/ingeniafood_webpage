"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Coffee, Loader2, Soup, Utensils, X } from "lucide-react";
import { MEAL_TYPES, type MealType } from "@/lib/plan/constants";
import { assignRecipeToPlan } from "@/lib/plan/plan-service";
import { saveLastPlanWeekStartISO } from "@/lib/plan/plan-pending-assignment";
import {
  buildUpcomingPlanDays,
  getMondayOfWeek,
  toISODateString,
  type UpcomingPlanDay
} from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";

const MEAL_TYPE_META: Record<
  MealType,
  { label: string; Icon: typeof Coffee }
> = {
  Desayuno: { label: "DESAYUNO", Icon: Coffee },
  Almuerzo: { label: "ALMUERZO", Icon: Utensils },
  Cena: { label: "CENA", Icon: Soup }
};

type AddToPlanSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  persistRecipeId: () => Promise<string | null>;
  onSuccess?: (message: string) => void;
};

export function AddToPlanSheet({
  isOpen,
  onClose,
  persistRecipeId,
  onSuccess
}: AddToPlanSheetProps) {
  const upcomingDays = useMemo(() => buildUpcomingPlanDays(7), []);
  const [selectedDate, setSelectedDate] = useState(upcomingDays[0]?.isoDate ?? "");
  const [selectedMealType, setSelectedMealType] = useState<MealType>("Almuerzo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const firstDay = upcomingDays[0];
    if (firstDay) {
      setSelectedDate(firstDay.isoDate);
    }
    setSelectedMealType("Almuerzo");
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
  }, [isOpen, upcomingDays]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const selectedDay = useMemo(
    () => upcomingDays.find((day) => day.isoDate === selectedDate) ?? upcomingDays[0],
    [selectedDate, upcomingDays]
  );

  const handleConfirm = useCallback(async () => {
    if (!selectedDay || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("Necesitas iniciar sesión para programar recetas en tu plan.");
        return;
      }

      const recipeId = await persistRecipeId();
      if (!recipeId) {
        setErrorMessage("Primero guarda la receta en tu recetario e inténtalo de nuevo.");
        return;
      }

      const weekStartISO = toISODateString(getMondayOfWeek(selectedDay.date));
      saveLastPlanWeekStartISO(weekStartISO);

      const assigned = await assignRecipeToPlan({
        userId: user.id,
        diaSemana: selectedDay.weekDay,
        tipoComida: selectedMealType,
        recipeId,
        semanaInicioISO: weekStartISO
      });

      if (!assigned) {
        setErrorMessage("No pudimos añadir la receta al plan. Inténtalo nuevamente.");
        return;
      }

      const message = "¡Receta añadida a tu plan!";
      setSuccessMessage(message);
      onSuccess?.(message);

      window.setTimeout(() => {
        onClose();
      }, 900);
    } catch (error) {
      console.error("[add-to-plan-sheet] Error programando receta:", error);
      setErrorMessage("No pudimos añadir la receta al plan. Inténtalo nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onClose, onSuccess, persistRecipeId, selectedDay, selectedMealType]);

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar programación en el plan"
        className="fixed inset-0 z-[90] bg-black/40"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-sheet-title"
        className="fixed bottom-0 left-0 right-0 z-[100] animate-slide-up rounded-t-3xl border-t border-stone-100 bg-white p-6 shadow-2xl"
      >
        <SwipeToCloseHandle onClose={onClose} disabled={isSubmitting} thresholdPx={70} />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Plan semanal
            </p>
            <h2 id="plan-sheet-title" className="mt-1 text-lg font-semibold text-stone-900">
              ¿Cuándo la cocinas?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Día
          </p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {upcomingDays.map((day: UpcomingPlanDay) => {
              const isActive = day.isoDate === selectedDate;
              return (
                <button
                  key={day.isoDate}
                  type="button"
                  onClick={() => setSelectedDate(day.isoDate)}
                  className={cn(
                    "flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition",
                    isActive
                      ? "border-[#4C6B3F] bg-[#4C6B3F] text-white shadow-sm"
                      : "border-stone-100 bg-stone-50 text-stone-600 hover:bg-stone-100"
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {day.shortLabel}
                  </span>
                  <span className="mt-0.5 text-sm font-bold tabular-nums">{day.dayNumber}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Tipo de comida
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MEAL_TYPES.map((mealType) => {
              const meta = MEAL_TYPE_META[mealType];
              const Icon = meta.Icon;
              const isActive = selectedMealType === mealType;

              return (
                <button
                  key={mealType}
                  type="button"
                  onClick={() => setSelectedMealType(mealType)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-[10px] font-bold tracking-wide transition",
                    isActive
                      ? "border-[#D5E2D0] bg-[#E9F0E6] text-[#4C6B3F]"
                      : "border-stone-100 bg-white text-stone-500 hover:border-stone-200 hover:bg-stone-50"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {errorMessage ? (
          <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-[#4C6B3F]/20 bg-[#E9F0E6] px-3 py-2 text-sm font-medium text-[#4C6B3F]">
            <Calendar className="h-4 w-4" />
            {successMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isSubmitting || Boolean(successMessage)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4C6B3F] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4C6B3F]/20 transition hover:bg-[#3D5632] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Programando...
            </>
          ) : (
            "Confirmar y Programar"
          )}
        </button>
      </div>
    </>
  );
}
