"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { PlanSectionDivider } from "@/components/plan/plan-section-divider";
import { PremiumLabel } from "@/components/premium/premium-label";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { usePremium } from "@/hooks/use-premium";
import { useTranslations } from "next-intl";
import { SCANNER_SECTION_ACCENTS } from "@/lib/scanner/scanner-section-accent";
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
import { cn } from "@/lib/utils";

export const SCANNER_SECTION_CLASS =
  "mb-2 rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30";

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
          ? "border-[#556B2F]/45 bg-[#eef4e6] text-[#3e5219] shadow-sm shadow-[#556B2F]/5"
          : locked
            ? "border-stone-200 bg-stone-50/60 text-stone-400"
            : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50",
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
      <p className="mb-1 px-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
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
  disabled = false
}: Props) {
  const t = useTranslations("Scanner");
  const { isPremium, isLoading, isPaidPremium, isTester, premiumTrialRemaining, refresh } =
    usePremium();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const mealLabel = translateMealType(t, mealType);
  const cuisineLabel = translateCuisineStyleShort(t, cuisineStyle);
  const servingsCompact =
    servings >= 4 ? "4+" : servings === 2 ? "2p" : `${servings}`;
  const headerSummary = `${mealLabel}, ${cuisineLabel}, ${servingsCompact}`;

  const handleMealTypeClick = (option: (typeof RECIPE_MEAL_TYPES)[number]) => {
    if (disabled || isLoading) return;
    if (option.premium && !isPremium) {
      if (isTester) setShowUpgradeDialog(true);
      return;
    }
    onMealTypeChange(option.id);
  };

  const handleCuisineStyleClick = (option: (typeof RECIPE_CUISINE_STYLES)[number]) => {
    if (disabled || isLoading) return;
    if (option.premium && !isPremium) {
      if (isTester) setShowUpgradeDialog(true);
      return;
    }
    onCuisineStyleChange(option.id);
  };

  const handleServingsClick = (value: RecipeServings) => {
    if (disabled || isLoading) return;
    const option = RECIPE_SERVINGS_OPTIONS.find((item) => item.value === value);
    if (option?.premium && !isPremium) {
      if (isTester) setShowUpgradeDialog(true);
      return;
    }
    onServingsChange(value);
  };

  const handleComplexityClick = (option: (typeof RECIPE_COMPLEXITY_LEVELS)[number]) => {
    if (disabled || isLoading) return;
    if (option.premium && !isPremium) {
      if (isTester) setShowUpgradeDialog(true);
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
          className="w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
          aria-expanded={expanded}
        >
          <PlanSectionDivider
            label={t("advancedFilters")}
            accent={SCANNER_SECTION_ACCENTS.filtros}
            trailing={
              <div className="flex items-center gap-1.5">
                {isPaidPremium ? (
                  <PremiumLabel size="2xs" />
                ) : premiumTrialRemaining > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    {t("trialBadge")}
                  </span>
                ) : null}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-stone-400 transition-transform duration-200",
                    expanded && "rotate-180"
                  )}
                  strokeWidth={2.25}
                  aria-hidden
                />
              </div>
            }
          />
          <p className="truncate px-0.5 text-[10px] font-medium leading-tight text-stone-500">
            {headerSummary}
            {isPaidPremium || isPremium ? " 👑" : ""}
          </p>

          {!expanded ? (
            <p className="mt-0.5 px-0.5 text-[10px] text-stone-400">
              {isTester
                ? isPremium
                  ? isPaidPremium
                    ? t("customizeFilters")
                    : t("trialActiveHint")
                  : t("freePlanHint")
                : t("customizeFilters")}
            </p>
          ) : null}
        </button>

        {expanded ? (
          <div className="mt-2 space-y-2 border-t border-stone-100 px-0.5 pt-2">
            <FilterGroup label={t("filterMeal")} scrollX>
              {RECIPE_MEAL_TYPES.filter((option) => isTester || !option.premium).map((option) => (
                <FilterChip
                  key={option.id}
                  label={translateMealType(t, option.id)}
                  selected={mealType === option.id}
                  locked={Boolean(isTester && option.premium && !isPremium)}
                  disabled={disabled || isLoading}
                  onClick={() => handleMealTypeClick(option)}
                />
              ))}
            </FilterGroup>

            <FilterGroup label={t("filterStyle")} scrollX>
              {RECIPE_CUISINE_STYLES.filter((option) => isTester || !option.premium).map(
                (option) => (
                  <FilterChip
                    key={option.id}
                    label={translateCuisineStyleShort(t, option.id)}
                    selected={cuisineStyle === option.id}
                    locked={Boolean(isTester && option.premium && !isPremium)}
                    disabled={disabled || isLoading}
                    onClick={() => handleCuisineStyleClick(option)}
                  />
                )
              )}
            </FilterGroup>

            <div className="space-y-1">
              <p className="mb-1 px-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {t("filterServings")}
              </p>
              <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                {COMPACT_SERVINGS.map((option) => {
                  const meta = RECIPE_SERVINGS_OPTIONS.find((item) => item.value === option.value);
                  const locked = Boolean(isTester && meta?.premium && !isPremium);
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
                          ? "bg-white text-[#3e5219] shadow-sm"
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
              {RECIPE_COMPLEXITY_LEVELS.filter((option) => isTester || !option.premium).map(
                (option) => (
                  <FilterChip
                    key={option.id}
                    label={translateComplexity(t, option.id)}
                    selected={complexity === option.id}
                    locked={Boolean(isTester && option.premium && !isPremium)}
                    disabled={disabled || isLoading}
                    onClick={() => handleComplexityClick(option)}
                  />
                )
              )}
            </FilterGroup>
          </div>
        ) : null}
      </section>

      {isTester ? (
        <PremiumUpgradeDialog
          open={showUpgradeDialog}
          onClose={() => setShowUpgradeDialog(false)}
          onUpgraded={() => void refresh()}
        />
      ) : null}
    </>
  );
}
