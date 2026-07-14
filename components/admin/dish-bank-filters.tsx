"use client";

import { Search, X } from "lucide-react";
import {
  RECIPE_CUISINE_STYLES,
  RECIPE_MEAL_TYPES,
  type RecipeCuisineStyle,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import { cn } from "@/lib/utils";

export type DishBankActiveFilter = "all" | "active" | "inactive";

type DishBankFiltersProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  mealTypes: RecipeMealType[];
  onMealTypesChange: (value: RecipeMealType[]) => void;
  cuisineStyles: RecipeCuisineStyle[];
  onCuisineStylesChange: (value: RecipeCuisineStyle[]) => void;
  activeFilter: DishBankActiveFilter;
  onActiveFilterChange: (value: DishBankActiveFilter) => void;
  totalCount: number;
  filteredCount: number;
  onClearFilters: () => void;
};

function toggleValue<T extends string>(current: T[], value: T): T[] {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function DishBankFilters({
  searchQuery,
  onSearchQueryChange,
  mealTypes,
  onMealTypesChange,
  cuisineStyles,
  onCuisineStylesChange,
  activeFilter,
  onActiveFilterChange,
  totalCount,
  filteredCount,
  onClearFilters
}: DishBankFiltersProps) {
  const hasFilters =
    searchQuery.trim().length > 0 ||
    mealTypes.length > 0 ||
    cuisineStyles.length > 0 ||
    activeFilter !== "all";

  return (
    <div className="space-y-3 border-b border-stone-100 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">
          Mostrando <span className="font-semibold text-stone-900">{filteredCount}</span> de{" "}
          <span className="font-semibold text-stone-900">{totalCount}</span>
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-600 transition hover:bg-stone-50"
          >
            <X className="h-3 w-3" />
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Buscar por título, palabra clave o tag…"
          className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-800 outline-none focus:border-[#4c6633]/35 focus:ring-2 focus:ring-[#4c6633]/10"
        />
      </label>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: "all", label: "Todas" },
            { id: "active", label: "Activas" },
            { id: "inactive", label: "Inactivas" }
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onActiveFilterChange(option.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
              activeFilter === option.id
                ? "border-[#4c6633]/30 bg-[#F0F4ED] text-[#3e5219]"
                : "border-stone-200 bg-white text-stone-500"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Tipo de comida
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RECIPE_MEAL_TYPES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onMealTypesChange(toggleValue(mealTypes, option.id))}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                mealTypes.includes(option.id)
                  ? "border-[#4c6633]/30 bg-[#F0F4ED] text-[#3e5219]"
                  : "border-stone-200 bg-white text-stone-500"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Estilo
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RECIPE_CUISINE_STYLES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onCuisineStylesChange(toggleValue(cuisineStyles, option.id))}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                cuisineStyles.includes(option.id)
                  ? "border-[#4c6633]/30 bg-[#F0F4ED] text-[#3e5219]"
                  : "border-stone-200 bg-white text-stone-500"
              )}
            >
              {option.shortLabel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
