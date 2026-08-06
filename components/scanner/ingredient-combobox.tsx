"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { ModalSheetBackButton } from "@/components/ui/modal-sheet-back-button";
import type { MasterIngredient, PantryCategoryDb } from "@/lib/pantry/types";
import { isLikelyEdibleIngredientName, isValidCustomIngredientName } from "@/lib/pantry/validation";
import { cn } from "@/lib/utils";

type Props = {
  ingredients: MasterIngredient[];
  disabled?: boolean;
  variant?: "default" | "pantry";
  onSelectIngredient: (ingredient: MasterIngredient) => void;
  onCreateCustomIngredient: (
    name: string,
    category: PantryCategoryDb
  ) => Promise<MasterIngredient | null>;
};

const CATEGORY_OPTIONS: { labelKey: "customCategoryProtein" | "customCategoryVegetable" | "customCategoryBasic"; value: PantryCategoryDb }[] = [
  { labelKey: "customCategoryProtein", value: "proteinas" },
  { labelKey: "customCategoryVegetable", value: "vegetales" },
  { labelKey: "customCategoryBasic", value: "basicos_despensa" }
];

export function IngredientCombobox({
  ingredients,
  disabled = false,
  variant = "default",
  onSelectIngredient,
  onCreateCustomIngredient
}: Props) {
  const t = useTranslations("Scanner");
  const pathname = usePathname();
  const hasBottomNav = pathname.startsWith("/app-recetas");
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pendingCustomName, setPendingCustomName] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return ingredients
      .filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedQuery) &&
          isLikelyEdibleIngredientName(item.name)
      )
      .slice(0, 8);
  }, [ingredients, normalizedQuery]);

  const exactMatch = useMemo(() => {
    if (!normalizedQuery) return null;
    const match =
      ingredients.find((item) => item.name.toLowerCase() === normalizedQuery) ?? null;
    if (!match || !isLikelyEdibleIngredientName(match.name)) return null;
    return match;
  }, [ingredients, normalizedQuery]);

  const canAddExisting = Boolean(exactMatch);
  const canOfferCreate =
    Boolean(trimmedQuery) &&
    !exactMatch &&
    isValidCustomIngredientName(trimmedQuery) &&
    isLikelyEdibleIngredientName(trimmedQuery);

  const rejectNonFoodMessage = () => {
    if (!trimmedQuery) {
      setLocalError(null);
      return;
    }
    if (!isValidCustomIngredientName(trimmedQuery)) {
      setLocalError(
        t.has("customInvalidFormatError")
          ? t("customInvalidFormatError")
          : "Nombre no válido. Usa al menos 3 letras, sin símbolos raros."
      );
      return;
    }
    if (!isLikelyEdibleIngredientName(trimmedQuery)) {
      setLocalError(
        t.has("customNotFoodError")
          ? t("customNotFoodError")
          : "Eso no parece un alimento. Usa un ingrediente comestible (ej. tomate, pollo, arroz)."
      );
      return;
    }
    setLocalError(null);
  };

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
      const target = event.target as Node;
      const insideCombobox = containerRef.current?.contains(target);
      const insideCategoryPicker = categoryPickerRef.current?.contains(target);
      if (!insideCombobox && !insideCategoryPicker) {
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
    setLocalError(null);
  };

  const commitSelection = (ingredient: MasterIngredient) => {
    if (!isLikelyEdibleIngredientName(ingredient.name)) {
      setLocalError(
        t.has("customNotFoodError")
          ? t("customNotFoodError")
          : "Eso no parece un alimento. Usa un ingrediente comestible (ej. tomate, pollo, arroz)."
      );
      return;
    }
    onSelectIngredient(ingredient);
    resetPicker();
  };

  const openCategoryPicker = () => {
    if (disabled) return;
    if (!canOfferCreate) {
      rejectNonFoodMessage();
      return;
    }
    setLocalError(null);
    setPendingCustomName(trimmedQuery);
    setIsOpen(true);
  };

  const handleAddOrCreate = () => {
    if (disabled || isCreating) return;
    if (exactMatch) {
      commitSelection(exactMatch);
      return;
    }
    if (canOfferCreate) {
      openCategoryPicker();
      return;
    }
    if (trimmedQuery) {
      rejectNonFoodMessage();
    }
  };

  const handleConfirmCategory = async (category: PantryCategoryDb) => {
    if (!pendingCustomName || disabled || isCreating) return;
    if (!isLikelyEdibleIngredientName(pendingCustomName)) {
      setLocalError(
        t.has("customNotFoodError")
          ? t("customNotFoodError")
          : "Eso no parece un alimento. Usa un ingrediente comestible (ej. tomate, pollo, arroz)."
      );
      setPendingCustomName(null);
      return;
    }
    setIsCreating(true);
    try {
      const created = await onCreateCustomIngredient(pendingCustomName, category);
      if (created) {
        commitSelection(created);
      } else {
        setLocalError(
          t.has("customCreateError")
            ? t("customCreateError")
            : "No pudimos crear el alimento. Inténtalo de nuevo."
        );
        setPendingCustomName(null);
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
      {variant === "pantry" ? (
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-stone-400"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}
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
          setLocalError(null);
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
              return;
            }
            if (trimmedQuery) {
              rejectNonFoodMessage();
            }
            return;
          }
          if (event.key === "Escape") {
            setIsOpen(false);
            setPendingCustomName(null);
            setLocalError(null);
          }
        }}
        placeholder={t("addMorePlaceholder")}
        className={cn(
          "w-full text-xs text-stone-800 shadow-none placeholder:text-stone-400 transition focus:outline-none disabled:opacity-60",
          variant === "pantry"
            ? "rounded-xl border border-stone-200/60 bg-stone-50 py-2 pl-10 pr-12 focus:border-[#3E5A3A] focus:bg-white focus:ring-1 focus:ring-[#3E5A3A]/25"
            : "rounded-xl border border-stone-100 bg-[#FAF7F2] px-3 py-2.5 pr-11 focus:border-[#3E5A3A]/40 focus:bg-white focus:ring-1 focus:ring-[#3E5A3A]",
          localError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200" : null
        )}
      />
      <button
        type="button"
        onClick={handleAddOrCreate}
        disabled={disabled || isCreating || (!canAddExisting && !canOfferCreate)}
        className={cn(
          "absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center justify-center transition",
          variant === "pantry" ? "h-7 w-7 rounded-lg" : "h-8 w-8 rounded-lg",
          canAddExisting || canOfferCreate
            ? "bg-[#3E5A3A] text-white hover:bg-[#2D432A]"
            : "cursor-not-allowed bg-stone-100 text-stone-400"
        )}
        aria-label={
          canOfferCreate && !canAddExisting
            ? t.has("createCustomIngredientAria")
              ? t("createCustomIngredientAria")
              : "Crear e incluir este alimento"
            : t("addValidatedIngredientAria")
        }
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
      </button>

      {localError ? (
        <p role="alert" className="mt-1.5 text-[11px] leading-snug text-rose-700">
          {localError}
        </p>
      ) : null}

      {isMounted && isOpen && pendingCustomName
        ? createPortal(
            <div
              className={cn(
                "fixed inset-0 z-[100] flex items-end justify-center px-4 pt-6 sm:items-center sm:pb-6",
                hasBottomNav
                  ? "pb-[calc(var(--app-scan-footer-height)+var(--app-bottom-nav-height)+0.75rem)]"
                  : "pb-[calc(var(--app-scan-footer-height)+0.75rem)]"
              )}
              role="presentation"
            >
              <button
                type="button"
                aria-label={t("customBackToSearch")}
                className="absolute inset-0 bg-black/35"
                onClick={() => setPendingCustomName(null)}
              />
              <div
                ref={categoryPickerRef}
                role="dialog"
                aria-modal="true"
                aria-label={t("customFoodTypePrompt", { name: pendingCustomName })}
                className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl"
              >
                <p className="text-sm font-semibold text-stone-800">
                  {t("customFoodTypePrompt", { name: pendingCustomName })}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isCreating}
                      onClick={() => void handleConfirmCategory(option.value)}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-left text-sm font-medium text-stone-800 transition hover:border-[#3E5A3A]/40 hover:bg-[#F4F7F2] disabled:opacity-60"
                    >
                      {isCreating ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#3E5A3A]/30 border-t-[#3E5A3A]" />
                          {t("customSaving")}
                        </span>
                      ) : (
                        t(option.labelKey)
                      )}
                    </button>
                  ))}
                </div>
                <ModalSheetBackButton
                  className="mt-3 w-full"
                  label={t("customBackToSearch")}
                  onClick={() => setPendingCustomName(null)}
                />
              </div>
            </div>,
            document.body
          )
        : null}

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
              {trimmedQuery && !isLikelyEdibleIngredientName(trimmedQuery)
                ? t.has("customNotFoodError")
                  ? t("customNotFoodError")
                  : "Eso no parece un alimento. Usa un ingrediente comestible (ej. tomate, pollo, arroz)."
                : t.has("customNoMatchesHint")
                  ? t("customNoMatchesHint")
                  : "Sin coincidencias. Prueba otro nombre de alimento."}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
