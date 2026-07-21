"use client";

import { Clock, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecipeMealTypeAdvisory } from "@/components/recipes/recipe-meal-type-advisory";
import { RecipeDishImage } from "@/components/recipes/recipe-dish-image";
import { SandraTipCard } from "@/components/recipes/sandra-tip-card";
import { RecipeAppliedFiltersBadges } from "@/components/recipes/recipe-applied-filters-badges";
import {
  filterRecipeTagsForDisplay,
  isShareExcludedTag,
  resolveRecipeTags
} from "@/lib/recipes/recipe-tags";
import {
  type AppliedRecipeFilters
} from "@/lib/recipes/premium-recipe-filters";
import { translateRecipeTag } from "@/lib/i18n/filter-labels";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";
import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
import {
  buildMacroData,
  formatTimeLabel
} from "@/lib/share/recipe-share-utils";

type Props = {
  recipe: ShareableRecipe;
  showScanBanner?: boolean;
  hideInlineTipOnShare?: boolean;
  appliedFilters?: AppliedRecipeFilters | null;
  showAppliedFilters?: boolean;
  mealTypeAdvisory?: string | null;
  imageDisplayMode?: "live" | "library";
  isGeneratingPhoto?: boolean;
};

const SECTION_CARD =
  "rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30";

const tagPillClass =
  "inline-flex shrink-0 items-center rounded-full border border-[#556B2F]/15 bg-[#F0F4ED]/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3e5219]";

const MACRO_LABEL_KEYS = [
  "macroProtein",
  "macroCarbs",
  "macroFat",
  "macroCalories"
] as const;

function resolveDifficultyKey(stepsCount: number): "difficultyEasy" | "difficultyMedium" | "difficultyHard" {
  if (stepsCount <= 3) return "difficultyEasy";
  if (stepsCount <= 5) return "difficultyMedium";
  return "difficultyHard";
}

export function RecipeDetailMagazine({
  recipe,
  showScanBanner = false,
  hideInlineTipOnShare = false,
  appliedFilters = null,
  showAppliedFilters = false,
  mealTypeAdvisory = null,
  imageDisplayMode = "live",
  isGeneratingPhoto = false
}: Props) {
  const t = useTranslations("RecipeDetail");
  const macroData = buildMacroData(recipe);
  const steps = normalizeRecipeSteps(recipe.pasos_ordenados ?? []);
  const tags = filterRecipeTagsForDisplay(resolveRecipeTags({ tags: recipe.tags }), {
    hideMealMomentTags: showAppliedFilters && Boolean(appliedFilters)
  });
  const difficultyLabel = appliedFilters?.complexity
    ? t(
        appliedFilters.complexity === "facil"
          ? "difficultyEasy"
          : appliedFilters.complexity === "intermedio"
            ? "difficultyMedium"
            : "difficultyHard"
      )
    : t(resolveDifficultyKey(steps.length));
  const servingsLabel = appliedFilters
    ? t("servings", { count: appliedFilters.servings })
    : "";

  return (
    <div className="space-y-3">
      <RecipeDishImage
        imageUrl={recipe.imageUrl}
        referenceImageUrl={recipe.referenceImageUrl}
        recipeTitle={recipe.titulo}
        displayMode={imageDisplayMode}
        isGeneratingPhoto={isGeneratingPhoto}
      />

      {mealTypeAdvisory ? <RecipeMealTypeAdvisory message={mealTypeAdvisory} /> : null}

      <header className={`${SECTION_CARD} space-y-2`}>
        {showScanBanner ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
            {t("scanBanner")}
          </p>
        ) : null}

        <h1 className="font-serif text-lg font-semibold leading-snug text-stone-900">
          {recipe.titulo}
        </h1>

        {showAppliedFilters && appliedFilters ? (
          <p className="text-[11px] font-medium text-stone-600">
            {t("recipeFor", { servings: servingsLabel.toLowerCase() })}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          {showAppliedFilters && appliedFilters ? (
            <RecipeAppliedFiltersBadges filters={appliedFilters} />
          ) : null}
          {tags.map((tag) => (
            <span
              key={tag}
              {...(isShareExcludedTag(tag) ? { "data-share-exclude": true } : {})}
              className={tagPillClass}
            >
              {translateRecipeTag(t, tag)}
            </span>
          ))}
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-stone-200/60 bg-white px-2 py-0.5 text-[10px] font-medium text-stone-600">
            <Clock className="h-3 w-3 text-[#556B2F]" strokeWidth={1.75} />
            {formatTimeLabel(recipe.tiempo_preparacion)}
          </span>
          {!appliedFilters?.complexity ? (
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-stone-200/60 bg-white px-2 py-0.5 text-[10px] font-medium text-stone-600">
              <UtensilsCrossed className="h-3 w-3 text-[#556B2F]" strokeWidth={1.75} />
              {difficultyLabel}
            </span>
          ) : null}
        </div>
      </header>

      <section className={SECTION_CARD}>
        <h2 className="mb-2 font-serif text-sm font-semibold text-stone-900">
          {t("macros")}
        </h2>
        {showAppliedFilters && appliedFilters ? (
          <p className="mb-2 text-[10px] font-medium text-stone-500">{t("perServing")}</p>
        ) : null}
        <div className="space-y-2.5">
          {macroData.map((macro, index) => (
            <div key={MACRO_LABEL_KEYS[index] ?? macro.label} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-medium text-stone-500">
                  {MACRO_LABEL_KEYS[index] ? t(MACRO_LABEL_KEYS[index]) : macro.label}
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-stone-800">
                  {macro.value}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-[#88ab75] transition-all"
                  style={{ width: `${macro.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={SECTION_CARD}>
        <h2 className="mb-2 font-serif text-sm font-semibold text-stone-900">{t("ingredients")}</h2>
        {showAppliedFilters && appliedFilters ? (
          <p className="mb-2 text-[10px] font-medium text-stone-500">
            {t("quantitiesFor", { servings: servingsLabel.toLowerCase() })}
          </p>
        ) : null}
        <ul className="space-y-1.5">
          {recipe.ingredientes_detallados.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-lg px-0.5 py-0.5 text-xs leading-relaxed text-stone-700"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#556B2F]/70" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-[#FCFBFA] px-2.5 py-2 shadow-sm shadow-stone-200/25">
        <h2 className="mb-2 font-serif text-sm font-semibold text-stone-900">{t("preparation")}</h2>
        <div className="space-y-3">
          {steps.map((step, index) => {
            const num = String(index + 1).padStart(2, "0");
            return (
              <div key={`${num}-${step.slice(0, 24)}`} className="flex gap-2.5">
                <span className="w-6 shrink-0 font-serif text-base font-medium leading-none text-[#556B2F]/85">
                  {num}
                </span>
                <p className="flex-1 pt-0.5 text-xs leading-relaxed text-stone-700 normal-case">
                  {step}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <SandraTipCard tip={recipe.tip_sandra ?? ""} hideOnShareCapture={hideInlineTipOnShare} />
    </div>
  );
}
