"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Camera, Check, ChevronDown, Loader2, Sparkles, X } from "lucide-react";
import { AdvancedRecipeFilters } from "@/components/scanner/advanced-recipe-filters";
import { IngredientChip } from "@/components/scanner/ingredient-chip";
import { IngredientCombobox } from "@/components/scanner/ingredient-combobox";
import { BetaBadge } from "@/components/shared/beta-badge";
import { usePantryData } from "@/hooks/use-pantry-data";
import type {
  RecipeComplexity,
  RecipeCuisineStyle,
  RecipeMealType,
  RecipeServings
} from "@/lib/recipes/premium-recipe-filters";
import type { DetectedIngredient } from "@/lib/scanner/detected-ingredient";
import { selectedIngredientNames } from "@/lib/scanner/detected-ingredient";
import type { MasterIngredient } from "@/lib/pantry/types";
import { cn } from "@/lib/utils";

type ConfirmIngredientsViewProps = {
  imageUrl: string;
  ingredients: DetectedIngredient[];
  isDetecting?: boolean;
  isBusy?: boolean;
  errorMessage?: string | null;
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
  servings: RecipeServings;
  complexity: RecipeComplexity;
  onMealTypeChange: (value: RecipeMealType) => void;
  onCuisineStyleChange: (value: RecipeCuisineStyle) => void;
  onServingsChange: (value: RecipeServings) => void;
  onComplexityChange: (value: RecipeComplexity) => void;
  onToggle: (id: string) => void;
  onAddIngredient: (name: string) => void;
  onConfirm: () => void;
  onRetake: () => void;
  onBack?: () => void;
};

function BoundingBoxOverlay({
  ingredients
}: {
  ingredients: DetectedIngredient[];
}) {
  const boxes = useMemo(
    () => ingredients.filter((item) => Array.isArray(item.boundingBox)),
    [ingredients]
  );

  if (boxes.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      {boxes.map((item) => {
        const [ymin, xmin, ymax, xmax] = item.boundingBox!;
        const top = `${(ymin / 1000) * 100}%`;
        const left = `${(xmin / 1000) * 100}%`;
        const height = `${((ymax - ymin) / 1000) * 100}%`;
        const width = `${((xmax - xmin) / 1000) * 100}%`;
        const selected = item.isSelected;

        return (
          <div
            key={item.id}
            className={cn(
              "absolute rounded-xl border-2 transition",
              selected
                ? "border-[#88AB75]/90 bg-[#556B2F]/10"
                : "border-stone-300/70 bg-stone-900/15"
            )}
            style={{ top, left, width, height }}
          >
            <span
              className={cn(
                "absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm",
                selected ? "bg-[#556B2F]" : "bg-stone-500"
              )}
            >
              {selected ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ScannerFocusFrame({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[38vh] z-10 flex items-center justify-center">
      <div className="relative h-[min(42vh,18rem)] w-[min(78vw,20rem)]">
        <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-[3px] border-t-[3px] border-[#88AB75] shadow-[0_0_12px_rgba(136,171,117,0.45)]" />
        <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-[3px] border-t-[3px] border-[#88AB75] shadow-[0_0_12px_rgba(136,171,117,0.45)]" />
        <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-[3px] border-l-[3px] border-[#88AB75] shadow-[0_0_12px_rgba(136,171,117,0.45)]" />
        <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-[3px] border-r-[3px] border-[#88AB75] shadow-[0_0_12px_rgba(136,171,117,0.45)]" />

        {active ? (
          <div className="absolute inset-x-3 inset-y-3 overflow-hidden rounded-sm">
            <div className="scanner-laser-line absolute inset-x-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#B8D4A8] to-transparent shadow-[0_0_14px_4px_rgba(136,171,117,0.55)]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Vista inmersiva a pantalla completa: foto como “cámara” + overlays + bottom sheet.
 */
export function ConfirmIngredientsView({
  imageUrl,
  ingredients,
  isDetecting = false,
  isBusy = false,
  errorMessage = null,
  mealType,
  cuisineStyle,
  servings,
  complexity,
  onMealTypeChange,
  onCuisineStyleChange,
  onServingsChange,
  onComplexityChange,
  onToggle,
  onAddIngredient,
  onConfirm,
  onRetake,
  onBack
}: ConfirmIngredientsViewProps) {
  const t = useTranslations("Scanner");
  const [mounted, setMounted] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const didDragRef = useRef(false);
  const {
    masterIngredients,
    isLoading: isPantryLoading,
    error: pantryError,
    createCustomIngredient
  } = usePantryData();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleDragPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    dragStartYRef.current = event.clientY;
    didDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleDragPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (dragStartYRef.current == null) return;
    if (Math.abs(event.clientY - dragStartYRef.current) > 8) {
      didDragRef.current = true;
    }
  }, []);

  const handleDragPointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (dragStartYRef.current == null) return;
    const deltaY = event.clientY - dragStartYRef.current;
    dragStartYRef.current = null;

    if (didDragRef.current) {
      if (deltaY < -36) setIsExpanded(true);
      else if (deltaY > 36) setIsExpanded(false);
      return;
    }

    toggleExpanded();
  }, [toggleExpanded]);

  const handleExtrasToggle = useCallback(() => {
    setExtrasOpen((open) => {
      const next = !open;
      if (next) setIsExpanded(true);
      return next;
    });
  }, []);

  const selectedCount = selectedIngredientNames(ingredients).length;
  const canSearch = selectedCount > 0 && !isDetecting && !isBusy;
  const existingNames = useMemo(
    () => new Set(ingredients.map((item) => item.name.trim().toLowerCase())),
    [ingredients]
  );

  const handleComboboxSelect = useCallback(
    (ingredient: MasterIngredient) => {
      onAddIngredient(ingredient.name);
    },
    [onAddIngredient]
  );

  const handleCreateCustomIngredient = useCallback(
    async (name: string, category: MasterIngredient["category"]) => {
      const created = await createCustomIngredient(name, category);
      if (created) {
        onAddIngredient(created.name);
      }
      return created;
    },
    [createCustomIngredient, onAddIngredient]
  );

  const headline = isDetecting
    ? t.has("scanningFridge")
      ? t("scanningFridge")
      : "Escaneando tu nevera... 🔍"
    : t.has("ingredientsDetected")
      ? t("ingredientsDetected", { count: ingredients.length })
      : `Ingredientes detectados (${ingredients.length})`;

  const hint = t.has("tapToRemoveHint")
    ? t("tapToRemoveHint")
    : "Toca un ingrediente para quitarlo de la receta";

  const cta = t.has("searchRecipesWithThese")
    ? t("searchRecipesWithThese")
    : "✨ Buscar recetas con estos ingredientes";
  const ctaShort = t.has("searchRecipesCta") ? t("searchRecipesCta") : "✨ Buscar Recetas";

  const handleClose = onBack ?? onRetake;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] min-h-[100dvh] w-full overflow-hidden bg-stone-950">
      <div className="absolute inset-0 z-0 h-full w-full">
        <Image
          src={imageUrl}
          alt={t.has("scannedFridgeAlt") ? t("scannedFridgeAlt") : "Foto de tu nevera"}
          fill
          unoptimized
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/40" />
        <BoundingBoxOverlay ingredients={ingredients} />
        <ScannerFocusFrame active={isDetecting} />
      </div>

      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:bg-black/55"
          aria-label={t.has("backToPantry") ? t("backToPantry") : "Cerrar"}
        >
          <X className="h-5 w-5" strokeWidth={2.25} />
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 shadow-lg backdrop-blur-md">
          <span className="text-xs font-semibold tracking-tight text-white">
            <span>Ingenia</span>
            <span className="text-[#B8D4A8]">Food</span>
          </span>
          <BetaBadge size="sm" />
        </div>

        <button
          type="button"
          onClick={onRetake}
          disabled={isBusy || isDetecting}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 disabled:opacity-50"
          aria-label={t.has("retakePhoto") ? t("retakePhoto") : "Otra foto"}
        >
          <Camera className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>

      {/* Bottom sheet: peek ~38vh · expandido ~85vh */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-30 flex w-full flex-col rounded-t-3xl bg-white px-3 pt-1 pb-12 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] md:pb-4",
          isExpanded
            ? "h-[85vh] max-h-[85vh] overflow-hidden"
            : "h-auto max-h-[38vh] overflow-y-auto"
        )}
      >
        {/* a) Cabecera: handle + título */}
        <header className="mb-1 w-full flex-shrink-0">
          <div
            role="button"
            tabIndex={0}
            aria-label={isExpanded ? "Reducir panel" : "Expandir panel"}
            aria-expanded={isExpanded}
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={() => {
              dragStartYRef.current = null;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleExpanded();
              }
            }}
            className="touch-none select-none py-0.5"
          >
            <div className="mx-auto my-1.5 h-1.5 w-12 cursor-grab rounded-full bg-gray-300 active:cursor-grabbing" />
          </div>

          <div className="flex w-full items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold leading-snug text-stone-900">{headline}</h2>
              <p className="mt-0.5 text-xs leading-snug text-stone-500">{hint}</p>
            </div>
            {isDetecting ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[#556B2F]" />
            ) : null}
          </div>
          {errorMessage ? (
            <p className="mt-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] leading-snug text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </header>

        {/* b) Cuerpo: no estira en peek; scroll al expandir */}
        <div
          className={cn(
            "w-full space-y-2 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]",
            isExpanded ? "min-h-0 flex-1" : "flex-none"
          )}
        >
          <div className="flex w-full flex-row gap-3 overflow-x-auto py-1 no-scrollbar">
            {ingredients.map((ingredient) => (
              <IngredientChip
                key={ingredient.id}
                variant="avatar"
                ingredient={ingredient}
                onToggle={onToggle}
                disabled={isDetecting || isBusy}
              />
            ))}
            {!isDetecting && ingredients.length === 0 ? (
              <p className="px-1 text-xs text-stone-500">
                {t.has("noIngredientsDetected")
                  ? t("noIngredientsDetected")
                  : "No detectamos ingredientes. Prueba con otra foto."}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleExtrasToggle}
            className="mb-1 flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-left text-xs font-semibold text-stone-600"
          >
            <span className="truncate">
              {t.has("addMoreAfterScan") ? t("addMoreAfterScan") : "Añadir más"} ·{" "}
              {t.has("advancedFilters") ? t("advancedFilters") : "Filtros"}
            </span>
            <ChevronDown
              className={cn("h-3.5 w-3.5 shrink-0 transition", extrasOpen && "rotate-180")}
            />
          </button>

          {extrasOpen ? (
            <div className="space-y-2 border-t border-stone-100 pt-2">
              {isPantryLoading ? (
                <div className="h-10 animate-pulse rounded-full border border-stone-100 bg-stone-50" />
              ) : (
                <IngredientCombobox
                  ingredients={masterIngredients.filter(
                    (item) => !existingNames.has(item.name.trim().toLowerCase())
                  )}
                  disabled={isDetecting || isBusy}
                  onSelectIngredient={handleComboboxSelect}
                  onCreateCustomIngredient={handleCreateCustomIngredient}
                />
              )}
              {pantryError ? (
                <p className="text-xs text-red-600">{pantryError}</p>
              ) : null}
              <AdvancedRecipeFilters
                mealType={mealType}
                cuisineStyle={cuisineStyle}
                servings={servings}
                complexity={complexity}
                onMealTypeChange={onMealTypeChange}
                onCuisineStyleChange={onCuisineStyleChange}
                onServingsChange={onServingsChange}
                onComplexityChange={onComplexityChange}
                disabled={isDetecting || isBusy}
              />
            </div>
          ) : null}
        </div>

        {/* c) Footer fijo elevado (pb del sheet evita solape con nav) */}
        <div className="z-20 mt-2 flex w-full flex-shrink-0 gap-3 border-t border-gray-100 bg-white pt-2">
          <button
            type="button"
            onClick={onRetake}
            disabled={isBusy || isDetecting}
            className="flex w-1/3 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
            aria-label={t.has("retakePhoto") ? t("retakePhoto") : "Otra foto"}
          >
            <Camera className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            <span className="truncate">
              {t.has("retakePhoto") ? t("retakePhoto") : "Otra foto"}
            </span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canSearch}
            aria-label={cta}
            className="flex w-2/3 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-[#556B2F] py-2.5 text-xs font-semibold text-white transition hover:bg-[#4a5f28] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{ctaShort}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
