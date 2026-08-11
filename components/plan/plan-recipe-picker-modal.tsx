"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Camera,
  Info,
  Loader2,
  PenLine,
  Search,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
  X
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ExternalMealRegisterModal } from "@/components/plan/external-meal-register-modal";
import { PlanRecipePickerCard } from "@/components/plan/plan-recipe-picker-card";
import type { PlanMeal } from "@/components/plan/plan-meal-card";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { PlanRecipePickerSkeleton } from "@/components/skeletons/plan-recipe-picker-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePremium } from "@/hooks/use-premium";
import type { RecipePickerItem } from "@/lib/plan/plan-service";
import { WEEK_DAYS, type MealType, type WeekDay } from "@/lib/plan/constants";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { savePendingPlanAssignment } from "@/lib/plan/plan-pending-assignment";
import {
  filterPickerRecipes,
  SAVED_RECIPE_FILTERS,
  type SavedRecipeFilter
} from "@/lib/recipes/saved-recipes-filter";
import { canRegisterExternalMealForPlanDay } from "@/lib/plan/week-utils";
import { cn } from "@/lib/utils";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";

type PickerTab = "system" | "saved";

type PlanRecipePickerModalProps = {
  open: boolean;
  dayLabel: string;
  mealType: MealType;
  weekStartISO: string;
  /** add = nueva comida; replace = cambiar plato existente */
  mode?: "add" | "replace";
  /** Entrada del plan a sustituir cuando mode = "replace" */
  planEntryId?: string;
  /** Platos ya en este bloque (desayuno/almuerzo/cena) para análisis acumulado. */
  existingSlotMeals?: PlanMeal[];
  /** Recetas del usuario (escaneo / importación). */
  recipes: RecipePickerItem[];
  /** Banco de recetas del sistema. */
  systemRecipes?: RecipePickerItem[];
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

function defaultFilterForMeal(mealType: MealType): SavedRecipeFilter {
  switch (mealType) {
    case "Desayuno":
      return "Desayunos";
    case "Almuerzo":
      return "Almuerzos";
    case "Cena":
      return "Cenas";
    default:
      return "Todas";
  }
}

export function PlanRecipePickerModal({
  open,
  dayLabel,
  mealType,
  weekStartISO,
  mode = "add",
  planEntryId,
  existingSlotMeals = [],
  recipes,
  systemRecipes = [],
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
  const [activeTab, setActiveTab] = useState<PickerTab>("system");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<SavedRecipeFilter>("Todas");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [externalMode, setExternalMode] = useState<"photo" | "text" | null>(null);
  const [externalBusy, setExternalBusy] = useState(false);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false);
  const [showScanConfirm, setShowScanConfirm] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const dayDisplay =
    dayLabel && (WEEK_DAYS as readonly string[]).includes(dayLabel)
      ? t(`days.${dayLabel as WeekDay}`)
      : dayLabel;
  const mealDisplay = t(`meals.${mealType}`);

  const assignHint =
    mode === "replace"
      ? t.has("willReplaceHint")
        ? t("willReplaceHint", { meal: mealDisplay, day: dayDisplay })
        : `Se actualizará el ${mealDisplay} del ${dayDisplay}.`
      : t("willAssignHint", { meal: mealDisplay, day: dayDisplay });

  useEffect(() => {
    if (!open) return;
    setActiveTab(systemRecipes.length > 0 ? "system" : "saved");
    setSearchTerm("");
    setActiveFilter(defaultFilterForMeal(mealType));
    setIsFilterMenuOpen(false);
    setShowScanConfirm(false);
  }, [open, mealType, systemRecipes.length]);

  useEffect(() => {
    if (open) return;
    setSearchTerm("");
    setActiveFilter("Todas");
    setIsFilterMenuOpen(false);
    setActiveTab("system");
    setShowScanConfirm(false);
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

  const listScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listScrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab, open]);

  const filterOpts = useMemo(
    () => ({ searchTerm, categoryFilter: activeFilter }),
    [activeFilter, searchTerm]
  );

  const filteredSystem = useMemo(
    () => filterPickerRecipes(systemRecipes, filterOpts),
    [filterOpts, systemRecipes]
  );
  const filteredSaved = useMemo(
    () => filterPickerRecipes(recipes, filterOpts),
    [filterOpts, recipes]
  );

  const canRegisterExternal = useMemo(() => {
    if (!weekStartISO || !(WEEK_DAYS as readonly string[]).includes(dayLabel)) {
      return false;
    }
    return canRegisterExternalMealForPlanDay(weekStartISO, dayLabel as WeekDay);
  }, [dayLabel, weekStartISO]);

  const proceedToScannerForPlan = () => {
    savePendingPlanAssignment({
      dayLabel: dayLabel as WeekDay,
      mealType,
      weekStartISO,
      ...(mode === "replace" && planEntryId ? { planEntryId } : {})
    });
    onClose();
    router.push(APP_ROUTES.scanner);
  };

  const handleExternalMealClick = (registerMode: "photo" | "text") => {
    if (isPremiumLoading) return;
    if (!isPremium) {
      setShowPremiumPaywall(true);
      return;
    }
    setExternalMode(registerMode);
  };

  const systemTabLabel = t.has("pickerTabSystem") ? t("pickerTabSystem") : "Sugeridas";
  const savedTabLabel = t.has("pickerTabSaved") ? t("pickerTabSaved") : "Mis recetas";
  const emptySavedTitle = t.has("pickerSavedEmptyTitle")
    ? t("pickerSavedEmptyTitle")
    : "Tu recetario personal está vacío";
  const emptySavedHint = t.has("pickerSavedEmptyHint")
    ? t("pickerSavedEmptyHint")
    : "Escanea tus ingredientes o importa recetas para guardarlas aquí.";
  const emptySystemTitle = t.has("pickerSystemEmptyTitle")
    ? t("pickerSystemEmptyTitle")
    : "No hay recetas sugeridas";
  const emptySystemHint = t.has("pickerSystemEmptyHint")
    ? t("pickerSystemEmptyHint")
    : "Prueba otro filtro o busca por nombre.";
  const slotTitle = t.has("pickerSlotTitle")
    ? t("pickerSlotTitle", { meal: mealDisplay, day: dayDisplay })
    : `${mealDisplay} del ${dayDisplay}`;
  const registerToggleLabel = t.has("externalMealAlreadyAteLabel")
    ? t("externalMealAlreadyAteLabel")
    : "¿Ya comiste? Regístralo aquí";
  const scanConfirmTitle = t.has("scanPantryConfirmTitle")
    ? t("scanPantryConfirmTitle")
    : "Crear receta para este hueco";
  const scanConfirmDescription = t.has("scanPantryConfirmDescription")
    ? t("scanPantryConfirmDescription", { meal: mealDisplay, day: dayDisplay })
    : `Vas a crear una receta para el ${mealDisplay} del ${dayDisplay}. Al guardar, se asignará a este hueco.`;
  const scanConfirmContinue = t.has("scanPantryConfirmContinue")
    ? t("scanPantryConfirmContinue")
    : "Continuar";
  const systemSectionLabel = t.has("pickerSystemSectionLabel")
    ? t("pickerSystemSectionLabel")
    : "✨ Sugeridas de Sandra";
  const savedSectionLabel = t.has("pickerSavedSectionLabel")
    ? t("pickerSavedSectionLabel")
    : "📖 Mis Recetas";
  const scanPlateTitle = t.has("pickerActionScanPlateTitle")
    ? t("pickerActionScanPlateTitle")
    : "Tomar foto del plato";
  const scanPlateSubtitle = t.has("pickerActionScanPlateSubtitle")
    ? t("pickerActionScanPlateSubtitle")
    : "Toma una foto y lo registramos por ti";
  const quickLogTitle = t.has("pickerActionQuickLogTitle")
    ? t("pickerActionQuickLogTitle")
    : "Describir lo que comí";
  const quickLogSubtitle = t.has("pickerActionQuickLogSubtitle")
    ? t("pickerActionQuickLogSubtitle")
    : "Añade tu comida en segundos";
  const scanPantryTitle = t.has("pickerActionScanPantryTitle")
    ? t("pickerActionScanPantryTitle")
    : "Escanear despensa";
  const scanPantrySubtitle = t.has("pickerActionScanPantrySubtitle")
    ? t("pickerActionScanPantrySubtitle")
    : "Detectamos lo que tienes y te damos ideas";
  const isCategoryFilterActive = activeFilter !== "Todas";
  const filterSummary = isCategoryFilterActive ? t(FILTER_LABEL_KEYS[activeFilter]) : "";
  const clearFilterLabel = t.has("clearFilter") ? t("clearFilter") : "Quitar";

  if (!open && externalMode === null) return null;

  const activeRecipes = activeTab === "system" ? filteredSystem : filteredSaved;
  const activeSectionLabel =
    activeTab === "system" ? systemSectionLabel : savedSectionLabel;
  const showEmptySaved =
    activeTab === "saved" && recipes.length === 0 && !searchTerm.trim();
  const showEmptyFiltered = !isLoading && activeRecipes.length === 0 && !showEmptySaved;

  const renderRecipeGrid = (items: RecipePickerItem[]) => (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {items.map((recipe) => (
        <PlanRecipePickerCard
          key={recipe.id}
          recipe={recipe}
          disabled={isAssigning}
          onSelect={() => onSelectRecipe(recipe.id)}
        />
      ))}
    </div>
  );

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/45 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-picker-title"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-neutral-100 bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="shrink-0 px-5 pt-0 pb-0">
              <SwipeToCloseHandle
                onClose={requestClose}
                disabled={externalBusy || isAssigning}
              />
            </div>

            <div className="flex shrink-0 items-start justify-between gap-3 bg-white px-5 pb-3 pt-1">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B07A4F]">
                  {mode === "replace"
                    ? t.has("pickerReplaceTitle")
                      ? t("pickerReplaceTitle")
                      : "Cambiar plato"
                    : t.has("pickerChooseEyebrow")
                      ? t("pickerChooseEyebrow")
                      : "Elegir receta"}
                </p>
                <h2
                  id="plan-picker-title"
                  className="mt-1 font-serif text-[1.35rem] font-semibold leading-tight text-stone-900"
                >
                  {slotTitle}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  {mode === "replace"
                    ? t.has("pickerReplaceSubtitle")
                      ? t("pickerReplaceSubtitle")
                      : "Elige otra receta para este hueco."
                    : t.has("pickerSubtitleTabs")
                      ? t("pickerSubtitleTabs")
                      : "Elige una sugerida del sistema o una de tu recetario."}
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

            <div className="relative z-20 shrink-0 bg-white">
              <div className="space-y-2 border-b border-stone-200/80 bg-[#FAF8F5] px-5 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-300/70" />
                  <p className="shrink-0 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    {registerToggleLabel}
                  </p>
                  <div className="h-px flex-1 bg-stone-300/70" />
                </div>

                <div
                  className={cn(
                    "grid gap-2",
                    canRegisterExternal
                      ? "grid-cols-3 max-[360px]:grid-cols-1"
                      : "grid-cols-1"
                  )}
                >
                  <button
                    type="button"
                    disabled={isAssigning}
                    onClick={() => setShowScanConfirm(true)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl border border-[#556B2F]/15 bg-[#F0F4ED] px-1.5 py-2 text-center transition",
                      "hover:bg-[#e7eedf] disabled:cursor-not-allowed disabled:opacity-60",
                      canRegisterExternal ? "" : "sm:mx-auto sm:w-full sm:max-w-xs"
                    )}
                  >
                    <WandSparkles className="h-4 w-4 text-[#556B2F]" strokeWidth={1.75} />
                    <span className="text-[10px] font-semibold leading-tight text-[#3e5219]">
                      {scanPantryTitle}
                    </span>
                    <span className="text-[8px] leading-tight text-[#3e5219]/70">
                      {scanPantrySubtitle}
                    </span>
                  </button>

                  {canRegisterExternal ? (
                    <>
                      <button
                        type="button"
                        disabled={isAssigning || isPremiumLoading}
                        onClick={() => handleExternalMealClick("photo")}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-xl border border-sky-100 bg-sky-50/70 px-1.5 py-2 text-center transition",
                          "hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                        )}
                      >
                        <Camera className="h-4 w-4 text-sky-700" strokeWidth={1.75} />
                        <span className="text-[10px] font-semibold leading-tight text-sky-900">
                          {scanPlateTitle}
                        </span>
                        <span className="text-[8px] leading-tight text-sky-800/70">
                          {scanPlateSubtitle}
                        </span>
                        {!isPremium ? (
                          <span className="text-[8px] font-bold tracking-wide text-amber-800">
                            👑 PRO
                          </span>
                        ) : null}
                      </button>

                      <button
                        type="button"
                        disabled={isAssigning || isPremiumLoading}
                        onClick={() => handleExternalMealClick("text")}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-xl border border-violet-100 bg-violet-50/70 px-1.5 py-2 text-center transition",
                          "hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                        )}
                      >
                        <PenLine className="h-4 w-4 text-violet-700" strokeWidth={1.75} />
                        <span className="text-[10px] font-semibold leading-tight text-violet-900">
                          {quickLogTitle}
                        </span>
                        <span className="text-[8px] leading-tight text-violet-800/70">
                          {quickLogSubtitle}
                        </span>
                        {!isPremium ? (
                          <span className="text-[8px] font-bold tracking-wide text-amber-800">
                            👑 PRO
                          </span>
                        ) : null}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-200" />
                  <p className="shrink-0 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    {t.has("pickerBrowseSectionLabel")
                      ? t("pickerBrowseSectionLabel")
                      : "Buscar una receta"}
                  </p>
                  <div className="h-px flex-1 bg-stone-200" />
                </div>

              <div
                className="mx-auto grid w-full max-w-md grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1"
                role="tablist"
                aria-label={t.has("pickerTabsAria") ? t("pickerTabsAria") : "Origen de recetas"}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "system"}
                  onClick={() => setActiveTab("system")}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition",
                    activeTab === "system"
                      ? "bg-white text-[#3e5219] shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                  <span className="truncate">{systemTabLabel}</span>
                  <span className="rounded-full bg-stone-200/80 px-1.5 text-[9px] font-bold text-stone-600">
                    {systemRecipes.length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "saved"}
                  onClick={() => setActiveTab("saved")}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition",
                    activeTab === "saved"
                      ? "bg-white text-[#3e5219] shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                  <span className="truncate">{savedTabLabel}</span>
                  <span className="rounded-full bg-stone-200/80 px-1.5 text-[9px] font-bold text-stone-600">
                    {recipes.length}
                  </span>
                </button>
              </div>

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
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-colors",
                      isCategoryFilterActive
                        ? "border-[#4C6B3F]/40 bg-[#F0F4ED] text-[#3e5219]"
                        : "border-stone-200/70 bg-white text-stone-600 hover:bg-stone-50"
                    )}
                    aria-label={t("filterRecipesAria")}
                    aria-expanded={isFilterMenuOpen}
                  >
                    <SlidersHorizontal size={16} strokeWidth={1.75} />
                    {isCategoryFilterActive ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#556B2F] px-1 text-[9px] font-bold text-white">
                        1
                      </span>
                    ) : null}
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

              {isCategoryFilterActive && filterSummary ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#556B2F]/15 bg-[#F0F4ED] px-3 py-2">
                  <p className="min-w-0 text-[12px] font-semibold text-[#3e5219]">
                    {t.has("filterActiveLabel")
                      ? t("filterActiveLabel", { filter: filterSummary })
                      : `Filtro: ${filterSummary}`}
                    <span className="ml-1.5 font-medium text-[#556B2F]/80">
                      ·{" "}
                      {t.has("filterActiveCount")
                        ? t("filterActiveCount", { count: activeRecipes.length })
                        : `${activeRecipes.length} resultados`}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("Todas")}
                    className="shrink-0 text-[11px] font-semibold text-[#556B2F] underline-offset-2 hover:underline"
                  >
                    {clearFilterLabel}
                  </button>
                </div>
              ) : null}
              </div>
            </div>

            <div
              ref={listScrollRef}
              className="min-h-0 flex-1 overflow-y-auto bg-[#FAF8F5] px-5 py-4"
            >
              {errorMessage ? (
                <p role="alert" className="mb-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}

              {isLoading ? (
                <PlanRecipePickerSkeleton />
              ) : (
                <div className="space-y-4">
                  <section>
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-stone-800">{activeSectionLabel}</p>
                    </div>

                    {showEmptySaved ? (
                      <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-3 py-6 text-center">
                        <p className="text-sm font-semibold text-stone-800">{emptySavedTitle}</p>
                        <p className="mt-1 text-xs leading-relaxed text-stone-500">{emptySavedHint}</p>
                      </div>
                    ) : null}

                    {showEmptyFiltered ? (
                      <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-3 py-6 text-center">
                        <p className="text-sm font-medium text-stone-700">
                          {activeTab === "system" ? emptySystemTitle : t("noRecipes")}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {activeTab === "system" ? emptySystemHint : t("noRecipesHint")}
                        </p>
                      </div>
                    ) : null}

                    {!showEmptySaved && !showEmptyFiltered
                      ? renderRecipeGrid(activeRecipes)
                      : null}
                  </section>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-stone-100 bg-white px-5 py-3">
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" strokeWidth={2} />
                <p className="text-xs font-medium leading-relaxed text-amber-950">{assignHint}</p>
              </div>
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

      <ConfirmDialog
        open={showScanConfirm}
        onOpenChange={setShowScanConfirm}
        title={scanConfirmTitle}
        description={scanConfirmDescription}
        confirmLabel={scanConfirmContinue}
        cancelLabel={tCommon("cancel")}
        onConfirm={() => {
          setShowScanConfirm(false);
          proceedToScannerForPlan();
        }}
      />

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
        existingSlotMeals={existingSlotMeals}
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
            : "Registrar lo que comí (escaneo o escritura)"
        }
      />
    </>
  );
}
