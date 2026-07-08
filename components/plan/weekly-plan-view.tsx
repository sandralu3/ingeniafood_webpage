"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { PlanDayCarousel } from "@/components/plan/plan-day-carousel";
import { PlanDayMealsPanel } from "@/components/plan/plan-day-meals-panel";
import { PlanRecipePickerModal } from "@/components/plan/plan-recipe-picker-modal";
import { ShoppingListModal } from "@/components/plan/shopping-list-modal";
import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { PlanDay } from "@/lib/plan/types";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import {
  assignRecipeToPlan,
  buildEmptyWeekDays,
  fetchRecipesForPicker,
  fetchWeeklyPlan,
  type RecipePickerItem
} from "@/lib/plan/plan-service";
import { buildShoppingListItems, type ShoppingListItem } from "@/lib/plan/shopping-list";
import { fetchWeeklyPlanRecipesForShoppingList } from "@/lib/plan/shopping-list-service";
import { formatWeekDateLabel, getMondayOfWeek } from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type PickerTarget = {
  dayLabel: WeekDay;
  mealType: MealType;
};

function resolveInitialDay(days: PlanDay[]): WeekDay {
  return days.find((day) => day.isToday)?.label ?? days[0]?.label ?? "Lunes";
}

export function WeeklyPlanView() {
  const [days, setDays] = useState<PlanDay[]>(() => buildEmptyWeekDays(getMondayOfWeek()));
  const [selectedDay, setSelectedDay] = useState<WeekDay>(() => resolveInitialDay(buildEmptyWeekDays(getMondayOfWeek())));
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [swapNotice, setSwapNotice] = useState<string | null>(null);

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerRecipes, setPickerRecipes] = useState<RecipePickerItem[]>([]);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [shoppingListItems, setShoppingListItems] = useState<ShoppingListItem[]>([]);
  const [isShoppingListLoading, setIsShoppingListLoading] = useState(false);
  const [shoppingListError, setShoppingListError] = useState<string | null>(null);

  const selectedDayData = useMemo(
    () => days.find((day) => day.label === selectedDay) ?? days[0],
    [days, selectedDay]
  );

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
        const emptyDays = buildEmptyWeekDays(getMondayOfWeek());
        setDays(emptyDays);
        setSelectedDay(resolveInitialDay(emptyDays));
        setErrorMessage("Inicia sesión para ver tu plan semanal.");
        return;
      }

      setUserId(user.id);
      const { days: fetchedDays } = await fetchWeeklyPlan(user.id);
      setDays(fetchedDays);
      setSelectedDay((current) =>
        fetchedDays.some((day) => day.label === current)
          ? current
          : resolveInitialDay(fetchedDays)
      );
    } catch (error) {
      console.error("[weekly-plan] Error cargando plan:", error);
      setErrorMessage("No pudimos cargar tu plan semanal.");
      const emptyDays = buildEmptyWeekDays(getMondayOfWeek());
      setDays(emptyDays);
      setSelectedDay(resolveInitialDay(emptyDays));
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

      setSelectedDay(pickerTarget.dayLabel);
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

  const handleMealRemoved = (dayLabel: WeekDay, mealType: MealType) => {
    setDays((prev) =>
      prev.map((day) =>
        day.label === dayLabel
          ? {
              ...day,
              slots: {
                ...day.slots,
                [mealType]: null
              }
            }
          : day
      )
    );

    setSwapNotice(`Receta quitada del ${mealType.toLowerCase()} de ${dayLabel}.`);
    window.setTimeout(() => setSwapNotice(null), 3200);
  };

  const openShoppingList = async () => {
    setShoppingListOpen(true);
    setIsShoppingListLoading(true);
    setShoppingListError(null);
    setShoppingListItems([]);

    try {
      if (!userId) {
        setShoppingListError("Inicia sesión para generar tu lista de compra.");
        return;
      }

      const planRows = await fetchWeeklyPlanRecipesForShoppingList(userId);
      const items = buildShoppingListItems({
        recipes: planRows.map((r) => ({ ingredients: r.ingredients }))
      });

      setShoppingListItems(items);
    } catch (error) {
      console.error("[weekly-plan] Error generando lista de compra:", error);
      setShoppingListError("No pudimos generar la lista de compra.");
    } finally {
      setIsShoppingListLoading(false);
    }
  };

  const monday = getMondayOfWeek();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const shoppingListTitle = `${formatWeekDateLabel(monday)} - ${formatWeekDateLabel(sunday)}`;

  return (
    <div className="min-h-full bg-[#FBF9F6] pb-8 pt-1">
      <section className="space-y-5">
        <header className="flex items-center justify-between gap-3 pt-2">
          <h1 className="text-xl font-bold tracking-tight text-stone-800">Tu plan semanal</h1>
          <button
            type="button"
            onClick={() => void openShoppingList()}
            disabled={isLoading || isShoppingListLoading}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition",
              "hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2} />
            Lista
          </button>
        </header>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-stone-100 bg-white px-4 py-4 text-sm text-stone-500 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-olive-600" />
            Cargando tu plan...
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {swapNotice ? (
          <p
            role="status"
            className="rounded-2xl border border-olive-200 bg-olive-50 px-4 py-3 text-sm font-medium text-olive-800 transition-opacity duration-300"
          >
            {swapNotice}
          </p>
        ) : null}

        {!isLoading ? (
          <>
            <PlanDayCarousel days={days} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

            {selectedDayData ? (
              <PlanDayMealsPanel
                day={selectedDayData}
                onAddMeal={(dayLabel, mealType) => void openPicker(dayLabel, mealType)}
                onMealSwapped={handleMealSwapped}
                onSwapError={handleSwapError}
                onMealRemoved={handleMealRemoved}
                onRemoveError={handleSwapError}
              />
            ) : null}
          </>
        ) : null}
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

      <ShoppingListModal
        open={shoppingListOpen}
        title={shoppingListTitle}
        items={shoppingListItems}
        isLoading={isShoppingListLoading}
        errorMessage={shoppingListError}
        onClose={() => setShoppingListOpen(false)}
      />

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 280ms ease-out both;
        }
      `}</style>
    </div>
  );
}
