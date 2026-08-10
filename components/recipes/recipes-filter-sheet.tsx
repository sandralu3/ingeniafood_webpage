"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import {
  PREFERRED_DIETS,
  preferredDietLabel,
  type PreferredDiet
} from "@/lib/nutrition/preferred-diet";
import {
  SAVED_RECIPE_EXTRA_FILTERS,
  SAVED_RECIPE_MEAL_FILTERS,
  type SavedRecipeExtraFilter,
  type SavedRecipeMealFilter,
  type SavedRecipesFilterState
} from "@/lib/recipes/saved-recipes-filter";
import { cn } from "@/lib/utils";

type RecipesFilterSheetProps = {
  open: boolean;
  value: SavedRecipesFilterState;
  onClose: () => void;
  onApply: (next: SavedRecipesFilterState) => void;
  labels: {
    title: string;
    mealSection: string;
    dietSection: string;
    extraSection: string;
    dietAll: string;
    clear: string;
    apply: string;
    closeAria: string;
    mealLabel: (filter: SavedRecipeMealFilter) => string;
    extraLabel: (filter: SavedRecipeExtraFilter) => string;
  };
};

const DIET_OPTIONS: PreferredDiet[] = PREFERRED_DIETS.map((item) => item.id);

function ChipButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-[#4C6B3F] bg-[#4C6B3F] text-white"
          : "border-stone-200 bg-white text-stone-600 hover:border-[#4C6B3F]/35 hover:bg-[#F0F4ED]"
      )}
    >
      {children}
    </button>
  );
}

export function RecipesFilterSheet({
  open,
  value,
  onClose,
  onApply,
  labels
}: RecipesFilterSheetProps) {
  const [draft, setDraft] = useState<SavedRecipesFilterState>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const dietValue: PreferredDiet = draft.dietFilter ?? "estandar";

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/45 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <button
        type="button"
        aria-label={labels.closeAria}
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-100 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="text-base font-semibold text-stone-900">{labels.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            aria-label={labels.closeAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#556B2F]">
              {labels.mealSection}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SAVED_RECIPE_MEAL_FILTERS.map((filter) => (
                <ChipButton
                  key={filter}
                  active={draft.mealFilter === filter}
                  onClick={() => setDraft((current) => ({ ...current, mealFilter: filter }))}
                >
                  {labels.mealLabel(filter)}
                </ChipButton>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#556B2F]">
              {labels.dietSection}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DIET_OPTIONS.map((diet) => (
                <ChipButton
                  key={diet}
                  active={dietValue === diet}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      dietFilter: diet === "estandar" ? null : diet
                    }))
                  }
                >
                  {diet === "estandar" ? labels.dietAll : preferredDietLabel(diet)}
                </ChipButton>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#556B2F]">
              {labels.extraSection}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SAVED_RECIPE_EXTRA_FILTERS.map((filter) => (
                <ChipButton
                  key={filter}
                  active={draft.extraFilter === filter}
                  onClick={() => setDraft((current) => ({ ...current, extraFilter: filter }))}
                >
                  {labels.extraLabel(filter)}
                </ChipButton>
              ))}
            </div>
          </section>
        </div>

        <div className="flex gap-2 border-t border-stone-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() =>
              setDraft({
                mealFilter: "Todas",
                extraFilter: "Ninguno",
                dietFilter: null
              })
            }
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
          >
            {labels.clear}
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex-[1.4] rounded-xl bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {labels.apply}
          </button>
        </div>
      </div>
    </div>
  );
}
