"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, MoreVertical, ShoppingBag } from "lucide-react";
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
import {
  addDays,
  formatWeekDateLabel,
  formatWeekRangeLabel,
  getMondayOfWeek,
  parseISODateToLocalDate,
  toISODateString
} from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import {
  readLastPlanWeekStartISO,
  saveLastPlanWeekStartISO
} from "@/lib/plan/plan-pending-assignment";

type PickerTarget = {
  dayLabel: WeekDay;
  mealType: MealType;
};

function resolveInitialDay(days: PlanDay[]): WeekDay {
  return days.find((day) => day.isToday)?.label ?? days[0]?.label ?? "Lunes";
}

export function WeeklyPlanView() {
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const last = readLastPlanWeekStartISO();
    return last ? parseISODateToLocalDate(last) : getMondayOfWeek();
  });

  const [days, setDays] = useState<PlanDay[]>(() => buildEmptyWeekDays(weekStartDate));
  const [selectedDay, setSelectedDay] = useState<WeekDay>(() =>
    resolveInitialDay(buildEmptyWeekDays(weekStartDate))
  );
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

  const [actionsOpen, setActionsOpen] = useState(false);
  const [isCloningWeek, setIsCloningWeek] = useState(false);
  const [isCheckingCloneAvailability, setIsCheckingCloneAvailability] = useState(false);
  const [canClonePreviousWeek, setCanClonePreviousWeek] = useState<boolean | null>(null);

  const selectedDayData = useMemo(
    () => days.find((day) => day.label === selectedDay) ?? days[0],
    [days, selectedDay]
  );

  const loadWeeklyPlan = useCallback(async (anchorWeekStart: Date) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        const emptyDays = buildEmptyWeekDays(anchorWeekStart);
        setDays(emptyDays);
        setSelectedDay(resolveInitialDay(emptyDays));
        setErrorMessage("Inicia sesión para ver tu plan semanal.");
        return;
      }

      setUserId(user.id);
      const { days: fetchedDays } = await fetchWeeklyPlan(user.id, anchorWeekStart);
      setDays(fetchedDays);
      setSelectedDay((current) =>
        fetchedDays.some((day) => day.label === current)
          ? current
          : resolveInitialDay(fetchedDays)
      );
    } catch (error) {
      console.error("[weekly-plan] Error cargando plan:", error);
      setErrorMessage("No pudimos cargar tu plan semanal.");
      const emptyDays = buildEmptyWeekDays(anchorWeekStart);
      setDays(emptyDays);
      setSelectedDay(resolveInitialDay(emptyDays));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWeeklyPlan(weekStartDate);
  }, [loadWeeklyPlan, weekStartDate]);

  useEffect(() => {
    saveLastPlanWeekStartISO(toISODateString(weekStartDate));
  }, [weekStartDate]);

  useEffect(() => {
    if (!userId) {
      setCanClonePreviousWeek(null);
      return;
    }

    let alive = true;
    const run = async () => {
      setIsCheckingCloneAvailability(true);
      try {
        const supabase = createSupabaseClient();
        const previousWeekISO = toISODateString(addDays(weekStartDate, -7));

        const { data, error } = await supabase
          .from("plan_semanal")
          .select("id")
          .eq("user_id", userId)
          .eq("semana_inicio", previousWeekISO)
          .limit(1);

        if (!alive) return;
        if (error) {
          setCanClonePreviousWeek(false);
          return;
        }

        setCanClonePreviousWeek(Boolean(data && data.length > 0));
      } catch {
        if (!alive) return;
        setCanClonePreviousWeek(false);
      } finally {
        if (!alive) return;
        setIsCheckingCloneAvailability(false);
      }
    };

    void run();

    return () => {
      alive = false;
    };
  }, [userId, weekStartDate]);

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
        recipeId,
        semanaInicioISO: toISODateString(weekStartDate)
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

      const planRows = await fetchWeeklyPlanRecipesForShoppingList(userId, weekStartDate);
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

  const goPrevWeek = () => {
    setWeekStartDate((current) => addDays(current, -7));
  };

  const goNextWeek = () => {
    setWeekStartDate((current) => addDays(current, 7));
  };

  const clonePreviousWeek = async () => {
    if (!userId) {
      setSwapNotice("Inicia sesión para clonar menús.");
      window.setTimeout(() => setSwapNotice(null), 2800);
      return;
    }

    if (isCloningWeek) return;

    setIsCloningWeek(true);
    setActionsOpen(false);
    setSwapNotice(null);

    try {
      const supabase = createSupabaseClient();
      const currentWeekISO = toISODateString(weekStartDate);
      const previousWeekISO = toISODateString(addDays(weekStartDate, -7));

      const { data, error } = await supabase
        .from("plan_semanal")
        .select("dia_semana,tipo_comida,recipe_id")
        .eq("user_id", userId)
        .eq("semana_inicio", previousWeekISO);

      if (error) throw error;

      if (!data || data.length === 0) {
        setSwapNotice("No encontramos una semana anterior para clonar.");
        window.setTimeout(() => setSwapNotice(null), 3200);
        return;
      }

      const upsertRows = data.map((row) => ({
        user_id: userId,
        semana_inicio: currentWeekISO,
        dia_semana: row.dia_semana,
        tipo_comida: row.tipo_comida,
        recipe_id: row.recipe_id
      }));

      const { error: upsertError } = await supabase.from("plan_semanal").upsert(upsertRows, {
        onConflict: "user_id,semana_inicio,dia_semana,tipo_comida"
      });

      if (upsertError) throw upsertError;

      setSwapNotice("Semana anterior copiada con éxito.");
      window.setTimeout(() => setSwapNotice(null), 3200);
      await loadWeeklyPlan(weekStartDate);
    } catch (error) {
      console.error("[weekly-plan] Error clonando semana anterior:", error);
      setSwapNotice("No pudimos clonar la semana anterior.");
      window.setTimeout(() => setSwapNotice(null), 3200);
    } finally {
      setIsCloningWeek(false);
    }
  };

  const weekStart = weekStartDate;
  const weekEnd = addDays(weekStart, 6);
  const weekRangeLabel = formatWeekRangeLabel(weekStartDate);
  const shoppingListTitle = `${formatWeekDateLabel(weekStart)} - ${formatWeekDateLabel(weekEnd)}`;

  return (
    <div className="-mx-4 -mb-6 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-6 pt-1">
      <section className="space-y-3">
        <header>
          <h1 className="font-serif text-lg font-semibold text-stone-900">Tu plan semanal</h1>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Organiza tus comidas de la semana y asegúrate un menú variado y equilibrado. Haz un
            seguimiento de tu progreso.
          </p>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center rounded-full border border-stone-100 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={goPrevWeek}
                disabled={isLoading || isCloningWeek}
                className={cn(
                  "rounded-full p-1.5 text-stone-500 transition-colors hover:bg-stone-50",
                  isLoading || isCloningWeek ? "cursor-not-allowed opacity-50" : ""
                )}
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
              </button>

              <span className="w-28 select-none truncate text-center text-xs font-semibold text-stone-700">
                {weekRangeLabel}
              </span>

              <button
                type="button"
                onClick={goNextWeek}
                disabled={isLoading || isCloningWeek}
                className={cn(
                  "rounded-full p-1.5 text-stone-500 transition-colors hover:bg-stone-50",
                  isLoading || isCloningWeek ? "cursor-not-allowed opacity-50" : ""
                )}
                aria-label="Semana siguiente"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void openShoppingList()}
                disabled={isLoading || isShoppingListLoading}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200/60 bg-white px-3 py-1.5 text-xs font-medium text-[#556B2F] shadow-sm transition",
                  "hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2} />
                Lista de compras
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActionsOpen((current) => !current)}
                  disabled={isLoading || isCloningWeek}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border border-stone-200/60 bg-stone-100 text-stone-600 transition hover:bg-stone-200/50",
                    isLoading || isCloningWeek ? "cursor-not-allowed opacity-60" : ""
                  )}
                  aria-label="Acciones"
                >
                  <MoreVertical className="h-4 w-4" strokeWidth={2.25} />
                </button>

                {actionsOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => void clonePreviousWeek()}
                      disabled={
                        isCloningWeek ||
                        isCheckingCloneAvailability ||
                        canClonePreviousWeek === false
                      }
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-stone-800 transition",
                        "hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                      )}
                    >
                      <span>
                        {isCheckingCloneAvailability
                          ? "Comprobando..."
                          : canClonePreviousWeek
                            ? "Copiar semana anterior"
                            : "Sin semana anterior"}
                      </span>
                      {isCloningWeek || isCheckingCloneAvailability ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs text-stone-500 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-olive-600" />
            Cargando tu plan...
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="rounded-xl bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">{errorMessage}</p>
        ) : null}

        {swapNotice ? (
          <p
            role="status"
            className="rounded-xl border border-olive-200/80 bg-olive-50/80 px-2.5 py-1.5 text-[11px] font-medium text-olive-800"
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
        weekStartISO={toISODateString(weekStartDate)}
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
