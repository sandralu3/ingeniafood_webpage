"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ScanLine,
  X,
  Egg,
  Leaf,
  Beef,
  Carrot,
  Sparkles,
  Check,
  Package,
  ChevronDown,
  Bookmark,
  BookmarkCheck
} from "lucide-react";
import { IngredientCombobox } from "@/components/scanner/ingredient-combobox";
import { usePantryData } from "@/hooks/use-pantry-data";
import {
  CATEGORY_DB_TO_UI,
  type CategoryKey,
  type MasterIngredient,
  type PantryCategoryDb
} from "@/lib/pantry/types";

const SCAN_ZONE_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCKL8lGCHNP6y4RG_73y-09i4hv_25R-s5Csy2Fsl_s4M76iwhCC1rohFapVZfMqZuOr4DwzwcIaKMJJKgN983DAoHfezkVbeXDrCRCKlbyBWF1MS_ysUUuSe8KxAKTY3L0bxaiR2Geu1k1xdVxYwFyGP3iqE4NgHpc048y_iwnETEk0GSS7WgVfn-Lng0v8z3seLxYcLWYSuXtUpXIkrQbaT3yDzvDlpnevBL0UXHsL70_OrXIXco_ien6YSVyL_GWgomeQamGBDXN";

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
};

export function PantrySearchView({
  selectedIngredients,
  pantryImageFile,
  onPantryImageChange,
  onAddIngredient,
  onRemoveIngredient,
  onToggleFromCategory,
  onFindRecipes,
  errorMessage,
  onRetry,
  isBusy,
  rateLimitSecondsLeft = 0
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
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

  const [expandedCategories, setExpandedCategories] = useState<Record<CategoryKey, boolean>>({
    Proteinas: false,
    Vegetales: false,
    "Basicos de Despensa": false
  });

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

  const previewUrl = useMemo(() => {
    if (!pantryImageFile) {
      return null;
    }
    return URL.createObjectURL(pantryImageFile);
  }, [pantryImageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) {
        return;
      }
      onPantryImageChange(file);
    },
    [onPantryImageChange]
  );

  const clearImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onPantryImageChange(null);
    },
    [onPantryImageChange]
  );

  const hasSelection = selectedIngredients.length > 0 || pantryImageFile !== null;

  const toggleCategory = useCallback((category: CategoryKey) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  const expandCategory = useCallback((category: CategoryKey) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: true
    }));
  }, []);

  const handleComboboxSelect = useCallback(
    (ingredient: MasterIngredient) => {
      if (!selectedIngredients.includes(ingredient.name)) {
        onAddIngredient(ingredient.name);
      }
      expandCategory(CATEGORY_DB_TO_UI[ingredient.category]);
    },
    [onAddIngredient, selectedIngredients, expandCategory]
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

      const created = await addFavorite(ingredient.id);
      if (created) {
        expandCategory(CATEGORY_DB_TO_UI[created.category]);
      }
    },
    [
      addFavorite,
      expandCategory,
      favoriteIngredientIds,
      favorites,
      masterByName,
      removeFavorite
    ]
  );

  const handleRemoveFavoriteFromAccordion = useCallback(
    async (favoriteId: string, ingredientName: string) => {
      const removed = await removeFavorite(favoriteId);
      if (removed && selectedIngredients.includes(ingredientName)) {
        onRemoveIngredient(ingredientName);
      }
    },
    [onRemoveIngredient, removeFavorite, selectedIngredients]
  );

  return (
    <div className="pb-36 pt-1.5 duration-300 sm:pb-40">
      <section className="mb-5 px-1 pt-2">
        <div className="mb-5 text-center">
          <h2 className="mb-2.5 font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-stone-900">
            ¿Qué hay en tu despensa?
          </h2>
          <p className="text-sm leading-relaxed text-stone-500 sm:text-[0.9rem]">
            Toma una foto de tu nevera o escribe ingredientes para optimizar tu próxima receta.
          </p>
        </div>

        <div
          className="group relative h-40 overflow-hidden rounded-2xl border border-dashed border-[#556B2F]/25 bg-white bg-gradient-to-br from-white via-[#FDFCFB] to-[#556B2F]/6 transition-colors hover:border-[#556B2F]/40 sm:h-44"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            id="fileInput"
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Elegir foto de cámara o galería"
            onChange={handleFileChange}
          />
          <Image
            src={SCAN_ZONE_BG}
            alt=""
            priority
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.04] transition-opacity group-hover:opacity-[0.07]"
            fill
            unoptimized
            sizes="100vw"
          />
          {previewUrl ? (
            <div className="absolute inset-0 z-[5]">
              <Image
                src={previewUrl}
                alt="Vista previa de tu despensa"
                fill
                className="object-cover"
                unoptimized
                sizes="100vw"
              />
            </div>
          ) : (
            <div className="pointer-events-none relative z-10 flex h-40 flex-col items-center justify-center px-5 sm:h-44">
              <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-[#556B2F]/8">
                <ScanLine className="h-6 w-6 text-[#3e5219]" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-medium text-stone-800">
                Toca para escanear tus ingredientes
              </p>
              <p className="mt-1 text-xs text-stone-500">
                O arrastra y suelta una foto aquí
              </p>
            </div>
          )}
          {previewUrl ? (
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-3 top-3 z-[20] flex h-9 w-9 items-center justify-center rounded-full bg-sv-surface/90 text-sv-on-surface shadow-md ring-1 ring-sv-outline-variant/40 transition hover:bg-white"
              aria-label="Quitar foto"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={openFilePicker}
            className="absolute inset-0 z-[11] cursor-pointer bg-transparent"
            aria-label="Abrir cámara o galería para foto de despensa"
          />
        </div>
      </section>

      <section className="mb-4">
        {isPantryLoading ? (
          <div className="h-12 animate-pulse rounded-full border border-stone-100 bg-stone-50" />
        ) : (
          <IngredientCombobox
            ingredients={masterIngredients}
            disabled={isBusy}
            onSelectIngredient={handleComboboxSelect}
            onCreateCustomIngredient={handleCreateCustomIngredient}
          />
        )}
        {pantryError ? (
          <p className="mt-2 text-xs text-red-600">{pantryError}</p>
        ) : null}
      </section>

      {selectedIngredients.length > 0 ? (
        <section className="mb-4 flex flex-wrap gap-2">
          {selectedIngredients.map((name) => {
            const Icon = pillIconFor(name);
            const ingredient = masterByName.get(name.toLowerCase());
            const isFavorite = ingredient ? favoriteIngredientIds.has(ingredient.id) : false;
            return (
              <div
                key={name}
                className="flex items-center gap-1 rounded-full bg-sv-secondary-container pl-3 pr-1 py-1.5 text-xs font-medium text-sv-on-secondary-container"
              >
                <button
                  type="button"
                  onClick={() => onRemoveIngredient(name)}
                  className="flex items-center gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {name}
                </button>
                {ingredient ? (
                  <button
                    type="button"
                    onClick={() => void handleToggleFavorite(name)}
                    className="ml-0.5 rounded-full p-1 transition hover:bg-white/50"
                    aria-label={
                      isFavorite ? "Quitar de favoritos de despensa" : "Guardar en favoritos de despensa"
                    }
                  >
                    {isFavorite ? (
                      <BookmarkCheck className="h-3.5 w-3.5 text-sv-primary" />
                    ) : (
                      <Bookmark className="h-3.5 w-3.5 opacity-70" />
                    )}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemoveIngredient(name)}
                  className="rounded-full p-1 opacity-60 transition hover:opacity-100"
                  aria-label={`Quitar ${name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </section>
      ) : null}

      <div className="mb-2 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {(Object.keys(PANTRY_CATEGORIES) as CategoryKey[]).map((key) => {
          const cat = PANTRY_CATEGORIES[key];
          const Icon = cat.icon;
          const isWide = key === "Basicos de Despensa";
          const isExpanded = expandedCategories[key];
          const categoryFavorites = favoritesByCategory[key];
          return (
            <div
              key={key}
              className={`rounded-2xl border border-stone-100/60 bg-white p-3.5 shadow-sm ${
                isWide ? "md:col-span-2" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => toggleCategory(key)}
                aria-expanded={isExpanded}
                aria-controls={`accordion-${key}`}
                className="flex w-full items-center justify-between gap-2 rounded-md py-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#556B2F]" strokeWidth={1.5} />
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                    {cat.title}
                  </h3>
                  {categoryFavorites.length > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dce7c3]/80 px-1.5 text-[10px] font-semibold text-[#3e5219]">
                      {categoryFavorites.length}
                    </span>
                  ) : null}
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-sv-on-surface-variant transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
              <div
                id={`accordion-${key}`}
                className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out ${
                  isExpanded ? "mt-2 max-h-56 opacity-100" : "mt-0 max-h-0 opacity-0"
                }`}
              >
                {categoryFavorites.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-stone-500">
                    Sin favoritos aquí. Busca un ingrediente y pulsa el marcador ★.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                    {categoryFavorites.map((fav) => {
                      const active = selectedIngredients.includes(fav.name);
                      return (
                        <div
                          key={fav.favoriteId}
                          className="flex items-center justify-between rounded-md py-1 pr-1"
                        >
                          <button
                            type="button"
                            onClick={() => onToggleFromCategory(fav.name)}
                            className={`flex min-w-0 flex-1 items-center justify-between rounded-md px-1 text-left text-xs transition ${
                              active ? "text-sv-primary" : "text-sv-on-surface"
                            }`}
                          >
                            <span className="truncate pr-1.5 leading-tight">{fav.name}</span>
                            {active ? (
                              <Check className="h-3.5 w-3.5 shrink-0 text-sv-primary" strokeWidth={2.5} />
                            ) : null}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleRemoveFavoriteFromAccordion(fav.favoriteId, fav.name)
                            }
                            className="ml-1 rounded-full p-1 text-stone-500 transition hover:bg-white hover:text-red-600"
                            aria-label={`Eliminar ${fav.name} de favoritos`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={isBusy || !hasSelection}
            className="self-start rounded-lg border border-red-400 bg-white px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"
          >
            {rateLimitSecondsLeft > 0 ? `Reintentar en ${rateLimitSecondsLeft}s` : "Reintentar ahora"}
          </button>
        </div>
      ) : null}

      <div className="pointer-events-none fixed bottom-[4.75rem] left-1/2 z-[60] w-full max-w-md -translate-x-1/2 px-4 sm:bottom-20">
        <button
          type="button"
          onClick={onFindRecipes}
          disabled={isBusy || !hasSelection}
          aria-label={hasSelection ? "Optimizar Receta Saludable" : "Escanear Nevera"}
          className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-[#4c6633] px-5 py-3.5 text-center text-sm font-semibold leading-tight text-white shadow-lg shadow-[#4c6633]/20 transition hover:bg-[#556B2F] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {hasSelection
            ? rateLimitSecondsLeft > 0
              ? `Reintentar en ${rateLimitSecondsLeft}s`
              : "Optimizar Receta Saludable"
            : "Escanear Nevera"}
          <span aria-hidden className="transition group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>
    </div>
  );
}
