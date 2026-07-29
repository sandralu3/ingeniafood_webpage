"use client";

import { Gauge, Globe2, Moon, Sparkles, Sun, Users, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type AppliedRecipeFilters,
  type RecipeCuisineStyle,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import {
  translateComplexity,
  translateCuisineStyle,
  translateMealType,
  translateServingsShort
} from "@/lib/i18n/filter-labels";

type BadgeKey = "mealType" | "cuisineStyle" | "servings" | "complexity";

type Props = {
  filters: AppliedRecipeFilters;
  /** Oculta badges que ya se muestran en el hero (p. ej. tipo de plato y raciones). */
  omit?: BadgeKey[];
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

export function RecipeAppliedFiltersBadges({ filters, omit = [] }: Props) {
  const t = useTranslations("Scanner");
  const hide = new Set(omit);
  const MealIcon = mealTypeIcon(filters.mealType);
  const CuisineIcon = cuisineStyleIcon(filters.cuisineStyle);
  const mealLabel = translateMealType(t, filters.mealType);
  const cuisineLabel = translateCuisineStyle(t, filters.cuisineStyle);
  const servingsLabel = translateServingsShort(t, filters.servings);
  const complexityLabel = translateComplexity(t, filters.complexity);

  return (
    <>
      {!hide.has("mealType") ? (
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#88ab75]/35 bg-[#eef4e6]/80 px-2 py-0.5 text-[10px] font-bold text-[#3e5219]">
          <MealIcon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          {mealLabel}
        </span>
      ) : null}
      {!hide.has("cuisineStyle") ? (
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
          <CuisineIcon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          {cuisineLabel}
        </span>
      ) : null}
      {!hide.has("servings") ? (
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-sky-200/70 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-900">
          <Users className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          {servingsLabel}
        </span>
      ) : null}
      {!hide.has("complexity") ? (
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-teal-200/70 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-900">
          <Gauge className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          {complexityLabel}
        </span>
      ) : null}
    </>
  );
}
