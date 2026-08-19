"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, MoreVertical, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { PlanDayCarousel } from "@/components/plan/plan-day-carousel";
import { PlanDayMealsPanel } from "@/components/plan/plan-day-meals-panel";
import { PlanRecipePickerModal } from "@/components/plan/plan-recipe-picker-modal";
import { ShoppingListModal } from "@/components/plan/shopping-list-modal";
import { SnackRegisterModal } from "@/components/plan/snack-register-modal";
import { WeeklyPlanSkeleton } from "@/components/skeletons/weekly-plan-skeleton";
import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import { MEAL_TYPES } from "@/lib/plan/constants";
import {
  assignRecipeToPlan,
  buildEmptyWeekDays,
  fetchRecipesForPicker,
  fetchWeeklyPlan,
  fillDayPlanWithSuggestions,
  movePlanMeal,
  replacePlanMealRecipe,
  type RecipePickerItem
} from "@/lib/plan/plan-service";
import { buildShoppingListItems, type ShoppingListItem } from "@/lib/plan/shopping-list";
import { fetchWeeklyPlanRecipesForShoppingList } from "@/lib/plan/shopping-list-service";
import { summarizeDayPlanNutrition } from "@/lib/plan/plan-nutrition";
import { clearHoyCache } from "@/lib/gamification/hoy-cache";
import { invalidatePremiumInsightsCache } from "@/lib/premium-stories/stories-cache";
import type { PlanDay, PlanDaySlots } from "@/lib/plan/types";
import type { PlanSnack } from "@/lib/plan/snack-presets";
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
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { Toast } from "@/components/ui/toast";
import { usePremium } from "@/hooks/use-premium";

type PickerTarget = {
  dayLabel: WeekDay;
  mealType: MealType;
  mode: "add" | "replace";
  planEntryId?: string;
};

function resolveInitialDay(days: PlanDay[]): WeekDay {
  return days.find((day) => day.isToday)?.label ?? days[0]?.label ?? "Lunes";
}

function patchDaySlots(day: PlanDay, slots: PlanDaySlots): PlanDay {
  return {
    ...day,
    slots,
    nutrition: summarizeDayPlanNutrition(slots, day.snacks ?? [])
  };
}

function patchDaySnacks(day: PlanDay, snacks: PlanDay["snacks"]): PlanDay {
  return {
    ...day,
    snacks,
    nutrition: summarizeDayPlanNutrition(day.slots, snacks)
  };
}

export function WeeklyPlanView() {
  const t = useTranslations("Plan");
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
  const [pickerSystemRecipes, setPickerSystemRecipes] = useState<RecipePickerItem[]>([]);
  const [pickerSavedRecipes, setPickerSavedRecipes] = useState<RecipePickerItem[]>([]);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [shoppingListItems, setShoppingListItems] = useState<ShoppingListItem[]>([]);
  const [isShoppingListLoading, setIsShoppingListLoading] = useState(false);
  const [shoppingListError, setShoppingListError] = useState<string | null>(null);

  const [snackRegisterOpen, setSnackRegisterOpen] = useState(false);
  const [snackRegisterBusy, setSnackRegisterBusy] = useState(false);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [isCloningWeek, setIsCloningWeek] = useState(false);
  const [isCheckingCloneAvailability, setIsCheckingCloneAvailability] = useState(false);
  const [canClonePreviousWeek, setCanClonePreviousWeek] = useState<boolean | null>(null);
  const [isProposingDayMenu, setIsProposingDayMenu] = useState(false);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false);
  const [menuToast, setMenuToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: ""
  });

  const { isPremium, isLoading: isPremiumLoading, refresh: refreshPremium } = usePremium();

  const selectedDayData = useMemo(
    () => days.find((day) => day.label === selectedDay) ?? days[0],
    [days, selectedDay]
  );

  const loadWeeklyPlan = useCallback(
    async (anchorWeekStart: Date) => {
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
          setErrorMessage(t("loginToView"));
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
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "message" in error
              ? String((error as { message?: unknown }).message ?? "Error desconocido")
              : "Error desconocido";
        console.error("[weekly-plan] Error cargando plan:", message, error);
        setErrorMessage(t("loadError"));
        const emptyDays = buildEmptyWeekDays(anchorWeekStart);
        setDays(emptyDays);
        setSelectedDay(resolveInitialDay(emptyDays));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

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

  const openPicker = async (
    dayLabel: WeekDay,
    mealType: MealType,
    options?: { mode?: "add" | "replace"; planEntryId?: string }
  ) => {
    if (!userId) {
      setSwapNotice(t("loginToAssign"));
      window.setTimeout(() => setSwapNotice(null), 2800);
      return;
    }

    setPickerTarget({
      dayLabel,
      mealType,
      mode: options?.mode ?? "add",
      planEntryId: options?.planEntryId
    });
    setPickerError(null);
    setIsPickerLoading(true);

    try {
      const recipes = await fetchRecipesForPicker(userId);
      setPickerSystemRecipes(recipes.system);
      setPickerSavedRecipes(recipes.saved);
    } catch (error) {
      console.error("[weekly-plan] Error cargando recetas para picker:", error);
      setPickerSystemRecipes([]);
      setPickerSavedRecipes([]);
      setPickerError(t("pickerLoadError"));
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
      if (pickerTarget.mode === "replace" && pickerTarget.planEntryId) {
        const replaced = await replacePlanMealRecipe({
          userId,
          planEntryId: pickerTarget.planEntryId,
          recipeId
        });

        if (!replaced) {
          setPickerError(
            t.has("replaceError")
              ? t("replaceError")
              : "No pudimos cambiar el plato. Inténtalo de nuevo."
          );
          return;
        }

        setDays((prev) =>
          prev.map((day) =>
            day.label === pickerTarget.dayLabel
              ? patchDaySlots(day, {
                  ...day.slots,
                  [pickerTarget.mealType]: (day.slots[pickerTarget.mealType] ?? []).map(
                    (meal) => (meal.id === pickerTarget.planEntryId ? replaced : meal)
                  )
                })
              : day
          )
        );

        clearHoyCache(userId);
        invalidatePremiumInsightsCache(userId);

        setSelectedDay(pickerTarget.dayLabel);
        setSwapNotice(
          t.has("recipeReplaced")
            ? t("recipeReplaced", { title: replaced.title })
            : `Plato actualizado: «${replaced.title}»`
        );
        window.setTimeout(() => setSwapNotice(null), 2800);
        setPickerTarget(null);
        return;
      }

      const assigned = await assignRecipeToPlan({
        userId,
        diaSemana: pickerTarget.dayLabel,
        tipoComida: pickerTarget.mealType,
        recipeId,
        semanaInicioISO: toISODateString(weekStartDate)
      });

      if (!assigned) {
        setPickerError(t("assignOccupiedError"));
        return;
      }

      setDays((prev) =>
        prev.map((day) =>
          day.label === pickerTarget.dayLabel
            ? patchDaySlots(day, {
                ...day.slots,
                [pickerTarget.mealType]: [
                  ...(day.slots[pickerTarget.mealType] ?? []),
                  assigned
                ]
              })
            : day
        )
      );

      clearHoyCache(userId);
      invalidatePremiumInsightsCache(userId);

      setSelectedDay(pickerTarget.dayLabel);
      setSwapNotice(
        t("recipeAdded", {
          title: assigned.title,
          meal: t(`meals.${pickerTarget.mealType}`),
          day: t(`days.${pickerTarget.dayLabel}`)
        })
      );
      window.setTimeout(() => setSwapNotice(null), 2800);
      setPickerTarget(null);
    } catch (error) {
      console.error("[weekly-plan] Error asignando/reemplazando receta:", error);
      setPickerError(
        pickerTarget.mode === "replace"
          ? t.has("replaceError")
            ? t("replaceError")
            : "No pudimos cambiar el plato. Inténtalo de nuevo."
          : t("assignError")
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSwapError = (message: string) => {
    setSwapNotice(message);
    window.setTimeout(() => setSwapNotice(null), 3200);
  };

  const handleMealRemoved = (
    dayLabel: WeekDay,
    mealType: MealType,
    planEntryId: string
  ) => {
    setDays((prev) =>
      prev.map((day) =>
        day.label === dayLabel
          ? patchDaySlots(day, {
              ...day.slots,
              [mealType]: (day.slots[mealType] ?? []).filter((meal) => meal.id !== planEntryId)
            })
          : day
      )
    );
    if (userId) {
      clearHoyCache(userId);
      invalidatePremiumInsightsCache(userId);
    }

    setSwapNotice(
      t("recipeRemoved", {
        meal: t(`meals.${mealType}`),
        day: t(`days.${dayLabel}`)
      })
    );
    window.setTimeout(() => setSwapNotice(null), 3200);
  };

  const handleConsumedChange = (
    dayLabel: WeekDay,
    mealType: MealType,
    planEntryId: string,
    consumido: boolean
  ) => {
    const mealTitle =
      days
        .find((d) => d.label === dayLabel)
        ?.slots[mealType]?.find((m) => m.id === planEntryId)?.title ?? "";

    setDays((prev) =>
      prev.map((day) =>
        day.label === dayLabel
          ? patchDaySlots(day, {
              ...day.slots,
              [mealType]: (day.slots[mealType] ?? []).map((meal) =>
                meal.id === planEntryId ? { ...meal, consumido } : meal
              )
            })
          : day
      )
    );
    if (userId) {
      clearHoyCache(userId);
    }

    if (consumido) {
      setSwapNotice(
        t.has("mealMarkedConsumed")
          ? t("mealMarkedConsumed", { title: mealTitle || "Plato" })
          : `«${mealTitle || "Plato"}» marcado como Ya comí · no entra en la lista de compra`
      );
    } else {
      setSwapNotice(
        t.has("mealUnmarkedConsumed")
          ? t("mealUnmarkedConsumed", { title: mealTitle || "Plato" })
          : `«Ya comí» desmarcado en «${mealTitle || "Plato"}»`
      );
    }
    window.setTimeout(() => setSwapNotice(null), 3200);
  };

  const handleMealMoved = (
    result: NonNullable<Awaited<ReturnType<typeof movePlanMeal>>>
  ) => {
    setDays((prev) =>
      prev.map((day) => {
        let nextSlots = day.slots;
        let changed = false;

        if (day.label === result.source.dayLabel) {
          nextSlots = {
            ...nextSlots,
            [result.source.mealType]: (nextSlots[result.source.mealType] ?? []).filter(
              (meal) => meal.id !== result.planEntryId
            )
          };
          changed = true;
        }

        if (day.label === result.target.dayLabel) {
          const withoutMoved = (nextSlots[result.target.mealType] ?? []).filter(
            (meal) => meal.id !== result.planEntryId
          );
          nextSlots = {
            ...nextSlots,
            [result.target.mealType]: [...withoutMoved, result.meal]
          };
          changed = true;
        }

        return changed ? patchDaySlots(day, nextSlots) : day;
      })
    );

    if (userId) {
      clearHoyCache(userId);
      invalidatePremiumInsightsCache(userId);
    }

    const movedTitle = result.meal.title;
    setSwapNotice(
      t.has("recipeMoved")
        ? t("recipeMoved", {
            title: movedTitle,
            from: t(`meals.${result.source.mealType}`),
            to: t(`meals.${result.target.mealType}`)
          })
        : `«${movedTitle}» movida a ${t(`meals.${result.target.mealType}`)}.`
    );
    window.setTimeout(() => setSwapNotice(null), 2800);
  };

  const handleProposeDayMenu = async () => {
    if (!userId || !selectedDayData || isProposingDayMenu || isPremiumLoading) return;

    if (!isPremium) {
      setShowPremiumPaywall(true);
      return;
    }

    const emptyCount = MEAL_TYPES.filter(
      (mealType) => (selectedDayData.slots[mealType]?.length ?? 0) === 0
    ).length;
    if (emptyCount === 0) {
      setSwapNotice(
        t.has("dayMenuAlreadyFull")
          ? t("dayMenuAlreadyFull")
          : "Este día ya tiene todas las comidas asignadas."
      );
      window.setTimeout(() => setSwapNotice(null), 2800);
      return;
    }

    setIsProposingDayMenu(true);
    try {
      const result = await fillDayPlanWithSuggestions({
        userId,
        dayLabel: selectedDayData.label,
        semanaInicioISO: toISODateString(weekStartDate),
        forceReplace: false
      });

      if (result.assigned === 0) {
        setSwapNotice(
          t.has("dayMenuGenerateEmpty")
            ? t("dayMenuGenerateEmpty")
            : "No encontramos recetas para completar el menú."
        );
        window.setTimeout(() => setSwapNotice(null), 3200);
        return;
      }

      clearHoyCache(userId);
      invalidatePremiumInsightsCache(userId);
      await loadWeeklyPlan(weekStartDate);
      setMenuToast({
        visible: true,
        message:
          result.skippedOccupied > 0 && t.has("dayMenuCompletedRemaining")
            ? t("dayMenuCompletedRemaining")
            : t.has("dayMenuSuggestedSuccess")
              ? t("dayMenuSuggestedSuccess")
              : "✨ Menú del día sugerido con éxito"
      });
      window.setTimeout(() => setMenuToast({ visible: false, message: "" }), 3200);
    } catch (error) {
      console.error("[weekly-plan] Error proponiendo menú del día:", error);
      setSwapNotice(
        t.has("dayMenuGenerateError")
          ? t("dayMenuGenerateError")
          : "No pudimos generar el menú. Inténtalo de nuevo."
      );
      window.setTimeout(() => setSwapNotice(null), 3200);
    } finally {
      setIsProposingDayMenu(false);
    }
  };

  const openShoppingList = async () => {
    setShoppingListOpen(true);
    setIsShoppingListLoading(true);
    setShoppingListError(null);
    setShoppingListItems([]);

    try {
      if (!userId) {
        setShoppingListError(t("loginForShoppingList"));
        return;
      }

      const planRows = await fetchWeeklyPlanRecipesForShoppingList(userId, weekStartDate);
      const items = buildShoppingListItems({
        recipes: planRows.map((r) => ({ ingredients: r.ingredients }))
      });

      setShoppingListItems(items);
    } catch (error) {
      console.error("[weekly-plan] Error generando lista de compra:", error);
      setShoppingListError(t("shoppingListError"));
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
      setSwapNotice(t("loginToClone"));
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
        setSwapNotice(t("noWeekToClone"));
        window.setTimeout(() => setSwapNotice(null), 3200);
        return;
      }

      const { error: deleteError } = await supabase
        .from("plan_semanal")
        .delete()
        .eq("user_id", userId)
        .eq("semana_inicio", currentWeekISO);

      if (deleteError) throw deleteError;

      const insertRows = data.map((row, index) => ({
        user_id: userId,
        semana_inicio: currentWeekISO,
        dia_semana: row.dia_semana,
        tipo_comida: row.tipo_comida,
        recipe_id: row.recipe_id,
        orden: index
      }));

      const { error: insertError } = await supabase.from("plan_semanal").insert(insertRows);

      if (insertError) throw insertError;

      setSwapNotice(t("cloneSuccess"));
      window.setTimeout(() => setSwapNotice(null), 3200);
      await loadWeeklyPlan(weekStartDate);
    } catch (error) {
      console.error("[weekly-plan] Error clonando semana anterior:", error);
      setSwapNotice(t("cloneError"));
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
    <div className="-mx-4 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-2 pt-1">
      <section className="space-y-2">
        <header className="mb-1 flex items-center gap-1.5">
          <h1 className="min-w-0 flex-1 truncate font-serif text-base font-semibold text-stone-900">
            {t("title")}
          </h1>

          <div className="flex shrink-0 items-center rounded-full border border-stone-100 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={goPrevWeek}
              disabled={isLoading || isCloningWeek}
              className={cn(
                "rounded-full p-1 text-stone-500 transition-colors hover:bg-stone-50",
                isLoading || isCloningWeek ? "cursor-not-allowed opacity-50" : ""
              )}
              aria-label={t("prevWeek")}
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>

            <span className="w-[4.75rem] select-none truncate text-center text-[10px] font-semibold text-stone-700">
              {weekRangeLabel}
            </span>

            <button
              type="button"
              onClick={goNextWeek}
              disabled={isLoading || isCloningWeek}
              className={cn(
                "rounded-full p-1 text-stone-500 transition-colors hover:bg-stone-50",
                isLoading || isCloningWeek ? "cursor-not-allowed opacity-50" : ""
              )}
              aria-label={t("nextWeek")}
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void openShoppingList()}
            disabled={isLoading || isShoppingListLoading}
            data-onboarding="plan-shopping-list"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200/60 bg-white text-[#556B2F] shadow-sm transition",
              "hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            )}
            aria-label={t("shoppingListButton")}
            title={t("shoppingListButton")}
          >
            {isShoppingListLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2} />
            )}
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setActionsOpen((current) => !current)}
              disabled={isLoading || isCloningWeek}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border border-stone-200/60 bg-stone-100 text-stone-600 transition hover:bg-stone-200/50",
                isLoading || isCloningWeek ? "cursor-not-allowed opacity-60" : ""
              )}
              aria-label={t("actionsAria")}
            >
              <MoreVertical className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>

            {actionsOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => void clonePreviousWeek()}
                  data-onboarding="plan-copy-previous-week"
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
                      ? t("checkingClone")
                      : canClonePreviousWeek
                        ? t("copyPreviousWeek")
                        : t("noPreviousWeek")}
                  </span>
                  {isCloningWeek || isCheckingCloneAvailability ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {isLoading ? <WeeklyPlanSkeleton /> : null}

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
            <div data-onboarding="plan-day-carousel">
              <PlanDayCarousel days={days} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
            </div>

            {selectedDayData ? (
              <div data-onboarding="plan-meals">
              <PlanDayMealsPanel
                day={selectedDayData}
                weekStartISO={toISODateString(weekStartDate)}
                onAddMeal={(dayLabel, mealType) => void openPicker(dayLabel, mealType)}
                onChangeMeal={(dayLabel, meal) =>
                  void openPicker(dayLabel, meal.mealType, {
                    mode: "replace",
                    planEntryId: meal.id
                  })
                }
                onSwapError={handleSwapError}
                onMealRemoved={handleMealRemoved}
                onConsumedChange={handleConsumedChange}
                onRemoveError={handleSwapError}
                onMealMoved={handleMealMoved}
                onSnackAdded={(dayLabel, snack) => {
                  setDays((prev) =>
                    prev.map((day) =>
                      day.label === dayLabel
                        ? patchDaySnacks(day, [...(day.snacks ?? []), snack])
                        : day
                    )
                  );
                  if (userId) {
                    clearHoyCache(userId);
                    invalidatePremiumInsightsCache(userId);
                  }
                  setSwapNotice(
                    t.has("snackRegistered")
                      ? t("snackRegistered", { title: snack.title })
                      : `Snack «${snack.title}» añadido.`
                  );
                }}
                onSnackRemoved={(dayLabel, snackId) => {
                  setDays((prev) =>
                    prev.map((day) =>
                      day.label === dayLabel
                        ? patchDaySnacks(
                            day,
                            (day.snacks ?? []).filter((snack) => snack.id !== snackId)
                          )
                        : day
                    )
                  );
                  if (userId) {
                    clearHoyCache(userId);
                    invalidatePremiumInsightsCache(userId);
                  }
                }}
                onOpenSnackRegister={() => setSnackRegisterOpen(true)}
                onProposeDayMenu={() => void handleProposeDayMenu()}
                isProposingDayMenu={isProposingDayMenu}
                isPremium={isPremium && !isPremiumLoading}
              />
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <PlanRecipePickerModal
        open={pickerTarget !== null}
        dayLabel={pickerTarget?.dayLabel ?? ""}
        mealType={pickerTarget?.mealType ?? "Almuerzo"}
        weekStartISO={toISODateString(weekStartDate)}
        mode={pickerTarget?.mode ?? "add"}
        planEntryId={pickerTarget?.planEntryId}
        existingSlotMeals={
          pickerTarget
            ? (days.find((day) => day.label === pickerTarget.dayLabel)?.slots[
                pickerTarget.mealType
              ] ?? [])
            : []
        }
        recipes={pickerSavedRecipes}
        systemRecipes={pickerSystemRecipes}
        isLoading={isPickerLoading}
        isAssigning={isAssigning}
        errorMessage={pickerError}
        onClose={closePicker}
        onSelectRecipe={(recipeId) => void handleSelectRecipe(recipeId)}
        onExternalMealRegistered={(meal) => {
          const targetDay = pickerTarget?.dayLabel ?? null;
          const replaceId = pickerTarget?.planEntryId;
          const isReplace = pickerTarget?.mode === "replace" && Boolean(replaceId);

          if (targetDay) {
            setDays((prev) =>
              prev.map((day) => {
                if (day.label !== targetDay) return day;

                if (isReplace && replaceId) {
                  return patchDaySlots(day, {
                    ...day.slots,
                    [meal.mealType]: (day.slots[meal.mealType] ?? []).map((existing) =>
                      existing.id === replaceId ? meal : existing
                    )
                  });
                }

                return patchDaySlots(day, {
                  ...day.slots,
                  [meal.mealType]: [...(day.slots[meal.mealType] ?? []), meal]
                });
              })
            );
          }
          if (userId) {
            clearHoyCache(userId);
            invalidatePremiumInsightsCache(userId);
          }
          setSwapNotice(
            isReplace
              ? t.has("recipeReplaced")
                ? t("recipeReplaced", { title: meal.title })
                : `Plato actualizado: «${meal.title}»`
              : t.has("externalMealRegistered")
                ? t("externalMealRegistered", { title: meal.title })
                : `«${meal.title}» registrada en el plan.`
          );
          window.setTimeout(() => setSwapNotice(null), 3200);
          closePicker();
        }}
      />

      <SnackRegisterModal
        open={snackRegisterOpen}
        dayLabel={selectedDayData?.label ?? selectedDay}
        weekStartISO={toISODateString(weekStartDate)}
        onBusyChange={setSnackRegisterBusy}
        onClose={() => {
          if (snackRegisterBusy) return;
          setSnackRegisterOpen(false);
        }}
        onRegistered={(snack: PlanSnack) => {
          setSnackRegisterBusy(false);
          const dayLabel = selectedDayData?.label ?? selectedDay;
          setDays((prev) =>
            prev.map((day) =>
              day.label === dayLabel
                ? patchDaySnacks(day, [...(day.snacks ?? []), snack])
                : day
            )
          );
          if (userId) {
            clearHoyCache(userId);
            invalidatePremiumInsightsCache(userId);
          }
          setSwapNotice(
            t.has("snackRegistered")
              ? t("snackRegistered", { title: snack.title })
              : `Snack «${snack.title}» añadido.`
          );
          setSnackRegisterOpen(false);
        }}
      />

      <ShoppingListModal
        open={shoppingListOpen}
        subtitle={shoppingListTitle}
        items={shoppingListItems}
        isLoading={isShoppingListLoading}
        errorMessage={shoppingListError}
        onClose={() => setShoppingListOpen(false)}
        onItemsChange={setShoppingListItems}
      />

      <PremiumUpgradeDialog
        open={showPremiumPaywall}
        onClose={() => setShowPremiumPaywall(false)}
        onUpgraded={() => void refreshPremium()}
        featureLabel={
          t.has("proposeDayMenuFeature")
            ? t("proposeDayMenuFeature")
            : "Proponer menú del día con IA"
        }
      />

      <Toast message={menuToast.message} visible={menuToast.visible} variant="success" />

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
          }
        }
        /* Sin fill-mode forwards/both: un transform residual (aunque sea 0)
           convierte a los hijos position:fixed en relativos al panel. */
        .animate-fade-in {
          animation: fade-in 280ms ease-out;
        }
      `}</style>

      <OnboardingOverlay page="plan" />
    </div>
  );
}
