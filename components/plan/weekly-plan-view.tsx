"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PlanInstagramPromo } from "@/components/plan/plan-instagram-promo";
import { PlanRecipePickerModal } from "@/components/plan/plan-recipe-picker-modal";
import { WeeklyPlanDaySection } from "@/components/plan/weekly-plan-day-section";
import type { PlanDay } from "@/lib/plan/types";
import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import {
  assignRecipeToPlan,
  buildEmptyWeekDays,
  fetchRecipesForPicker,
  fetchWeeklyPlan,
  type RecipePickerItem
} from "@/lib/plan/plan-service";
import { getMondayOfWeek } from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";

type PickerTarget = {
  dayLabel: WeekDay;
  mealType: MealType;
};

export function WeeklyPlanView() {
  const [days, setDays] = useState<PlanDay[]>(() => buildEmptyWeekDays(getMondayOfWeek()));
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [swapNotice, setSwapNotice] = useState<string | null>(null);

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerRecipes, setPickerRecipes] = useState<RecipePickerItem[]>([]);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const loadWeeklyPlan = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setDays(buildEmptyWeekDays(getMondayOfWeek()));
        setErrorMessage("Inicia sesión para ver tu plan semanal.");
        return;
      }

      setUserId(user.id);
      const { days: fetchedDays } = await fetchWeeklyPlan(user.id);
      setDays(fetchedDays);
    } catch (error) {
      console.error("[weekly-plan] Error cargando plan:", error);
      setErrorMessage("No pudimos cargar tu plan semanal.");
      setDays(buildEmptyWeekDays(getMondayOfWeek()));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWeeklyPlan();
  }, [loadWeeklyPlan]);

  const openPicker = async (dayLabel: WeekDay, mealType: MealType) => {
    if (!userId) {
      setSwapNotice("Inicia sesión para asignar recetas al plan.");
      window.setTimeout(() => setSwapNotice(null), 2800);
      return;
    }

    setPickerTarget({ dayLabel, mealType });
    setPickerError(null);
    setIsPickerLoading(true);

    try {
      const recipes = await fetchRecipesForPicker(userId);
      setPickerRecipes(recipes);
    } catch (error) {
      console.error("[weekly-plan] Error cargando recetas para picker:", error);
      setPickerRecipes([]);
      setPickerError("No pudimos cargar tus recetas guardadas.");
    } finally {
      setIsPickerLoading(false);
    }
  };

  const closePicker = () => {
    if (isAssigning) return;
    setPickerTarget(null);
    setPickerError(null);
  };

  const handleSelectRecipe = async (recipeId: string) => {
    if (!userId || !pickerTarget) return;

    setIsAssigning(true);
    setPickerError(null);

    try {
      const assigned = await assignRecipeToPlan({
        userId,
        diaSemana: pickerTarget.dayLabel,
        tipoComida: pickerTarget.mealType,
        recipeId
      });

      if (!assigned) {
        setPickerError("No pudimos asignar la receta. Puede que ese bloque ya esté ocupado.");
        return;
      }

      setDays((prev) =>
        prev.map((day) =>
          day.label === pickerTarget.dayLabel
            ? {
                ...day,
                slots: {
                  ...day.slots,
                  [pickerTarget.mealType]: assigned
                }
              }
            : day
        )
      );

      setSwapNotice(`«${assigned.title}» añadida al ${pickerTarget.mealType.toLowerCase()} del ${pickerTarget.dayLabel}.`);
      window.setTimeout(() => setSwapNotice(null), 2800);
      setPickerTarget(null);
    } catch (error) {
      console.error("[weekly-plan] Error asignando receta:", error);
      setPickerError("Ocurrió un error al asignar la receta.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleMealSwapped = (dayLabel: WeekDay, updatedMeal: PlanMeal) => {
    setDays((prev) =>
      prev.map((day) =>
        day.label === dayLabel
          ? {
              ...day,
              slots: {
                ...day.slots,
                [updatedMeal.mealType]: updatedMeal
              }
            }
          : day
      )
    );
    setSwapNotice(`Receta intercambiada: «${updatedMeal.title}»`);
    window.setTimeout(() => setSwapNotice(null), 2800);
  };

  const handleSwapError = (message: string) => {
    setSwapNotice(message);
    window.setTimeout(() => setSwapNotice(null), 3200);
  };

  return (
    <div className="-mx-4 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-white px-4 pb-8 pt-1">
      <section className="space-y-6">
        <header className="px-0.5 pt-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700/70">
            Nutrición inteligente
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-stone-900">
            Tu plan semanal
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Asigna desayuno, almuerzo y cena para cada día. Toca + para elegir desde tus recetas.
          </p>
        </header>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-3xl border border-neutral-100 bg-white px-4 py-5 text-sm text-stone-500 shadow-xl shadow-stone-100/50">
            <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
            Cargando tu plan...
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {errorMessage}
          </p>
        ) : null}

        {swapNotice ? (
          <p
            role="status"
            className="rounded-3xl border border-[#556B2F]/15 bg-white/90 px-4 py-3 text-sm font-medium text-[#3e5219] shadow-lg shadow-stone-100/40 backdrop-blur-sm transition-opacity duration-300"
          >
            {swapNotice}
          </p>
        ) : null}

        <div className="space-y-4">
          {days.map((day) => (
            <WeeklyPlanDaySection
              key={day.id}
              day={day}
              defaultExpanded={day.isToday}
              onAddMeal={(dayLabel, mealType) => void openPicker(dayLabel, mealType)}
              onMealSwapped={handleMealSwapped}
              onSwapError={handleSwapError}
            />
          ))}

          <PlanInstagramPromo />
        </div>
      </section>

      <PlanRecipePickerModal
        open={pickerTarget !== null}
        dayLabel={pickerTarget?.dayLabel ?? ""}
        mealType={pickerTarget?.mealType ?? "Almuerzo"}
        recipes={pickerRecipes}
        isLoading={isPickerLoading}
        isAssigning={isAssigning}
        errorMessage={pickerError}
        onClose={closePicker}
        onSelectRecipe={(recipeId) => void handleSelectRecipe(recipeId)}
      />
    </div>
  );
}
