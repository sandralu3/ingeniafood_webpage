"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { usePremium } from "@/hooks/use-premium";
import { useTranslations } from "next-intl";
import {
  RECIPE_COMPLEXITY_LEVELS,
  RECIPE_CUISINE_STYLES,
  RECIPE_MEAL_TYPES,
  RECIPE_SERVINGS_OPTIONS,
  type RecipeComplexity,
  type RecipeCuisineStyle,
  type RecipeMealType,
  type RecipeServings
} from "@/lib/recipes/premium-recipe-filters";
import {
  translateComplexity,
  translateCuisineStyleShort,
  translateMealType
} from "@/lib/i18n/filter-labels";
import { shouldShowBreakfastPantryTip } from "@/lib/recipes/meal-type-ingredient-compatibility";
import { cn } from "@/lib/utils";

export const SCANNER_SECTION_CLASS =
  "mb-2 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm shadow-stone-200/50";

type Props = {
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
  servings: RecipeServings;
  complexity: RecipeComplexity;
  onMealTypeChange: (value: RecipeMealType) => void;
  onCuisineStyleChange: (value: RecipeCuisineStyle) => void;
  onServingsChange: (value: RecipeServings) => void;
  onComplexityChange: (value: RecipeComplexity) => void;
  disabled?: boolean;
  /** Nombres de ingredientes seleccionados (para tip de coherencia Desayuno). */
  selectedIngredientNames?: string[];
};

const COMPACT_SERVINGS: Array<{ value: RecipeServings; label: string }> = [
  { value: 1, label: "1" },
  { value: 2, label: "2 p." },
  { value: 3, label: "3" },
  { value: 4, label: "4+" }
];

function FilterChip({
  label,
  selected,
  locked,
  disabled,
  onClick,
  className
}: {
  label: string;
  selected: boolean;
  locked: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border border-[#3E5A3A]/25 bg-[#3E5A3A]/10 font-semibold text-[#3E5A3A]"
          : locked
            ? "border border-dashed border-stone-200 bg-stone-50/60 text-stone-400"
            : "border border-dashed border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:bg-stone-50",
        className
      )}
    >
      {locked ? <Lock className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden /> : null}
      <span>{label}</span>
    </button>
  );
}

function FilterGroup({
  label,
  children,
  scrollX = false
}: {
  label: string;
  children: ReactNode;
  scrollX?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="px-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
        {label}
      </p>
      <div
        className={cn(
          scrollX
            ? "no-scrollbar flex flex-row gap-1 overflow-x-auto py-0.5"
            : "flex flex-wrap gap-1"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AdvancedRecipeFilters({
  mealType,
  cuisineStyle,
  servings,
  complexity,
  onMealTypeChange,
  onCuisineStyleChange,
  onServingsChange,
  onComplexityChange,
  disabled = false,
  selectedIngredientNames = []
}: Props) {
  const t = useTranslations("Scanner");
  const { isPremium, isLoading, refresh } = usePremium();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const showBreakfastHeavyTip =
    mealType === "desayuno" && shouldShowBreakfastPantryTip(selectedIngredientNames);

  const mealLabel = translateMealType(t, mealType);
  const styleLabel = translateCuisineStyleShort(t, cuisineStyle);
  const premiumLocked = !isPremium && !isLoading;

  const handleMealTypeClick = (option: (typeof RECIPE_MEAL_TYPES)[number]) => {
    if (disabled || isLoading) return;
    if (option.premium && !isPremium) {
      setShowUpgradeDialog(true);
      return;
    }
    onMealTypeChange(option.id);
  };

  const handleCuisineStyleClick = (option: (typeof RECIPE_CUISINE_STYLES)[number]) => {
    if (disabled || isLoading) return;
    if (option.premium && !isPremium) {
      setShowUpgradeDialog(true);
      return;
    }
    onCuisineStyleChange(option.id);
  };

  const handleServingsClick = (value: RecipeServings) => {
    if (disabled || isLoading) return;
    const option = RECIPE_SERVINGS_OPTIONS.find((item) => item.value === value);
    if (option?.premium && !isPremium) {
      setShowUpgradeDialog(true);
      return;
    }
    onServingsChange(value);
  };

  const handleComplexityClick = (option: (typeof RECIPE_COMPLEXITY_LEVELS)[number]) => {
    if (disabled || isLoading) return;
    if (option.premium && !isPremium) {
      setShowUpgradeDialog(true);
      return;
    }
    onComplexityChange(option.id);
  };

  return (
    <>
      <section className={SCANNER_SECTION_CLASS}>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          disabled={disabled}
          className="flex w-full items-center justify-between gap-2 p-3 text-left transition hover:bg-stone-50/80 disabled:cursor-not-allowed disabled:opacity-60"
          aria-expanded={expanded}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <span className="text-[11px] leading-none" aria-hidden>
              ✨
            </span>
            <span className="text-[11px] font-bold text-stone-800">
              {t.has("smartFiltersTitle") ? t("smartFiltersTitle") : "Filtros inteligentes"}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
              Plato: {mealLabel}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
              Estilo: {styleLabel}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
              {translateComplexity(t, complexity)}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
              {servings >= 4 ? "4+" : servings} raciones
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform duration-200",
              expanded && "rotate-180"
            )}
            strokeWidth={2.25}
            aria-hidden
          />
        </button>

        {expanded ? (
          <div className="space-y-2.5 border-t border-stone-100 px-3 py-2.5">
            <FilterGroup label={t("filterMeal")} scrollX>
              {RECIPE_MEAL_TYPES.map((option) => (
                <FilterChip
                  key={option.id}
                  label={translateMealType(t, option.id)}
                  selected={mealType === option.id}
                  locked={Boolean(option.premium && premiumLocked)}
                  disabled={disabled || isLoading}
                  onClick={() => handleMealTypeClick(option)}
                />
              ))}
            </FilterGroup>

            <FilterGroup label={t("filterStyle")} scrollX>
              {RECIPE_CUISINE_STYLES.map((option) => (
                <FilterChip
                  key={option.id}
                  label={translateCuisineStyleShort(t, option.id)}
                  selected={cuisineStyle === option.id}
                  locked={Boolean(option.premium && premiumLocked)}
                  disabled={disabled || isLoading}
                  onClick={() => handleCuisineStyleClick(option)}
                />
              ))}
            </FilterGroup>

            <div className="space-y-1">
              <p className="px-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {t("filterServings")}
              </p>
              <div className="flex gap-0.5 rounded-full bg-stone-100 p-0.5">
                {COMPACT_SERVINGS.map((option) => {
                  const meta = RECIPE_SERVINGS_OPTIONS.find((item) => item.value === option.value);
                  const locked = Boolean(meta?.premium && premiumLocked);
                  const selected = servings === option.value || (option.value === 4 && servings >= 4);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabled || isLoading}
                      aria-pressed={selected}
                      onClick={() => handleServingsClick(option.value)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-0.5 rounded-full py-1 text-[10px] font-semibold transition disabled:opacity-50",
                        selected
                          ? "bg-white text-[#3E5A3A] shadow-sm"
                          : locked
                            ? "text-stone-400"
                            : "text-stone-500 hover:text-stone-700"
                      )}
                    >
                      {locked ? <Lock className="h-2.5 w-2.5 opacity-70" aria-hidden /> : null}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <FilterGroup label={t("filterComplexity")} scrollX>
              {RECIPE_COMPLEXITY_LEVELS.map((option) => (
                <FilterChip
                  key={option.id}
                  label={translateComplexity(t, option.id)}
                  selected={complexity === option.id}
                  locked={Boolean(option.premium && premiumLocked)}
                  disabled={disabled || isLoading}
                  onClick={() => handleComplexityClick(option)}
                />
              ))}
            </FilterGroup>

            {showBreakfastHeavyTip ? (
              <p className="mt-1 text-[10px] italic text-stone-500">
                {t("breakfastHeavyTip")}
              </p>
            ) : null}
          </div>
        ) : null}

        {!expanded && showBreakfastHeavyTip ? (
          <p className="mt-1 px-1 text-[10px] italic text-stone-500">
            {t("breakfastHeavyTip")}
          </p>
        ) : null}
      </section>

      <PremiumUpgradeDialog
        open={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        onUpgraded={() => void refresh()}
        featureLabel={
          t.has("advancedFiltersPremiumFeature")
            ? t("advancedFiltersPremiumFeature")
            : "Filtros avanzados de recetas"
        }
      />
    </>
  );
}
