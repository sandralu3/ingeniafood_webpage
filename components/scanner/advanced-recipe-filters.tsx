"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { PlanSectionDivider } from "@/components/plan/plan-section-divider";
import { PremiumLabel } from "@/components/premium/premium-label";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { usePremium } from "@/hooks/use-premium";
import { SCANNER_SECTION_ACCENTS } from "@/lib/scanner/scanner-section-accent";
import {
  getRecipeCuisineStyleShortLabel,
  getRecipeMealTypeLabel,
  RECIPE_CUISINE_STYLES,
  RECIPE_MEAL_TYPES,
  type RecipeCuisineStyle,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import { cn } from "@/lib/utils";

export const SCANNER_SECTION_CLASS =
  "mb-2 rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30";

type Props = {
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
  onMealTypeChange: (value: RecipeMealType) => void;
  onCuisineStyleChange: (value: RecipeCuisineStyle) => void;
  disabled?: boolean;
};

function FilterChip({
  label,
  selected,
  locked,
  disabled,
  onClick
}: {
  label: string;
  selected: boolean;
  locked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-[#4C6B3F]/35 bg-[#F4F6F2] text-[#3e5219]"
          : locked
            ? "border-stone-200/80 bg-white text-stone-400"
            : "border-stone-200/80 bg-white text-[#8E8A80] hover:border-stone-300 hover:text-stone-700"
      )}
    >
      {locked ? <Lock className="h-2.5 w-2.5 shrink-0" aria-hidden /> : null}
      {label}
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] text-stone-400">
        {label}
      </span>
      <div className="-mx-0.5 flex flex-1 gap-1 overflow-x-auto px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

export function AdvancedRecipeFilters({
  mealType,
  cuisineStyle,
  onMealTypeChange,
  onCuisineStyleChange,
  disabled = false
}: Props) {
  const { isPremium, isLoading, isPaidPremium, premiumTrialRemaining, refresh } = usePremium();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const mealLabel = getRecipeMealTypeLabel(mealType);
  const cuisineLabel = getRecipeCuisineStyleShortLabel(cuisineStyle);
  const summaryLabel = `${mealLabel} · ${cuisineLabel}`;

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
            label="Filtros avanzados"
            accent={SCANNER_SECTION_ACCENTS.filtros}
            trailing={
              <div className="flex items-center gap-1.5">
                {isPaidPremium ? (
                  <PremiumLabel size="2xs" />
                ) : premiumTrialRemaining > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    1 prueba
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

          {!expanded ? (
            <div className="px-0.5">
              <p className="text-[11px] text-stone-500">{summaryLabel}</p>
              <p className="text-[11px] text-stone-500">
                {isPremium
                  ? isPaidPremium
                    ? "Toca para personalizar"
                    : "Prueba activa · toca para personalizar"
                  : "Plan Free · toca para ver opciones"}
              </p>
            </div>
          ) : null}
        </button>

        {expanded ? (
          <div className="mt-1.5 space-y-1.5 border-t border-stone-100 pt-1.5">
            <FilterRow label="Plato">
              {RECIPE_MEAL_TYPES.map((option) => (
                <FilterChip
                  key={option.id}
                  label={option.label}
                  selected={mealType === option.id}
                  locked={option.premium && !isPremium}
                  disabled={disabled || isLoading}
                  onClick={() => handleMealTypeClick(option)}
                />
              ))}
            </FilterRow>

            <FilterRow label="Estilo">
              {RECIPE_CUISINE_STYLES.map((option) => (
                <FilterChip
                  key={option.id}
                  label={option.shortLabel}
                  selected={cuisineStyle === option.id}
                  locked={option.premium && !isPremium}
                  disabled={disabled || isLoading}
                  onClick={() => handleCuisineStyleClick(option)}
                />
              ))}
            </FilterRow>
          </div>
        ) : null}
      </section>

      <PremiumUpgradeDialog
        open={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        onUpgraded={() => void refresh()}
      />
    </>
  );
}
