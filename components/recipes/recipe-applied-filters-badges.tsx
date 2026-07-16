"use client";

import { Globe2, Moon, Sparkles, Sun, Users, UtensilsCrossed } from "lucide-react";
import {
  getRecipeCuisineStyleLabel,
  getRecipeMealTypeLabel,
  getRecipeServingsShortLabel,
  type AppliedRecipeFilters,
  type RecipeCuisineStyle,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";

type Props = {
  filters: AppliedRecipeFilters;
};

function mealTypeIcon(mealType: RecipeMealType) {
  switch (mealType) {
    case "desayuno":
      return Sun;
    case "cena":
      return Moon;
    case "postre":
      return Sparkles;
    case "almuerzo":
    default:
      return UtensilsCrossed;
  }
}

function cuisineStyleIcon(cuisineStyle: RecipeCuisineStyle) {
  switch (cuisineStyle) {
    case "asiatica":
    case "india":
    case "fusion":
    case "italiana":
      return Globe2;
    case "estandar":
    default:
      return UtensilsCrossed;
  }
}

export function RecipeAppliedFiltersBadges({ filters }: Props) {
  const MealIcon = mealTypeIcon(filters.mealType);
  const CuisineIcon = cuisineStyleIcon(filters.cuisineStyle);
  const mealLabel = getRecipeMealTypeLabel(filters.mealType);
  const cuisineLabel = getRecipeCuisineStyleLabel(filters.cuisineStyle);
  const servingsLabel = getRecipeServingsShortLabel(filters.servings);

  return (
    <>
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#88ab75]/35 bg-[#eef4e6]/80 px-2 py-0.5 text-[10px] font-bold text-[#3e5219]">
        <MealIcon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
        {mealLabel}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
        <CuisineIcon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
        {cuisineLabel}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-sky-200/70 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-900">
        <Users className="h-3 w-3" strokeWidth={1.75} aria-hidden />
        {servingsLabel}
      </span>
    </>
  );
}
