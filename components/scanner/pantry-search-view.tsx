"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { isUnlimitedGenerationsCount } from "@/lib/generations/admin-unlimited";
import {
  ScanLine,
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

const CATEGORY_KEYS: CategoryKey[] = ["Proteinas", "Vegetales", "Basicos de Despensa"];

const CATEGORY_TAB_META: Record<CategoryKey, { label: string; emoji: string }> = {
  Proteinas: { label: "Proteínas", emoji: "🥩" },
  Vegetales: { label: "Vegetales", emoji: "🥦" },
  "Basicos de Despensa": { label: "Básicos", emoji: "🌾" }
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
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
    openSourceModal();
  }, [hasSelection, onFindRecipes, onGenerationsExhausted, openSourceModal, scansExhausted]);

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

      const created = await addFavorite(ingredient.id);
      if (created) {
        // La UI compacta muestra favoritos por categoría sin necesidad de acordeón
      }
    },
    [
      addFavorite,
      favoriteIngredientIds,
      favorites,
      masterByName,
      removeFavorite
    ]
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pt-2 pb-2">

        <div
          className={[
            "group relative flex w-full max-h-44 aspect-[3/2] overflow-hidden rounded-3xl shadow-md transition-colors",
            previewUrl
              ? "bg-white border border-stone-200/70"
              : "bg-gradient-to-tr from-[#F4F7F2] to-[#E2ECDFA0] border border-[#D5E2D0]"
          ].join(" ")}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={handleDrop}
        >
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
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#4C6B3F]/10 ring-1 ring-[#4C6B3F]/20">
                <ScanLine className="h-7 w-7 text-[#4C6B3F]" strokeWidth={1.75} />
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
            onClick={openSourceModal}
            disabled={isBusy}
            className="absolute inset-0 z-[11] cursor-pointer bg-transparent disabled:cursor-not-allowed"
            aria-label="Abrir cámara o galería para foto de despensa"
          />
        </div>

      <section className="mb-4 mt-5">
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

      <section className="mb-2">
        <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
          <span className="mb-3 block text-[11px] font-bold tracking-wider text-stone-400">
            FAVORITOS
          </span>

          <div className="mb-3 grid grid-cols-3 gap-1.5 border-b border-stone-100/60 pb-2">
            {CATEGORY_KEYS.map((key) => {
              const isActive = activeCategory === key;
              const meta = CATEGORY_TAB_META[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setActiveCategory((current) => (current === key ? null : key))
                  }
                  aria-pressed={isActive}
                  aria-label={`Ver favoritos de ${meta.label}`}
                  className={[
                    "flex min-w-0 items-center justify-center gap-1 rounded-full border px-2 py-1.5 text-[11px] transition-colors sm:gap-1.5 sm:px-3 sm:text-xs",
                    isActive
                      ? "border-[#D5E2D0] bg-[#E9F0E6] font-semibold text-[#4C6B3F]"
                      : "border-stone-100 bg-stone-50 text-stone-600 hover:bg-stone-100"
                  ].join(" ")}
                >
                  <span aria-hidden className="shrink-0 text-sm leading-none">
                    {meta.emoji}
                  </span>
                  <span className="truncate">{meta.label}</span>
                  {favoritesByCategory[key].length > 0 ? (
                    <span
                      className={[
                        "shrink-0 rounded-full px-1 text-[10px] font-bold leading-4",
                        isActive ? "bg-[#4C6B3F]/15 text-[#4C6B3F]" : "bg-stone-200/70 text-stone-500"
                      ].join(" ")}
                    >
                      {favoritesByCategory[key].length}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {activeCategory === null ? (
            <p className="text-xs leading-relaxed text-stone-500">
              Elige una categoría para ver tus ingredientes favoritos.
            </p>
          ) : favoritesByCategory[activeCategory].length > 0 ? (
            <div className="pr-0.5">
              <div className="grid grid-cols-2 gap-2">
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
                      className={[
                        "flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-left text-xs font-medium shadow-sm transition-all",
                        isSelected
                          ? "border-[#4C6B3F]/35 bg-[#E9F0E6]/50 text-[#4C6B3F]"
                          : "border-stone-200/60 bg-white text-stone-700 hover:border-[#4C6B3F]/30"
                      ].join(" ")}
                    >
                      <span className="min-w-0 truncate pr-2">{fav.name}</span>
                      <span
                        className={[
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          isSelected ? "bg-[#4C6B3F] text-white" : "bg-[#E9F0E6] text-[#4C6B3F]"
                        ].join(" ")}
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
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-stone-500">
              Sin favoritos en {CATEGORY_TAB_META[activeCategory].label.toLowerCase()}. Busca un
              ingrediente arriba y pulsa el marcador para guardarlo aquí.
            </p>
          )}
        </div>
      </section>

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

      </div>

      <div className="z-10 shrink-0 border-t border-stone-200/70 bg-[#FBF9F6] px-4 pb-1 pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        {isUnlimitedGenerationsCount(generationsLeft) ? (
          <span className="text-[10px] text-stone-400 text-center block mb-1">
            Escaneos ilimitados · cuenta admin
          </span>
        ) : generationsLeft !== null && generationsLeft > 0 ? (
          <span className="text-[10px] text-stone-400 text-center block mb-1">
            {generationsLeft}{" "}
            {generationsLeft === 1
              ? "escaneo gratuito restante"
              : "escaneos gratuitos restantes"}
          </span>
        ) : (
          <span className="block mb-1" />
        )}

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
          className="w-full bg-[#4C6B3F] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-[#4C6B3F]/20 text-center tracking-wide hover:bg-[#3D5632] transition-all disabled:cursor-not-allowed disabled:opacity-60"
        >
          {scansExhausted
            ? "Pruebas gratuitas agotadas"
            : hasSelection
              ? rateLimitSecondsLeft > 0
                ? `Reintentar en ${rateLimitSecondsLeft}s`
                : "Generar receta saludable"
              : "Escanear Nevera"}
        </button>
      </div>

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
              Añadir foto de tu despensa
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
