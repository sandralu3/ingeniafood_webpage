"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { isUnlimitedGenerationsCount } from "@/lib/generations/admin-unlimited";
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
  generationsLeft?: number | null;
  onGenerationsExhausted?: () => void;
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
  rateLimitSecondsLeft = 0,
  generationsLeft = null,
  onGenerationsExhausted
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
  const scansExhausted = generationsLeft !== null && generationsLeft <= 0;

  const handlePrimaryAction = useCallback(() => {
    if (scansExhausted) {
      onGenerationsExhausted?.();
      return;
    }
    if (hasSelection) {
      onFindRecipes();
      return;
    }
    openFilePicker();
  }, [hasSelection, onFindRecipes, onGenerationsExhausted, openFilePicker, scansExhausted]);

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
        <div className="mb-5 text-left">
          <h2 className="text-xl font-bold tracking-tight text-stone-800">
            ¿Qué hay en tu despensa?
          </h2>
        </div>

        <div
          className="group relative flex w-full aspect-[4/3] overflow-hidden rounded-2xl border border-dashed border-stone-200/80 bg-stone-50 p-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)] transition-colors hover:border-stone-200"
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
          {previewUrl ? (
            <div className="absolute inset-0 z-[5]">
              <Image
                src={previewUrl}
                alt="Vista previa de tu despensa"
                fill
                className="object-contain"
                unoptimized
                sizes="100vw"
              />
            </div>
          ) : (
            <div className="pointer-events-none relative z-10 flex w-full flex-col items-center justify-center gap-2 sm:flex-row sm:justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-50 ring-1 ring-stone-100">
                <ScanLine className="h-6 w-6 text-stone-700" strokeWidth={1.75} />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-medium text-stone-600">
                  Toca para escanear tus ingredientes
                </p>
                <p className="mt-0.5 text-xs text-stone-500">O arrastra y suelta una foto aquí</p>
              </div>
            </div>
          )}
          {previewUrl ? (
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-3 top-3 z-[20] flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-700 shadow-md ring-1 ring-stone-200/70 transition hover:bg-stone-50"
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
          className={`rounded-2xl border border-stone-100 bg-white p-4 shadow-md shadow-stone-200/50 ${
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
                    <span className="flex items-center justify-center rounded-full bg-[#E9F0E6] px-2.5 py-0.5 text-xs font-bold text-[#4C6B3F]">
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
                  isExpanded
                    ? "mt-2 max-h-56 opacity-100 rounded-2xl border border-stone-100 bg-white p-4 shadow-md shadow-stone-200/50"
                    : "mt-0 max-h-0 opacity-0"
                }`}
              >
                {categoryFavorites.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-stone-500">
                    Sin favoritos aquí. Busca un ingrediente y pulsa el marcador de guardar.
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
        {isUnlimitedGenerationsCount(generationsLeft) ? (
          <p className="pointer-events-auto mb-2 text-center text-[11px] font-medium text-[#556B2F]">
            Escaneos ilimitados · cuenta admin
          </p>
        ) : generationsLeft !== null && generationsLeft > 0 ? (
          <p className="pointer-events-auto mb-2 text-center text-[11px] font-medium text-stone-500">
            {generationsLeft}{" "}
            {generationsLeft === 1 ? "escaneo gratuito restante" : "escaneos gratuitos restantes"}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={isBusy}
          aria-label={
            scansExhausted
              ? "Escaneos gratuitos agotados"
              : hasSelection
                ? "Generar receta saludable"
                : "Escanear Nevera"
          }
          className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-[#4C6B3F] px-5 py-3.5 text-center text-sm font-semibold tracking-tight leading-tight text-white shadow-lg shadow-[#4C6B3F]/20 transition hover:brightness-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {scansExhausted
            ? "Pruebas gratuitas agotadas"
            : hasSelection
              ? rateLimitSecondsLeft > 0
                ? `Reintentar en ${rateLimitSecondsLeft}s`
                : "Generar receta saludable"
              : "Escanear Nevera"}
          {!scansExhausted ? (
            <span aria-hidden className="transition group-hover:translate-x-1">
              →
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
