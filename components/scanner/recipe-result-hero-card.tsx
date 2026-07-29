"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";
import { formatTimeLabel } from "@/lib/share/recipe-share-utils";
import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
import { partitionIngredientsByPantry } from "@/lib/recipes/recipe-options";
import { DEFAULT_DISH_HERO_FALLBACK } from "@/lib/recipes/dish-image-fallback";
import type { AppliedRecipeFilters } from "@/lib/recipes/premium-recipe-filters";
import { cn } from "@/lib/utils";
import { translateMealType } from "@/lib/i18n/filter-labels";

type DetailTab = "ingredients" | "preparation";

type Props = {
  recipe: ShareableRecipe;
  pantryIngredients?: string[];
  mealTypeAdvisory?: string | null;
  isGeneratingPhoto?: boolean;
  appliedFilters?: AppliedRecipeFilters | null;
};

export function RecipeResultHeroCard({
  recipe,
  pantryIngredients = [],
  mealTypeAdvisory = null,
  isGeneratingPhoto = false,
  appliedFilters = null
}: Props) {
  const t = useTranslations("Scanner");
  const tDetail = useTranslations("RecipeDetail");
  const [tab, setTab] = useState<DetailTab>("ingredients");
  const [imageFailed, setImageFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  useEffect(() => {
    setTab("ingredients");
    setImageFailed(false);
    setFallbackFailed(false);
  }, [recipe.titulo, recipe.imageUrl, recipe.referenceImageUrl]);

  const pantrySplit = useMemo(
    () =>
      pantryIngredients.length > 0
        ? partitionIngredientsByPantry(recipe.ingredientes_detallados, pantryIngredients)
        : {
            available: recipe.ingredientes_detallados,
            missing: [] as string[]
          },
    [pantryIngredients, recipe.ingredientes_detallados]
  );

  const steps = useMemo(
    () => normalizeRecipeSteps(recipe.pasos_ordenados ?? []),
    [recipe.pasos_ordenados]
  );

  const macros = recipe.macronutrientes;
  const timeLabel = formatTimeLabel(recipe.tiempo_preparacion);
  const servingsCount = appliedFilters?.servings ?? null;
  const servingsLabel =
    servingsCount != null
      ? tDetail("servings", { count: servingsCount })
      : null;
  const mealTypeLabel = appliedFilters?.mealType
    ? translateMealType(t, appliedFilters.mealType)
    : null;
  const primaryUrl = recipe.imageUrl || recipe.referenceImageUrl || null;
  const heroImageUrl =
    primaryUrl && !imageFailed
      ? primaryUrl
      : !fallbackFailed
        ? DEFAULT_DISH_HERO_FALLBACK
        : null;
  const showGenerating = Boolean(isGeneratingPhoto && !primaryUrl);

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="relative h-44 w-full overflow-hidden bg-stone-200">
        {showGenerating ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F0F4ED] via-stone-50 to-[#E8EFE3]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#556B2F]/30 border-t-[#556B2F]" />
          </div>
        ) : heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt={
              recipe.titulo
                ? tDetail("dishPhotoAlt", { title: recipe.titulo })
                : tDetail("dishPhotoAltFallback")
            }
            className="h-44 w-full object-cover"
            loading="eager"
            decoding="async"
            onError={() => {
              if (primaryUrl && !imageFailed && heroImageUrl === primaryUrl) {
                setImageFailed(true);
                return;
              }
              setFallbackFailed(true);
            }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#556B2F]/40 via-stone-400 to-stone-600" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
          <h1 className="font-serif text-lg font-semibold leading-snug text-white drop-shadow-sm">
            {recipe.titulo}
          </h1>
          <HeroBadges
            timeLabel={timeLabel}
            mealTypeLabel={mealTypeLabel}
            servingsLabel={servingsLabel}
            kcal={macros ? Math.round(macros.calorias) : null}
            protein={macros ? Math.round(macros.proteinas_g) : null}
            onDark
            kcalLabel={t("macroKcal")}
            proteinLabel={t("macroProteinShort")}
          />
        </div>
      </div>

      <div className="border-b border-stone-100 px-2 pt-2" role="tablist" aria-label={t("recipeDetailTabs")}>
        <div className="grid grid-cols-2 gap-1">
          <TabButton
            active={tab === "ingredients"}
            onClick={() => setTab("ingredients")}
            label={tDetail("ingredients")}
          />
          <TabButton
            active={tab === "preparation"}
            onClick={() => setTab("preparation")}
            label={tDetail("preparation")}
          />
        </div>
      </div>

      <div className="px-4 py-3">
        {tab === "ingredients" ? (
          <>
            {mealTypeAdvisory ? (
              <div
                role="status"
                className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50 p-3 text-xs text-emerald-900 shadow-xs"
              >
                <span className="shrink-0 text-sm leading-none" aria-hidden>
                  ✨
                </span>
                <p className="leading-relaxed">{mealTypeAdvisory}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#3e5219]">
                {t("ingredientsYouHave")} ({pantrySplit.available.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {pantrySplit.available.length > 0 ? (
                  pantrySplit.available.map((item) => (
                    <li
                      key={`have-${item}`}
                      className="text-[12px] leading-snug text-stone-700"
                    >
                      <span className="mr-1 text-[#556B2F]" aria-hidden>
                        ✓
                      </span>
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-[12px] text-stone-400">—</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                {t("ingredientsMissing")} ({pantrySplit.missing.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {pantrySplit.missing.length > 0 ? (
                  pantrySplit.missing.map((item) => (
                    <li
                      key={`miss-${item}`}
                      className="text-[12px] leading-snug text-stone-700"
                    >
                      <span className="mr-1 text-amber-600" aria-hidden>
                        ·
                      </span>
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-[12px] text-stone-400">{t("ingredientsAllCovered")}</li>
                )}
              </ul>
            </div>
          </div>
          </>
        ) : (
          <div className="space-y-3">
            {steps.length > 0 ? (
              steps.map((step, index) => {
                const num = String(index + 1).padStart(2, "0");
                return (
                  <div key={`${num}-${step.slice(0, 24)}`} className="flex gap-2.5">
                    <span className="w-6 shrink-0 font-serif text-base font-medium leading-none text-[#556B2F]/85">
                      {num}
                    </span>
                    <p className="flex-1 pt-0.5 text-[12px] leading-relaxed text-stone-700">
                      {step}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-[12px] text-stone-400">—</p>
            )}

            {recipe.tip_sandra ? (
              <p className="mt-2 rounded-2xl bg-[#F0F4ED]/70 px-3 py-2 text-[11px] leading-relaxed text-[#3e5219]">
                <span className="font-semibold">Tip de Sandra: </span>
                {recipe.tip_sandra.replace(/^Tip de Sandra:\s*/i, "")}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function HeroBadges({
  timeLabel,
  mealTypeLabel,
  servingsLabel,
  kcal,
  protein,
  onDark = false,
  kcalLabel,
  proteinLabel
}: {
  timeLabel: string;
  mealTypeLabel?: string | null;
  servingsLabel?: string | null;
  kcal: number | null;
  protein: number | null;
  onDark?: boolean;
  kcalLabel: string;
  proteinLabel: string;
}) {
  const chip = onDark
    ? "inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
    : "inline-flex items-center gap-1 rounded-full border border-stone-200/80 bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-700 shadow-sm";

  return (
    <div className="flex flex-wrap gap-1.5">
      {mealTypeLabel ? <span className={chip}>☀️ {mealTypeLabel}</span> : null}
      <span className={chip}>⚡ {timeLabel}</span>
      {servingsLabel ? <span className={chip}>🍽️ {servingsLabel}</span> : null}
      {kcal != null ? (
        <span className={chip}>
          🥗 {kcal} {kcalLabel}
        </span>
      ) : null}
      {protein != null ? (
        <span className={chip}>
          💪 {protein}g {proteinLabel}
        </span>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-center text-[12px] font-semibold transition",
        active
          ? "bg-[#F0F4ED] text-[#3e5219]"
          : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
      )}
    >
      {label}
    </button>
  );
}
