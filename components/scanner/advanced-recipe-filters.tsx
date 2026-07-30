"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { PremiumLabel } from "@/components/premium/premium-label";
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
  "mb-2 overflow-hidden rounded-2xl border border-slate-100/80 bg-white/90 shadow-none";

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
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-[#4D6638] bg-[#4D6638]/10 text-[#4D6638] font-medium"
          : locked
            ? "border-slate-200 bg-slate-50/60 text-slate-400"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        className
      )}
    >
      {locked ? <Lock className="h-3 w-3 shrink-0 opacity-70" aria-hidden /> : null}
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
      <p className="mb-1 px-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div
        className={cn(
          scrollX
            ? "flex flex-row gap-2 overflow-x-auto py-1 no-scrollbar"
            : "flex flex-wrap gap-2"
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
  const { isPremium, isLoading, isPaidPremium, refresh } = usePremium();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const showBreakfastHeavyTip =
    mealType === "desayuno" && shouldShowBreakfastPantryTip(selectedIngredientNames);

  const mealLabel = translateMealType(t, mealType);
  const cuisineLabel = translateCuisineStyleShort(t, cuisineStyle);
  const servingsCompact =
    servings >= 4 ? "4+" : servings === 2 ? "2p" : `${servings}`;
  const headerSummary = `${mealLabel}, ${cuisineLabel}, ${servingsCompact}`;
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
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/80 disabled:cursor-not-allowed disabled:opacity-60"
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">{t("advancedFilters")}</span>
              {isPaidPremium ? (
                <PremiumLabel size="2xs" />
              ) : (
                <span className="inline-flex items-center rounded-full bg-[#4D6638]/10 px-2 py-0.5 text-[10px] font-medium text-[#4D6638]">
                  👑 PRO
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
              {headerSummary}
            </p>
            {!expanded ? (
              <p className="mt-0.5 text-[10px] text-slate-400">
                {isPremium ? t("customizeFilters") : t("freePlanHint")}
              </p>
            ) : null}
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200",
              expanded && "rotate-180"
            )}
            strokeWidth={2.25}
            aria-hidden
          />
        </button>

        {expanded ? (
          <div className="space-y-3 border-t border-slate-100 px-4 py-3">
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
              <p className="mb-1 px-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t("filterServings")}
              </p>
              <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
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
                        "flex flex-1 items-center justify-center gap-0.5 rounded-lg py-1.5 text-xs font-semibold transition disabled:opacity-50",
                        selected
                          ? "bg-white text-[#4D6638] shadow-sm"
                          : locked
                            ? "text-stone-400"
                            : "text-stone-600 hover:text-stone-800"
                      )}
                    >
                      {locked ? <Lock className="h-3 w-3 opacity-70" aria-hidden /> : null}
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
              <p className="mt-1.5 text-[11px] italic text-slate-500">
                {t("breakfastHeavyTip")}
              </p>
            ) : null}
          </div>
        ) : null}

        {!expanded && showBreakfastHeavyTip ? (
          <p className="mt-1.5 px-1 text-[11px] italic text-slate-500">
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
