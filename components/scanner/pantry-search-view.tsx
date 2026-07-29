"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { isUnlimitedGenerationsCount } from "@/lib/generations/admin-unlimited";
import {
  X,
  Plus,
  Check,
  Egg,
  Leaf,
  Beef,
  Carrot,
  Sparkles,
  Package,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Camera
} from "lucide-react";
import { AdvancedRecipeFilters } from "@/components/scanner/advanced-recipe-filters";
import { IngredientCombobox } from "@/components/scanner/ingredient-combobox";
import type {
  RecipeCuisineStyle,
  RecipeMealType,
  RecipeServings,
  RecipeComplexity
} from "@/lib/recipes/premium-recipe-filters";

import { usePantryData } from "@/hooks/use-pantry-data";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";
import {
  CATEGORY_DB_TO_UI,
  type CategoryKey,
  type MasterIngredient,
  type PantryCategoryDb
} from "@/lib/pantry/types";

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

const CATEGORY_KEYS: CategoryKey[] = ["Proteinas", "Vegetales", "Basicos de Despensa"];

const CATEGORY_TAB_META: Record<
  CategoryKey,
  { labelKey: "categoryProteins" | "categoryVegetables" | "categoryBasics"; emoji: string }
> = {
  Proteinas: { labelKey: "categoryProteins", emoji: "🥩" },
  Vegetales: { labelKey: "categoryVegetables", emoji: "🥦" },
  "Basicos de Despensa": { labelKey: "categoryBasics", emoji: "🌾" }
};

const QUICK_SUGGESTIONS = [
  { key: "huevos", label: "Huevos", emoji: "🥚" },
  { key: "pollo", label: "Pollo", emoji: "🍗" },
  { key: "tomate", label: "Tomate", emoji: "🍅" },
  { key: "queso", label: "Queso", emoji: "🧀" },
  { key: "arroz", label: "Arroz", emoji: "🍚" }
] as const;

function pillIconFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("egg") || n.includes("huevo")) return Egg;
  if (n.includes("spinach") || n.includes("espinaca")) return Leaf;
  if (n.includes("chicken") || n.includes("pollo")) return Beef;
  if (n.includes("avocado") || n.includes("palta")) return Sparkles;
  return Leaf;
}

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
  onRemoveIngredient,
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
  const { isPaidPremium, isLoading: isPremiumLoading } = usePremium();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const hasBottomNav = pathname.startsWith("/app-recetas");
  const selectedCount = selectedIngredients.length;
  const hasSelection = selectedCount > 0;
  const scrollBottomPaddingClass = hasBottomNav
    ? hasSelection
      ? "pb-[calc(var(--app-bottom-nav-height)+var(--app-scan-footer-height))]"
      : "pb-[calc(var(--app-bottom-nav-height)+0.75rem)]"
    : hasSelection
      ? "pb-28"
      : "pb-6";

  const canUseDishPhoto = isPaidPremium;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    masterIngredients,
    favorites,
    favoriteIngredientIds,
    isLoading: isPantryLoading,
    error: pantryError,
    addFavorite,
    createCustomIngredient,
    removeFavorite
  } = usePantryData();

  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);

  const masterByName = useMemo(() => {
    const map = new Map<string, MasterIngredient>();
    masterIngredients.forEach((item) => map.set(item.name.toLowerCase(), item));
    return map;
  }, [masterIngredients]);

  const favoritesByCategory = useMemo(() => {
    const grouped: Record<CategoryKey, typeof favorites> = {
      Proteinas: [],
      Vegetales: [],
      "Basicos de Despensa": []
    };
    favorites.forEach((fav) => {
      const uiCategory = CATEGORY_DB_TO_UI[fav.category];
      grouped[uiCategory].push(fav);
    });
    return grouped;
  }, [favorites]);

  const scansExhausted = generationsLeft !== null && generationsLeft <= 0;

  const openSourceModal = useCallback(() => {
    if (isBusy) return;
    setShowSourceModal(true);
  }, [isBusy]);

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

  const resolveQuickName = useCallback(
    (suggestion: (typeof QUICK_SUGGESTIONS)[number]) => {
      const match = masterIngredients.find((item) => {
        const n = item.name.toLowerCase();
        return n === suggestion.key || n.includes(suggestion.key);
      });
      return match?.name ?? suggestion.label;
    },
    [masterIngredients]
  );

  const handleQuickAdd = useCallback(
    (suggestion: (typeof QUICK_SUGGESTIONS)[number]) => {
      const name = resolveQuickName(suggestion);
      if (!selectedIngredients.some((item) => item.toLowerCase() === name.toLowerCase())) {
        onAddIngredient(name);
      }
    },
    [onAddIngredient, resolveQuickName, selectedIngredients]
  );

  const handlePrimaryAction = useCallback(() => {
    if (scansExhausted) {
      onGenerationsExhausted?.();
      return;
    }
    onFindRecipes();
  }, [onFindRecipes, onGenerationsExhausted, scansExhausted]);

  const primaryLabel = scansExhausted
    ? "Pruebas gratuitas agotadas"
    : rateLimitSecondsLeft > 0
      ? `Reintentar en ${rateLimitSecondsLeft}s`
      : t.has("generateWithCount")
        ? t("generateWithCount", { count: selectedCount })
        : `✨ Generar Recetas (${selectedCount} ingredientes)`;

  const scanFooter = hasSelection ? (
    <div
      className={cn(
        "fixed inset-x-0 z-[45] border-t border-stone-200/70 bg-[#FAF9F6]/95 pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] backdrop-blur-md animate-slide-up",
        hasBottomNav ? "bottom-[var(--app-bottom-nav-height)]" : "bottom-0"
      )}
    >
      <div className="mx-auto w-full max-w-md px-4 pb-3">
        {isUnlimitedGenerationsCount(generationsLeft) ? (
          <span className="mb-1.5 block text-center text-[10px] text-stone-400">
            {t("unlimitedScansAdmin")}
          </span>
        ) : generationsLeft !== null && generationsLeft > 0 ? (
          <span className="mb-1.5 block text-center text-[10px] text-stone-400">
            {t("scansLeftToday", { count: generationsLeft })}
          </span>
        ) : (
          <span className="mb-1.5 block" />
        )}

        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={isBusy}
          aria-label={primaryLabel}
          className="w-full rounded-2xl bg-[#4D6638] py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#42572f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  ) : null;

  const handleComboboxSelect = useCallback(
    (ingredient: MasterIngredient) => {
      if (!selectedIngredients.includes(ingredient.name)) {
        onAddIngredient(ingredient.name);
      }
    },
    [onAddIngredient, selectedIngredients]
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

  const handleToggleFavorite = useCallback(
    async (ingredientName: string) => {
      const ingredient = masterByName.get(ingredientName.toLowerCase());
      if (!ingredient) return;

      if (favoriteIngredientIds.has(ingredient.id)) {
        const favorite = favorites.find((fav) => fav.ingredientId === ingredient.id);
        if (favorite) {
          await removeFavorite(favorite.favoriteId);
        }
        return;
      }

      await addFavorite(ingredient.id);
    },
    [addFavorite, favoriteIngredientIds, favorites, masterByName, removeFavorite]
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#FAF9F6]">
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
        {/* Hero CTA: Escanear Nevera / Despensa */}
        <button
          type="button"
          onClick={openSourceModal}
          disabled={isBusy}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#4D6638] via-[#435931] to-[#384B29] p-4 text-left text-white shadow-lg shadow-[#4D6638]/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white shadow-inner backdrop-blur-md"
            aria-hidden
          >
            <Camera className="h-[1.125rem] w-[1.125rem] text-lg text-white" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="mb-1 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/95">
              {t.has("visionAiBadge") ? t("visionAiBadge") : "✨ Escáner Inteligente"}
            </span>
            <span className="block text-sm font-semibold leading-snug text-white">
              {t.has("scanPantryBannerTitle")
                ? t("scanPantryBannerTitle")
                : "Escanear Nevera o Despensa"}
            </span>
            <span className="mt-0.5 block text-xs font-normal leading-snug text-white/80">
              {t.has("scanPantryHeroSubtitle")
                ? t("scanPantryHeroSubtitle")
                : "Toma una foto y detectaremos tus ingredientes al instante"}
            </span>
          </span>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-white/90"
            aria-hidden
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </button>

        {/* Añadir a mano + sugerencias (bloque unificado) */}
        <section className="mb-3 space-y-2">
          {isPantryLoading ? (
            <div className="h-10 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
          ) : (
            <IngredientCombobox
              ingredients={masterIngredients}
              disabled={isBusy}
              onSelectIngredient={handleComboboxSelect}
              onCreateCustomIngredient={handleCreateCustomIngredient}
            />
          )}
          {pantryError ? <p className="text-xs text-red-600">{pantryError}</p> : null}

          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((suggestion) => {
              const name = resolveQuickName(suggestion);
              const alreadyAdded = selectedIngredients.some(
                (item) => item.toLowerCase() === name.toLowerCase()
              );
              return (
                <button
                  key={suggestion.key}
                  type="button"
                  disabled={isBusy || alreadyAdded}
                  onClick={() => handleQuickAdd(suggestion)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border-0 px-2.5 py-1 text-[11px] font-medium transition",
                    alreadyAdded
                      ? "bg-[#4D6638]/15 text-[#4D6638]"
                      : "bg-slate-100/80 text-slate-700 hover:bg-slate-200/80"
                  )}
                >
                  <span aria-hidden>{suggestion.emoji}</span>
                  {suggestion.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Tu Despensa — sin cajas anidadas */}
        <section className="mb-3">
          <h2 className="mb-1 mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            {t.has("yourPantryTitle") ? t("yourPantryTitle") : "Tu Despensa"} ({selectedCount})
          </h2>

          {selectedIngredients.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selectedIngredients.map((name) => {
                const Icon = pillIconFor(name);
                const ingredient = masterByName.get(name.toLowerCase());
                const isFavorite = ingredient ? favoriteIngredientIds.has(ingredient.id) : false;
                return (
                  <div
                    key={name}
                    className="flex items-center gap-0.5 rounded-lg bg-[#4D6638]/10 py-1 pl-2 pr-0.5 text-[11px] font-medium text-[#4D6638]"
                  >
                    <button
                      type="button"
                      onClick={() => onRemoveIngredient(name)}
                      className="flex items-center gap-1"
                    >
                      <Icon className="h-3 w-3 shrink-0 opacity-70" />
                      {name}
                    </button>
                    {ingredient ? (
                      <button
                        type="button"
                        onClick={() => void handleToggleFavorite(name)}
                        className="rounded-md p-1 transition hover:bg-white/60"
                        aria-label={
                          isFavorite
                            ? "Quitar de favoritos de despensa"
                            : "Guardar en favoritos de despensa"
                        }
                      >
                        {isFavorite ? (
                          <BookmarkCheck className="h-3 w-3 text-[#4D6638]" />
                        ) : (
                          <Bookmark className="h-3 w-3 opacity-60" />
                        )}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onRemoveIngredient(name)}
                      className="rounded-md p-1 text-slate-400 transition hover:bg-white/60 hover:text-slate-600"
                      aria-label={t("removeIngredientAria", { name })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORY_KEYS.map((key) => {
              const isActive = activeCategory === key;
              const meta = CATEGORY_TAB_META[key];
              const categoryLabel = t(meta.labelKey);
              const count = favoritesByCategory[key].length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCategory((current) => (current === key ? null : key))}
                  aria-pressed={isActive}
                  aria-label={t("viewFavoritesAria", { category: categoryLabel })}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                    isActive
                      ? "border-[#4D6638] bg-[#4D6638]/10 text-[#4D6638]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  <span aria-hidden className="text-[11px] leading-none">
                    {meta.emoji}
                  </span>
                  <span>{categoryLabel}</span>
                  {count > 0 ? (
                    <span className="text-[10px] opacity-70">{count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {activeCategory === null ? null : favoritesByCategory[activeCategory].length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {favoritesByCategory[activeCategory].map((fav) => {
                const isSelected = selectedIngredients.includes(fav.name);
                return (
                  <button
                    key={fav.favoriteId}
                    type="button"
                    onClick={() => onToggleFromCategory(fav.name)}
                    aria-pressed={isSelected}
                    aria-label={
                      isSelected
                        ? `Quitar ${fav.name} de la selección`
                        : `Añadir ${fav.name} al escaneo`
                    }
                    className={cn(
                      "flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition",
                      isSelected
                        ? "bg-[#4D6638]/10 text-[#4D6638]"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span className="min-w-0 truncate pr-2">{fav.name}</span>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                        isSelected ? "bg-[#4D6638] text-white" : "bg-white text-[#4D6638]"
                      )}
                      aria-hidden
                    >
                      {isSelected ? (
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      ) : (
                        <Plus className="h-3 w-3" strokeWidth={2.5} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-slate-500">
              {t("noFavoritesInCategory", {
                category: t(CATEGORY_TAB_META[activeCategory].labelKey).toLowerCase()
              })}
            </p>
          )}
        </section>

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

        {!isPremiumLoading && canUseDishPhoto ? (
          <p
            role="status"
            className="mb-3 mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-amber-200/50 bg-amber-50/80 px-3 py-1.5 text-center text-[11px] font-medium text-amber-800"
          >
            {t.has("proBenefitChip")
              ? t("proBenefitChip")
              : "✨ Beneficio PRO: Fotos reales ilimitadas de tus platos"}
          </p>
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
            className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl border-t border-stone-100 bg-white p-4 pb-6 shadow-2xl"
          >
            <p
              id="source-modal-title"
              className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-stone-400"
            >
              {t.has("addPantryPhotoTitle") ? t("addPantryPhotoTitle") : "Añadir foto de tu despensa"}
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={openCameraInput}
                className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3.5 text-left text-sm font-semibold text-stone-800 transition hover:border-[#4C6B3F]/30 hover:bg-[#F4F7F2]"
              >
                <span className="text-xl" aria-hidden>
                  📸
                </span>
                Tomar Foto
              </button>
              <button
                type="button"
                onClick={openGalleryInput}
                className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3.5 text-left text-sm font-semibold text-stone-800 transition hover:border-[#4C6B3F]/30 hover:bg-[#F4F7F2]"
              >
                <span className="text-xl" aria-hidden>
                  🖼️
                </span>
                Elegir de la Galería
              </button>
            </div>
            <button
              type="button"
              onClick={closeSourceModal}
              className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold text-stone-500 transition hover:bg-stone-50 hover:text-stone-700"
            >
              Cancelar
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
