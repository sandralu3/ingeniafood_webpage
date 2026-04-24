"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus,
  ScanLine,
  X,
  Egg,
  Leaf,
  Beef,
  Carrot,
  Sparkles,
  Check,
  Package,
  ChevronDown
} from "lucide-react";

const SCAN_ZONE_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCKL8lGCHNP6y4RG_73y-09i4hv_25R-s5Csy2Fsl_s4M76iwhCC1rohFapVZfMqZuOr4DwzwcIaKMJJKgN983DAoHfezkVbeXDrCRCKlbyBWF1MS_ysUUuSe8KxAKTY3L0bxaiR2Geu1k1xdVxYwFyGP3iqE4NgHpc048y_iwnETEk0GSS7WgVfn-Lng0v8z3seLxYcLWYSuXtUpXIkrQbaT3yDzvDlpnevBL0UXHsL70_OrXIXco_ien6YSVyL_GWgomeQamGBDXN";

export type CategoryKey = "Proteinas" | "Vegetales" | "Basicos de Despensa";

export const PANTRY_CATEGORIES: Record<
  CategoryKey,
  { title: string; icon: typeof Beef; items: string[] }
> = {
  Proteinas: {
    title: "Proteinas",
    icon: Beef,
    items: ["Filete de Salmon", "Tofu", "Frijoles Negros"]
  },
  Vegetales: {
    title: "Vegetales",
    icon: Carrot,
    items: ["Tomates Cherry", "Brocoli", "Pimientos"]
  },
  "Basicos de Despensa": {
    title: "Basicos de Despensa",
    icon: Package,
    items: ["Aceite de Oliva", "Arroz Integral", "Miel"]
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
  addMoreValue: string;
  onAddMoreChange: (v: string) => void;
  onAddMoreSubmit: () => void;
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
  addMoreValue,
  onAddMoreChange,
  onAddMoreSubmit,
  onRemoveIngredient,
  onToggleFromCategory,
  onFindRecipes,
  errorMessage,
  onRetry,
  isBusy,
  rateLimitSecondsLeft = 0
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<CategoryKey, boolean>>({
    Proteinas: false,
    Vegetales: false,
    "Basicos de Despensa": false
  });

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
    console.log("Abriendo selector de medios...");
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

  return (
    <div className="pb-36 pt-1.5 duration-300 sm:pb-40">
      <section className="mb-4">
        <div className="mb-4 text-center">
          <h2 className="mb-2 text-2xl font-semibold leading-tight tracking-tight text-sv-on-surface">
            ¿Qué hay en tu despensa?
          </h2>
          <p className="text-sm leading-snug text-sv-on-surface-variant sm:text-[0.9rem]">
            Toma una foto de tu nevera o escribe ingredientes para optimizar tu próxima receta.
          </p>
        </div>

        <div
          className="group relative h-40 overflow-hidden rounded-xl border-2 border-dashed border-sv-outline-variant bg-sv-surface-low transition-colors hover:border-sv-primary sm:h-44"
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
            className="absolute inset-0 h-full w-full object-cover opacity-10 transition-opacity group-hover:opacity-20"
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
            <div className="pointer-events-none relative z-10 flex h-40 flex-col items-center justify-center px-4 sm:h-44">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <ScanLine className="h-6 w-6 text-sv-primary" />
              </div>
              <p className="text-sm font-medium text-sv-on-surface">
                Toca para escanear tus ingredientes
              </p>
              <p className="mt-0.5 text-xs text-sv-on-surface-variant">
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
        <div className="relative">
          <input
            type="text"
            value={addMoreValue}
            aria-label="Agregar mas ingredientes"
            onChange={(e) => onAddMoreChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddMoreSubmit();
              }
            }}
            placeholder="Agrega mas: ej. Kale, Yogur griego, Quinoa"
            className="w-full rounded-full border-none bg-sv-surface-low px-5 py-3 text-sm text-sv-on-surface shadow-sm placeholder:text-stone-400 transition focus:bg-white focus:ring-2 focus:ring-sv-primary/20"
          />
          <button
            type="button"
            onClick={onAddMoreSubmit}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-sv-primary text-sv-on-primary transition hover:scale-95"
            aria-label="Añadir ingrediente"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </section>

      {selectedIngredients.length > 0 ? (
        <section className="mb-4 flex flex-wrap gap-2">
          {selectedIngredients.map((name) => {
            const Icon = pillIconFor(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => onRemoveIngredient(name)}
                className="flex items-center gap-1.5 rounded-full bg-sv-secondary-container px-3 py-1.5 text-xs font-medium text-sv-on-secondary-container transition hover:scale-105"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {name}
                <X className="h-3.5 w-3.5 opacity-50" aria-hidden />
              </button>
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
          return (
            <div
              key={key}
              className={`rounded-lg bg-sv-surface-low p-3 shadow-[0_10px_20px_rgba(0,0,0,0.02)] ${
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
                  <Icon className="h-4 w-4 text-sv-primary" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-sv-on-surface-variant">
                    {cat.title}
                  </h3>
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
                  isExpanded ? "mt-2 max-h-44 opacity-100" : "mt-0 max-h-0 opacity-0"
                }`}
              >
                <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 md:grid-cols-3">
                  {cat.items.map((item) => {
                    const active = selectedIngredients.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => onToggleFromCategory(item)}
                        className={`flex w-full items-center justify-between rounded-md py-1 text-left text-xs transition ${
                          active ? "text-sv-primary" : "text-sv-on-surface"
                        }`}
                      >
                        <span className="pr-1.5 leading-tight">{item}</span>
                        {active ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-sv-primary" strokeWidth={2.5} />
                        ) : (
                          <Plus
                            className="h-3.5 w-3.5 shrink-0 text-sv-outline transition hover:text-sv-primary"
                            strokeWidth={2}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
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
          className="pointer-events-auto flex w-full items-center justify-center gap-2.5 rounded-2xl bg-sv-primary px-4 py-3 text-center text-sm font-semibold leading-tight text-sv-on-primary shadow-[0_8px_30px_-10px_rgba(62,82,25,0.6)] transition hover:shadow-[0_12px_35px_-10px_rgba(62,82,25,0.8)] disabled:cursor-not-allowed disabled:opacity-50"
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
