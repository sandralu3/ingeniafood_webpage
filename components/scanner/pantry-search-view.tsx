"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { isUnlimitedGenerationsCount } from "@/lib/generations/admin-unlimited";
import {
  Beef,
  Carrot,
  Package,
  Camera,
  Sparkles,
  SlidersHorizontal,
  Leaf,
  Lightbulb,
  Clock
} from "lucide-react";
import { AdvancedRecipeFilters } from "@/components/scanner/advanced-recipe-filters";
import { IngredientCombobox } from "@/components/scanner/ingredient-combobox";
import { MealPhotoSourceCards } from "@/components/ui/meal-photo-source-cards";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";
import type {
  RecipeCuisineStyle,
  RecipeMealType,
  RecipeServings,
  RecipeComplexity
} from "@/lib/recipes/premium-recipe-filters";

import { usePantryData } from "@/hooks/use-pantry-data";
import { cn } from "@/lib/utils";
import { emojiForIngredientName } from "@/lib/scanner/detected-ingredient";
import { isLikelyEdibleIngredientName } from "@/lib/pantry/validation";
import {
  buildFrequentIngredientCards,
  getIngredientUsageMap,
  recordIngredientUsage
} from "@/lib/pantry/frequent-ingredients";
import {
  type CategoryKey,
  type MasterIngredient,
  type PantryCategoryDb
} from "@/lib/pantry/types";

/** Nevera con alimentos — asset local (hero escáner). */
const PANTRY_HERO_IMAGE = "/images/scanner/pantry-hero-fridge.png";

export type { CategoryKey };

export const PANTRY_CATEGORIES: Record<
  CategoryKey,
  { title: string; icon: typeof Beef; dbCategory: PantryCategoryDb }
> = {
  Proteinas: {
    title: "Proteinas",
    icon: Beef,
    dbCategory: "proteinas"
  },
  Vegetales: {
    title: "Vegetales",
    icon: Carrot,
    dbCategory: "vegetales"
  },
  "Basicos de Despensa": {
    title: "Basicos de Despensa",
    icon: Package,
    dbCategory: "basicos_despensa"
  }
};

type Props = {
  selectedIngredients: string[];
  pantryImageFile: File | null;
  onPantryImageChange: (file: File | null) => void;
  onAddIngredient: (name: string) => void;
  onRemoveIngredient: (name: string) => void;
  onToggleFromCategory: (name: string) => void;
  onFindRecipes: () => void;
  errorMessage: string | null;
  onRetry: () => void;
  isBusy: boolean;
  rateLimitSecondsLeft?: number;
  generationsLeft?: number | null;
  onGenerationsExhausted?: () => void;
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
  servings: RecipeServings;
  complexity: RecipeComplexity;
  onMealTypeChange: (value: RecipeMealType) => void;
  onCuisineStyleChange: (value: RecipeCuisineStyle) => void;
  onServingsChange: (value: RecipeServings) => void;
  onComplexityChange: (value: RecipeComplexity) => void;
};

export function PantrySearchView({
  selectedIngredients,
  pantryImageFile: _pantryImageFile,
  onPantryImageChange,
  onAddIngredient,
  onRemoveIngredient: _onRemoveIngredient,
  onToggleFromCategory,
  onFindRecipes,
  errorMessage,
  onRetry,
  isBusy,
  rateLimitSecondsLeft = 0,
  generationsLeft = null,
  onGenerationsExhausted,
  mealType,
  cuisineStyle,
  servings,
  complexity,
  onMealTypeChange,
  onCuisineStyleChange,
  onServingsChange,
  onComplexityChange
}: Props) {
  const t = useTranslations("Scanner");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const hasBottomNav = pathname.startsWith("/app-recetas");
  const selectedCount = selectedIngredients.length;
  const hasSelection = selectedCount > 0;
  const scrollBottomPaddingClass = hasBottomNav ? "pb-3" : "pb-6";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    masterIngredients,
    favorites,
    isLoading: isPantryLoading,
    error: pantryError,
    createCustomIngredient
  } = usePantryData();

  const [ingredientUsage, setIngredientUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    setIngredientUsage(getIngredientUsageMap());
  }, []);

  const frequentIngredients = useMemo(
    () =>
      buildFrequentIngredientCards({
        favorites,
        masterIngredients,
        usage: ingredientUsage,
        limit: 6
      }),
    [favorites, masterIngredients, ingredientUsage]
  );

  /** Seleccionados (cualquier origen) vs frecuentes aún disponibles (máx. 6). */
  const selectedChips = useMemo(
    () =>
      selectedIngredients.map((name) => ({
        key: `selected:${name.toLowerCase()}`,
        name,
        emoji: emojiForIngredientName(name)
      })),
    [selectedIngredients]
  );

  const availableFrequentChips = useMemo(() => {
    const selectedKeys = new Set(selectedIngredients.map((n) => n.toLowerCase()));
    return frequentIngredients
      .filter((item) => !selectedKeys.has(item.name.toLowerCase()))
      .slice(0, 6)
      .map((item) => ({
        key: item.id,
        name: item.name,
        emoji: item.emoji
      }));
  }, [frequentIngredients, selectedIngredients]);

  const scansExhausted = generationsLeft !== null && generationsLeft <= 0;

  const openSourceModal = useCallback(() => {
    if (isBusy) return;
    if (scansExhausted) {
      onGenerationsExhausted?.();
      return;
    }
    setShowSourceModal(true);
  }, [isBusy, onGenerationsExhausted, scansExhausted]);

  const closeSourceModal = useCallback(() => {
    setShowSourceModal(false);
  }, []);

  const openCameraInput = useCallback(() => {
    setShowSourceModal(false);
    window.setTimeout(() => {
      cameraInputRef.current?.click();
    }, 0);
  }, []);

  const openGalleryInput = useCallback(() => {
    setShowSourceModal(false);
    window.setTimeout(() => {
      galleryInputRef.current?.click();
    }, 0);
  }, []);

  useEffect(() => {
    if (!showSourceModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowSourceModal(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showSourceModal]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/")) {
        return;
      }
      onPantryImageChange(file);
    },
    [onPantryImageChange]
  );

  const handlePrimaryAction = useCallback(() => {
    if (scansExhausted) {
      onGenerationsExhausted?.();
      return;
    }
    if (selectedIngredients.length > 0) {
      recordIngredientUsage(selectedIngredients);
      setIngredientUsage(getIngredientUsageMap());
    }
    onFindRecipes();
  }, [onFindRecipes, onGenerationsExhausted, scansExhausted, selectedIngredients]);

  const primaryLabel = scansExhausted
    ? "Pruebas gratuitas agotadas"
    : rateLimitSecondsLeft > 0
      ? `Reintentar en ${rateLimitSecondsLeft}s`
      : t.has("generateWithPantryCta")
        ? t("generateWithPantryCta")
        : "Generar receta con mi despensa";

  const scanFooter = (
    <div
      className={cn(
        "fixed inset-x-0 z-[45] border-t border-stone-100/60 bg-[#FFF8F1]/95 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md",
        hasBottomNav ? "bottom-[var(--app-bottom-nav-height)]" : "bottom-0"
      )}
    >
      <div className="mx-auto w-full max-w-md px-4">
        {isUnlimitedGenerationsCount(generationsLeft) ? (
          <p className="mb-1.5 text-center text-[11px] font-medium text-stone-400">
            {t("unlimitedScansAdmin")}
          </p>
        ) : generationsLeft !== null && generationsLeft > 0 ? (
          <p className="mb-1.5 text-center text-[11px] font-medium text-stone-400">
            {t("scansLeftToday", { count: generationsLeft })}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={isBusy || !hasSelection || scansExhausted || rateLimitSecondsLeft > 0}
          aria-label={primaryLabel}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#5C7A54] via-[#3E5A3A] to-[#2F452C] px-5 text-[13px] font-bold leading-none text-white shadow-sm shadow-[#3E5A3A]/25 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 disabled:hover:brightness-100"
        >
          <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          <span className="truncate">{primaryLabel}</span>
        </button>
      </div>
    </div>
  );

  const handleComboboxSelect = useCallback(
    (ingredient: MasterIngredient) => {
      if (!isLikelyEdibleIngredientName(ingredient.name)) return;
      if (!selectedIngredients.includes(ingredient.name)) {
        onAddIngredient(ingredient.name);
        recordIngredientUsage([ingredient.name]);
        setIngredientUsage(getIngredientUsageMap());
      }
    },
    [onAddIngredient, selectedIngredients]
  );

  const handleToggleFrequent = useCallback(
    (name: string) => {
      const already = selectedIngredients.some(
        (item) => item.toLowerCase() === name.toLowerCase()
      );
      onToggleFromCategory(name);
      if (!already) {
        recordIngredientUsage([name]);
        setIngredientUsage(getIngredientUsageMap());
      }
    },
    [onToggleFromCategory, selectedIngredients]
  );

  const handleCreateCustomIngredient = useCallback(
    async (name: string, category: MasterIngredient["category"]) => {
      const created = await createCustomIngredient(name, category);
      if (created) {
        handleComboboxSelect(created);
      }
      return created;
    },
    [createCustomIngredient, handleComboboxSelect]
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#FFF8F1]">
      <input
        ref={cameraInputRef}
        id="cameraInput"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Tomar foto con la cámara"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        id="galleryInput"
        type="file"
        accept="image/jpeg, image/png"
        className="hidden"
        aria-label="Elegir foto de la galería"
        onChange={handleFileChange}
      />

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1 pt-2 touch-pan-y [-webkit-overflow-scrolling:touch]",
          scrollBottomPaddingClass
        )}
      >
        {/* Hero Card Dual — compacto */}
        <section className="mb-3 overflow-hidden rounded-[20px] border border-stone-100/80 bg-[#FAF7F2] shadow-sm shadow-stone-200/50">
          <div className="relative flex min-h-[148px] items-stretch sm:min-h-[156px]">
            <div className="relative z-10 flex w-[48%] min-w-0 flex-col justify-center p-3.5 sm:w-[46%] sm:p-4">
              <h2 className="text-sm font-bold leading-snug tracking-tight text-[#3E5A3A] sm:text-base">
                <span aria-hidden className="mr-0.5 text-[#C49520]">
                  ✨
                </span>
                {(() => {
                  const title = t.has("chefReadyTitle")
                    ? t("chefReadyTitle").replace(/✨/g, "").trim()
                    : "Ingenia tu próxima comida";
                  const [brand, ...rest] = title.split(/\s+/);
                  return (
                    <>
                      <span className="text-[#C49520]">{brand}</span>
                      {rest.length > 0 ? ` ${rest.join(" ")}` : null}
                    </>
                  );
                })()}
                <span aria-hidden className="ml-0.5 text-[#C49520]">
                  ✨
                </span>
              </h2>
              <p className="mt-1 max-w-[180px] text-[11px] leading-tight text-stone-600">
                {t.has("chefReadySubtitle")
                  ? t("chefReadySubtitle")
                  : "Escanea tu nevera o despensa y crea recetas deliciosas al instante."}
              </p>
              <button
                type="button"
                onClick={openSourceModal}
                disabled={isBusy || scansExhausted}
                data-onboarding="scanner-camera-btn"
                className="relative mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-br from-[#5C7A54] via-[#3E5A3A] to-[#2F452C] px-4 py-2.5 text-sm font-bold leading-none text-white shadow-md shadow-[#3E5A3A]/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
              >
                <Camera className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                {t.has("scanNowCta") ? t("scanNowCta") : "Escanear ahora"}
                <Sparkles
                  className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 text-[#C49520]"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </button>
            </div>

            <div className="relative w-[52%] shrink-0 sm:w-[54%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PANTRY_HERO_IMAGE}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#FAF7F2] via-[#FAF7F2]/70 to-transparent sm:w-12" />
              <span className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 border-l-2 border-t-2 border-white/95" />
              <span className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 border-r-2 border-t-2 border-white/95" />
              <span className="pointer-events-none absolute bottom-2.5 left-2.5 h-3.5 w-3.5 border-b-2 border-l-2 border-white/95" />
              <span className="pointer-events-none absolute bottom-2.5 right-2.5 h-3.5 w-3.5 border-b-2 border-r-2 border-white/95" />
              <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#3E5A3A] shadow-md ring-2 ring-white/80">
                <Camera className="h-3.5 w-3.5 text-white" strokeWidth={2.25} aria-hidden />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-stone-200/80 border-t border-stone-100 bg-white px-0.5 py-2.5">
            {(
              [
                { key: "detect", Icon: Leaf, label: "Detecta ingredientes" },
                { key: "suggest", Icon: Lightbulb, label: "Sugiere recetas" },
                { key: "time", Icon: Clock, label: "Ahorra tiempo" }
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="flex flex-col items-center justify-center gap-1 px-0.5 text-center"
              >
                <item.Icon className="h-3.5 w-3.5 text-stone-500" strokeWidth={2} aria-hidden />
                <span className="whitespace-nowrap text-[11px] font-medium leading-none text-stone-500">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Ingredientes a la mano */}
        <section className="mb-3 space-y-2 rounded-[20px] border border-stone-100 bg-white p-3 shadow-sm shadow-stone-200/50">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-stone-800" data-onboarding="scanner-ingredients">
              {t.has("livePantryTitle") ? t("livePantryTitle") : "Ingredientes a la mano"}
            </h2>
            <p className="mt-0.5 text-[11px] text-stone-500">
              {t.has("livePantrySubtitle")
                ? t("livePantrySubtitle")
                : "Elige ingredientes frecuentes o busca nuevos"}
            </p>
          </div>

          {selectedChips.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-500">
                {t.has("selectedIngredientsLabel")
                  ? t("selectedIngredientsLabel", { count: selectedChips.length })
                  : `Seleccionados (${selectedChips.length})`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleToggleFrequent(chip.name)}
                    aria-label={t("removeIngredientAria", { name: chip.name })}
                    className="flex items-center gap-1 rounded-full border border-[#3E5A3A]/30 bg-[#3E5A3A]/10 px-2.5 py-1 text-xs font-semibold text-[#3E5A3A] transition hover:bg-[#3E5A3A]/15"
                  >
                    <span aria-hidden className="text-sm leading-none">
                      {chip.emoji}
                    </span>
                    <span className="capitalize">{chip.name.toLocaleLowerCase("es")}</span>
                    <span className="text-[10px] text-[#3E5A3A] hover:opacity-80" aria-hidden>
                      ✕
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {availableFrequentChips.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {availableFrequentChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleToggleFrequent(chip.name)}
                  aria-label={`Añadir ${chip.name}`}
                  className="flex min-h-[2.5rem] w-full min-w-0 items-center justify-between gap-1 rounded-xl border border-stone-200/70 bg-stone-50 px-3 py-1.5 text-left text-xs text-stone-700 transition hover:bg-stone-100"
                >
                  <span className="flex min-w-0 items-center gap-1">
                    <span aria-hidden className="shrink-0 text-sm leading-none">
                      {chip.emoji}
                    </span>
                    <span className="min-w-0 flex-1 text-[10px] font-medium leading-tight capitalize">
                      {chip.name.toLocaleLowerCase("es")}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm leading-none text-stone-400" aria-hidden>
                    +
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {isPantryLoading ? (
            <div className="h-10 animate-pulse rounded-xl border border-stone-200/60 bg-stone-50" />
          ) : (
            <IngredientCombobox
              ingredients={masterIngredients}
              disabled={isBusy}
              variant="pantry"
              onSelectIngredient={handleComboboxSelect}
              onCreateCustomIngredient={handleCreateCustomIngredient}
            />
          )}
          {pantryError ? <p className="text-xs text-red-600">{pantryError}</p> : null}

          <button
            type="button"
            onClick={() => setShowAdvancedFilters((v) => !v)}
            aria-pressed={showAdvancedFilters}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              showAdvancedFilters
                ? "border-[#3E5A3A] bg-[#3E5A3A] text-white shadow-sm"
                : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
            )}
          >
            <SlidersHorizontal className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="whitespace-nowrap">
              {t.has("moreFilters") ? t("moreFilters") : "Más filtros"}
            </span>
          </button>
        </section>

        {showAdvancedFilters ? (
          <div className="mb-3">
            <AdvancedRecipeFilters
              mealType={mealType}
              cuisineStyle={cuisineStyle}
              servings={servings}
              complexity={complexity}
              onMealTypeChange={onMealTypeChange}
              onCuisineStyleChange={onCuisineStyleChange}
              onServingsChange={onServingsChange}
              onComplexityChange={onComplexityChange}
              disabled={isBusy}
              selectedIngredientNames={selectedIngredients}
            />
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
          >
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={onRetry}
              disabled={isBusy || !hasSelection}
              className="self-start rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"
            >
              {rateLimitSecondsLeft > 0
                ? `Reintentar en ${rateLimitSecondsLeft}s`
                : "Reintentar ahora"}
            </button>
          </div>
        ) : null}

        {/* Reserva scroll bajo el CTA fijo (créditos + botón) */}
        <div
          aria-hidden
          className="pointer-events-none w-full shrink-0"
          style={{
            height: "calc(var(--app-scan-footer-height) + 1.25rem)"
          }}
        />
      </div>

      {isMounted && scanFooter ? createPortal(scanFooter, document.body) : null}

      {showSourceModal ? (
        <>
          <button
            type="button"
            aria-label="Cerrar selector de origen de foto"
            className="fixed inset-0 z-[70] bg-black/40"
            onClick={closeSourceModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="source-modal-title"
            className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl border-t border-stone-100 bg-white p-3 pb-5 shadow-2xl"
          >
            <SwipeToCloseHandle onClose={closeSourceModal} disabled={false} thresholdPx={70} />
            <div id="source-modal-title" className="sr-only">
              {t.has("addPantryPhotoTitle")
                ? t("addPantryPhotoTitle")
                : "Añadir foto de tu despensa"}
            </div>
            <MealPhotoSourceCards
              showCancel
              takePhotoLabel={
                t.has("takePhotoLabel") ? t("takePhotoLabel") : "Tomar foto"
              }
              galleryLabel={
                t.has("chooseGalleryLabel")
                  ? t("chooseGalleryLabel")
                  : "Elegir de galería"
              }
              takePhotoHint={
                t.has("photoCameraHint")
                  ? t("photoCameraHint")
                  : "Abre la cámara ahora"
              }
              galleryHint={
                t.has("photoGalleryHint")
                  ? t("photoGalleryHint")
                  : "Usa una foto que ya tengas"
              }
              sectionLabel={
                t.has("addPantryPhotoTitle")
                  ? t("addPantryPhotoTitle")
                  : "Añadir foto de tu despensa"
              }
              cancelLabel={
                t.has("cancelPhotoSource") ? t("cancelPhotoSource") : "Cancelar"
              }
              onTakePhoto={openCameraInput}
              onChooseGallery={openGalleryInput}
              onCancel={closeSourceModal}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
