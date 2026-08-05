"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, MoreVertical, PenLine, ScanLine, Search, Instagram, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ExternalMealRegisterModal } from "@/components/plan/external-meal-register-modal";
import { PlanRecipePickerRow } from "@/components/plan/plan-recipe-picker-row";
import type { PlanMeal } from "@/components/plan/plan-meal-card";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import type { ScannerMode } from "@/components/scanner/scanner-mode-tabs";
import { usePremium } from "@/hooks/use-premium";
import type { RecipePickerItem } from "@/lib/plan/plan-service";
import { WEEK_DAYS, type MealType, type WeekDay } from "@/lib/plan/constants";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import {
  savePendingPlanAssignment,
  saveScannerInitialMode
} from "@/lib/plan/plan-pending-assignment";
import {
  filterPickerRecipes,
  SAVED_RECIPE_FILTERS,
  type SavedRecipeFilter
} from "@/lib/recipes/saved-recipes-filter";
import { canRegisterExternalMealForPlanDay } from "@/lib/plan/week-utils";
import { cn } from "@/lib/utils";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";

type PlanRecipePickerModalProps = {
  open: boolean;
  dayLabel: string;
  mealType: MealType;
  weekStartISO: string;
  /** add = nueva comida; replace = cambiar plato existente */
  mode?: "add" | "replace";
  /** Entrada del plan a sustituir cuando mode = "replace" */
  planEntryId?: string;
  recipes: RecipePickerItem[];
  isLoading: boolean;
  isAssigning: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSelectRecipe: (recipeId: string) => void;
  onExternalMealRegistered?: (meal: PlanMeal) => void;
};

const FILTER_LABEL_KEYS: Record<SavedRecipeFilter, string> = {
  Todas: "filterAll",
  Desayunos: "filterBreakfasts",
  Almuerzos: "filterLunches",
  Cenas: "filterDinners",
  Snacks: "filterSnacks",
  Airfryer: "filterAirfryer",
  "Sin Harinas": "filterFlourless"
};

export function PlanRecipePickerModal({
  open,
  dayLabel,
  mealType,
  weekStartISO,
  mode = "add",
  planEntryId,
  recipes,
  isLoading,
  isAssigning,
  errorMessage,
  onClose,
  onSelectRecipe,
  onExternalMealRegistered
}: PlanRecipePickerModalProps) {
  const t = useTranslations("Plan");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const { isPremium, isLoading: isPremiumLoading, refresh: refreshPremium } = usePremium();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<SavedRecipeFilter>("Todas");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [externalMode, setExternalMode] = useState<"photo" | "text" | null>(null);
  const [externalBusy, setExternalBusy] = useState(false);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const dayDisplay =
    dayLabel && (WEEK_DAYS as readonly string[]).includes(dayLabel)
      ? t(`days.${dayLabel as WeekDay}`)
      : dayLabel;
  const mealDisplay = t(`meals.${mealType}`);

  useEffect(() => {
    if (open) return;
    // Al cerrar el picker solo limpiamos filtros; el modal de comida fuera
    // se cierra solo con su propio onClose (no al terminar de analizar).
    setSearchTerm("");
    setActiveFilter("Todas");
    setIsFilterMenuOpen(false);
  }, [open]);

  const requestClose = () => {
    if (externalBusy || isAssigning) return;
    onClose();
  };

  useEffect(() => {
    if (!isFilterMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterMenuOpen]);

  const filteredRecipes = useMemo(
    () =>
      filterPickerRecipes(recipes, {
        searchTerm,
        categoryFilter: activeFilter
      }),
    [activeFilter, recipes, searchTerm]
  );

  const canRegisterExternal = useMemo(() => {
    if (!weekStartISO || !(WEEK_DAYS as readonly string[]).includes(dayLabel)) {
      return false;
    }
    return canRegisterExternalMealForPlanDay(weekStartISO, dayLabel as WeekDay);
  }, [dayLabel, weekStartISO]);

  const goToScannerForPlan = (scannerMode: ScannerMode = "pantry") => {
    savePendingPlanAssignment({
      dayLabel: dayLabel as WeekDay,
      mealType,
      weekStartISO,
      ...(mode === "replace" && planEntryId ? { planEntryId } : {})
    });
    saveScannerInitialMode(scannerMode);
    onClose();
    router.push(APP_ROUTES.scanner);
  };

  const handleExternalMealClick = (mode: "photo" | "text") => {
    if (isPremiumLoading) return;
    if (!isPremium) {
      setShowPremiumPaywall(true);
      return;
    }
    setExternalMode(mode);
  };

  if (!open && externalMode === null) return null;

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/45 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-picker-title"
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-neutral-100 bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="shrink-0 px-5 pt-0 pb-0">
              <SwipeToCloseHandle
                onClose={requestClose}
                disabled={externalBusy || isAssigning}
              />
            </div>

            <div className="flex items-start justify-between gap-3 border-b border-stone-100 bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700/80">
                  {dayDisplay} · {mealDisplay}
                </p>
                <h2 id="plan-picker-title" className="mt-1 font-serif text-xl font-semibold text-stone-900">
                  {mode === "replace"
                    ? t.has("pickerReplaceTitle")
                      ? t("pickerReplaceTitle")
                      : "Cambiar plato"
                    : t("pickerTitle")}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {mode === "replace"
                    ? t.has("pickerReplaceSubtitle")
                      ? t("pickerReplaceSubtitle")
                      : "Elige otra receta de tu biblioteca para este hueco."
                    : t("pickerSubtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={requestClose}
                disabled={isAssigning || externalBusy}
                className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
                aria-label={tCommon("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

        <div className="relative z-20 border-b border-stone-100 bg-white px-5 py-3">
          {canRegisterExternal ? (
            <div className="mb-3 rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50/80 to-sky-50/50 p-3">
              <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-stone-500">
                {t.has("externalMealOptionsLabel")
                  ? t("externalMealOptionsLabel")
                  : "¿Comiste fuera?"}
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={isAssigning || isPremiumLoading}
                  onClick={() => handleExternalMealClick("photo")}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-200/80 bg-white px-3 py-2.5 text-xs font-semibold text-sky-900 shadow-sm transition",
                    "hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  <Camera className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 text-left">
                    {t.has("externalMealScanCta")
                      ? t("externalMealScanCta")
                      : "📸 Escanear plato servido (IA)"}
                  </span>
                  {!isPremium ? (
                    <span className="shrink-0 text-[9px] font-bold tracking-wide text-amber-800">
                      👑 PRO
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  disabled={isAssigning || isPremiumLoading}
                  onClick={() => handleExternalMealClick("text")}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-200/80 bg-white px-3 py-2.5 text-xs font-semibold text-violet-900 shadow-sm transition",
                    "hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  <PenLine className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 text-left">
                    {t.has("externalMealQuickCta")
                      ? t("externalMealQuickCta")
                      : "✍️ Registrar comida rápida"}
                  </span>
                  {!isPremium ? (
                    <span className="shrink-0 text-[9px] font-bold tracking-wide text-amber-800">
                      👑 PRO
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          ) : (
            <p className="mb-3 rounded-2xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-center text-[11px] leading-relaxed text-stone-500">
              {t.has("externalMealFutureDayHint")
                ? t("externalMealFutureDayHint")
                : "Solo puedes registrar comidas fuera en hoy o días pasados."}
            </p>
          )}

          <div className="flex w-full items-center gap-2">
            <label className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-full border border-stone-200/80 bg-white py-2.5 pl-11 pr-4 text-sm text-stone-700 shadow-sm outline-none placeholder:text-stone-400 transition focus:border-[#4C6B3F] focus:ring-1 focus:ring-[#4C6B3F]"
              />
            </label>

            <div className="relative shrink-0" ref={filterMenuRef}>
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/60 bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200/50"
                aria-label={t("filterRecipesAria")}
                aria-expanded={isFilterMenuOpen}
              >
                <MoreVertical size={18} />
              </button>

              {isFilterMenuOpen ? (
                <div className="absolute right-0 z-50 mt-2 w-48 animate-fade-in overflow-hidden rounded-2xl border border-stone-100 bg-white p-2 shadow-xl">
                  {SAVED_RECIPE_FILTERS.map((chip) => {
                    const isActive = chip === activeFilter;
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setActiveFilter(chip);
                          setIsFilterMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full rounded-xl px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-[#F5EBE6] font-semibold text-[#C06A4F]"
                            : "text-stone-600 hover:bg-stone-50"
                        )}
                      >
                        {t(FILTER_LABEL_KEYS[chip])}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#FAF8F5] px-5 py-4">
          {errorMessage ? (
            <p role="alert" className="mb-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
              {t("loadingRecipes")}
            </div>
          ) : null}

          {!isLoading && filteredRecipes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-8 text-center">
              <p className="text-sm font-medium text-stone-700">{t("noRecipes")}</p>
              <p className="mt-1 text-xs text-stone-500">{t("noRecipesHint")}</p>
            </div>
          ) : null}

          {!isLoading && filteredRecipes.length > 0 ? (
            <div className="space-y-0">
              {filteredRecipes.map((recipe) => (
                <PlanRecipePickerRow
                  key={recipe.id}
                  recipe={recipe}
                  disabled={isAssigning}
                  onSelect={() => onSelectRecipe(recipe.id)}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-t border-stone-100 bg-stone-50/80 px-5 py-4">
          <p className="mb-3 text-center text-xs font-medium text-stone-500">{t("cantFindRecipe")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isAssigning}
              onClick={() => goToScannerForPlan("pantry")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[#556B2F]/20 bg-white px-3 py-3 text-xs font-semibold text-[#3e5219] shadow-sm transition",
                "hover:border-[#556B2F]/35 hover:bg-[#F0F4ED] disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              <ScanLine className="h-4 w-4 shrink-0" />
              {t("scanPantry")}
            </button>
            <button
              type="button"
              disabled={isAssigning}
              onClick={() => goToScannerForPlan("instagram")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#556B2F] to-[#6b8a3e] px-3 py-3 text-xs font-semibold text-white shadow-md transition",
                "hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              <Instagram className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {t("fromInstagram")}
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-stone-400">
            {mode === "replace"
              ? t.has("willReplaceHint")
                ? t("willReplaceHint", { meal: mealDisplay, day: dayDisplay })
                : `Se actualizará el ${mealDisplay} del ${dayDisplay}.`
              : t("willAssignHint", { meal: mealDisplay, day: dayDisplay })}
          </p>
        </div>

        {isAssigning ? (
          <div className="border-t border-stone-100 px-5 py-3 text-center text-xs font-medium text-[#556B2F]">
            <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
            {mode === "replace"
              ? t.has("replacing")
                ? t("replacing")
                : "Actualizando plato…"
              : t("assigning")}
          </div>
        ) : null}
      </div>
      </div>
      ) : null}

      <ExternalMealRegisterModal
        open={externalMode !== null}
        mode={externalMode ?? "text"}
        dayLabel={
          (WEEK_DAYS as readonly string[]).includes(dayLabel)
            ? (dayLabel as WeekDay)
            : "Lunes"
        }
        mealType={mealType}
        weekStartISO={weekStartISO}
        replacePlanEntryId={mode === "replace" ? planEntryId : undefined}
        onBusyChange={setExternalBusy}
        onClose={() => {
          if (externalBusy) return;
          setExternalMode(null);
        }}
        onRegistered={(meal) => {
          setExternalBusy(false);
          setExternalMode(null);
          onExternalMealRegistered?.(meal);
          onClose();
        }}
      />

      <PremiumUpgradeDialog
        open={showPremiumPaywall}
        onClose={() => setShowPremiumPaywall(false)}
        onUpgraded={() => {
          setShowPremiumPaywall(false);
          void refreshPremium();
        }}
        featureLabel={
          t.has("externalMealPremiumFeature")
            ? t("externalMealPremiumFeature")
            : "Registrar comida fuera (escaneo o escritura)"
        }
      />
    </>
  );
}
