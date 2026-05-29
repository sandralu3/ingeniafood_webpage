"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { MasterIngredient, PantryCategoryDb } from "@/lib/pantry/types";
import { isValidCustomIngredientName } from "@/lib/pantry/validation";
import { cn } from "@/lib/utils";

type Props = {
  ingredients: MasterIngredient[];
  disabled?: boolean;
  onSelectIngredient: (ingredient: MasterIngredient) => void;
  onCreateCustomIngredient: (
    name: string,
    category: PantryCategoryDb
  ) => Promise<MasterIngredient | null>;
};

const CATEGORY_OPTIONS: { label: string; value: PantryCategoryDb }[] = [
  { label: "Proteína", value: "proteinas" },
  { label: "Vegetal", value: "vegetales" },
  { label: "Básico de despensa", value: "basicos_despensa" }
];

export function IngredientCombobox({
  ingredients,
  disabled = false,
  onSelectIngredient,
  onCreateCustomIngredient
}: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pendingCustomName, setPendingCustomName] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return ingredients
      .filter((item) => item.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [ingredients, normalizedQuery]);

  const exactMatch = useMemo(() => {
    if (!normalizedQuery) return null;
    return ingredients.find((item) => item.name.toLowerCase() === normalizedQuery) ?? null;
  }, [ingredients, normalizedQuery]);

  const canAddExisting = Boolean(exactMatch);
  const canOfferCreate =
    Boolean(trimmedQuery) && !exactMatch && isValidCustomIngredientName(trimmedQuery);

  const listOptions = useMemo(() => {
    const items = [...suggestions];
    if (canOfferCreate) {
      items.push({
        id: "__create__",
        name: trimmedQuery,
        category: "vegetales" as PantryCategoryDb
      });
    }
    return items;
  }, [canOfferCreate, suggestions, trimmedQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [listOptions, pendingCustomName]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setPendingCustomName(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const resetPicker = () => {
    setQuery("");
    setIsOpen(false);
    setHighlightedIndex(0);
    setPendingCustomName(null);
    setIsCreating(false);
  };

  const commitSelection = (ingredient: MasterIngredient) => {
    onSelectIngredient(ingredient);
    resetPicker();
  };

  const handleAddExisting = () => {
    if (!exactMatch || disabled) return;
    commitSelection(exactMatch);
  };

  const openCategoryPicker = () => {
    if (!canOfferCreate || disabled) return;
    setPendingCustomName(trimmedQuery);
    setIsOpen(true);
  };

  const handleConfirmCategory = async (category: PantryCategoryDb) => {
    if (!pendingCustomName || disabled || isCreating) return;
    setIsCreating(true);
    try {
      const created = await onCreateCustomIngredient(pendingCustomName, category);
      if (created) {
        commitSelection(created);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleListPick = (item: MasterIngredient) => {
    if (item.id === "__create__") {
      openCategoryPicker();
      return;
    }
    commitSelection(item);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled || isCreating}
        aria-label="Buscar ingrediente"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        onChange={(event) => {
          setQuery(event.target.value);
          setPendingCustomName(null);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (pendingCustomName) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightedIndex((prev) =>
              Math.min(prev + 1, Math.max(listOptions.length - 1, 0))
            );
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (exactMatch) {
              commitSelection(exactMatch);
              return;
            }
            const highlighted = listOptions[highlightedIndex];
            if (highlighted) {
              handleListPick(highlighted);
            }
            return;
          }
          if (event.key === "Escape") {
            setIsOpen(false);
            setPendingCustomName(null);
          }
        }}
        placeholder="Agrega mas: ej. Kale, Yogur griego, Quinoa"
        className="w-full rounded-full border-none bg-sv-surface-low px-5 py-3 pr-12 text-sm text-sv-on-surface shadow-sm placeholder:text-stone-400 transition focus:bg-white focus:ring-2 focus:ring-sv-primary/20 disabled:opacity-60"
      />
      <button
        type="button"
        onClick={handleAddExisting}
        disabled={disabled || isCreating || !canAddExisting}
        className={cn(
          "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition",
          canAddExisting
            ? "bg-sv-primary text-sv-on-primary hover:scale-95"
            : "cursor-not-allowed bg-stone-300 text-stone-500"
        )}
        aria-label="Añadir ingrediente validado"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>

      {isOpen && pendingCustomName ? (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-sv-outline-variant/30 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-sv-on-surface">
            ¿Qué tipo de alimento es <span className="text-sv-primary">{pendingCustomName}</span>?
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={isCreating}
                onClick={() => void handleConfirmCategory(option.value)}
                className="rounded-lg border border-sv-outline-variant/30 bg-sv-surface-low px-3 py-2 text-left text-sm font-medium text-sv-on-surface transition hover:border-sv-primary/40 hover:bg-sv-secondary-container/40 disabled:opacity-60"
              >
                {isCreating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sv-primary/30 border-t-sv-primary" />
                    Guardando...
                  </span>
                ) : (
                  option.label
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPendingCustomName(null)}
            className="mt-2 text-xs text-stone-500 underline"
          >
            Volver a la búsqueda
          </button>
        </div>
      ) : null}

      {isOpen && !pendingCustomName && normalizedQuery ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-sv-outline-variant/30 bg-white py-1 shadow-lg"
        >
          {suggestions.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleListPick(item)}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition",
                  index === highlightedIndex
                    ? "bg-sv-secondary-container/60"
                    : "hover:bg-sv-surface-low"
                )}
              >
                <span>{item.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-sv-on-surface-variant">
                  {item.category.replace("_", " ")}
                </span>
              </button>
            </li>
          ))}

          {canOfferCreate ? (
            <li role="option" aria-selected={highlightedIndex === suggestions.length}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={openCategoryPicker}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-sv-primary transition",
                  highlightedIndex === suggestions.length
                    ? "bg-sv-secondary-container/60"
                    : "hover:bg-sv-surface-low"
                )}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Crear e incluir &quot;{trimmedQuery}&quot;</span>
              </button>
            </li>
          ) : null}

          {suggestions.length === 0 && !canOfferCreate ? (
            <li className="px-4 py-3 text-sm text-stone-600">
              No hay coincidencias. Usa al menos 3 letras válidas (sin símbolos raros) para crear uno
              nuevo.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
