"use client";

import { useEffect, useMemo, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useTranslations } from "next-intl";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";
import { formatTimeLabel } from "@/lib/share/recipe-share-utils";
import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
import { partitionIngredientsByPantry } from "@/lib/recipes/recipe-options";
import { DEFAULT_DISH_HERO_FALLBACK } from "@/lib/recipes/dish-image-fallback";
import type { AppliedRecipeFilters } from "@/lib/recipes/premium-recipe-filters";
import {
  inferAdvisoryTone,
  RecipeAdvisoryPulseButton
} from "@/components/recipes/recipe-advisory-alert";
import { cn } from "@/lib/utils";
import { translateMealType } from "@/lib/i18n/filter-labels";

type DetailTab = "ingredients" | "preparation";

const LOTTIE_SRC = "/lottie/LoadingEscaner.json";
const MESSAGE_ROTATION_MS = 5000;
const LOADER_MESSAGE_KEYS = [
  "loaderIngredients",
  "loaderCooking",
  "loaderPlating"
] as const;

type Props = {
  recipe: ShareableRecipe;
  pantryIngredients?: string[];
  mealTypeAdvisory?: string | null;
  isGeneratingPhoto?: boolean;
  appliedFilters?: AppliedRecipeFilters | null;
  /** contain = foto completa (p. ej. plato escaneado desde el plan). */
  imageFit?: "cover" | "contain";
  /** Badge sobre la foto (Escaneado / Comida fuera). */
  heroBadge?: string | null;
  /**
   * Comida fuera / escaneada: sin pestaña Preparación ni Tip de Sandra.
   * La alerta (mealTypeAdvisory) se mantiene.
   */
  loggedMeal?: boolean;
};

export function RecipeResultHeroCard({
  recipe,
  pantryIngredients = [],
  mealTypeAdvisory = null,
  isGeneratingPhoto = false,
  appliedFilters = null,
  imageFit = "cover",
  heroBadge = null,
  loggedMeal = false
}: Props) {
  const t = useTranslations("Scanner");
  const tDetail = useTranslations("RecipeDetail");
  const [tab, setTab] = useState<DetailTab>("ingredients");
  const [imageFailed, setImageFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [loaderMessageIndex, setLoaderMessageIndex] = useState(0);
  const [loaderMessageVisible, setLoaderMessageVisible] = useState(true);

  useEffect(() => {
    setTab("ingredients");
    setImageFailed(false);
    setFallbackFailed(false);
  }, [recipe.titulo, recipe.imageUrl, recipe.referenceImageUrl]);

  useEffect(() => {
    if (!isGeneratingPhoto) return;

    let fadeTimeoutId: number | undefined;
    const intervalId = window.setInterval(() => {
      setLoaderMessageVisible(false);
      fadeTimeoutId = window.setTimeout(() => {
        setLoaderMessageIndex((current) => (current + 1) % LOADER_MESSAGE_KEYS.length);
        setLoaderMessageVisible(true);
      }, 280);
    }, MESSAGE_ROTATION_MS);

    return () => {
      window.clearInterval(intervalId);
      if (fadeTimeoutId !== undefined) {
        window.clearTimeout(fadeTimeoutId);
      }
    };
  }, [isGeneratingPhoto]);

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
  const primaryUrl = recipe.imageUrl || null;
  const referenceUrl = recipe.referenceImageUrl || null;
  // Mientras se genera la foto real OpenAI, no usar la imagen del banco como si ya estuviera lista.
  const showGenerating = Boolean(isGeneratingPhoto && !primaryUrl);
  const loaderMessageKey =
    LOADER_MESSAGE_KEYS[loaderMessageIndex] ?? LOADER_MESSAGE_KEYS[0];
  const heroImageUrl = showGenerating
    ? null
    : primaryUrl && !imageFailed
      ? primaryUrl
      : !isGeneratingPhoto && referenceUrl && !imageFailed
        ? referenceUrl
        : !isGeneratingPhoto && !fallbackFailed
          ? DEFAULT_DISH_HERO_FALLBACK
          : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm">
      <div
        className={cn(
          "relative w-full overflow-hidden bg-stone-200",
          imageFit === "contain" ? "h-72 sm:h-80" : "h-64"
        )}
      >
        {showGenerating ? (
          <div
            className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F0F4ED] via-stone-50 to-[#E8EFE3]"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(85,107,47,0.12), transparent 45%), radial-gradient(circle at 80% 70%, rgba(201,162,39,0.10), transparent 40%)"
              }}
            />
            <div className="relative flex w-full max-w-[12rem] flex-1 items-center justify-center pt-4">
              <DotLottieReact
                src={LOTTIE_SRC}
                loop
                autoplay
                className="h-full w-full"
              />
            </div>
            <p
              className={cn(
                "relative z-10 mb-10 min-h-[2.25rem] px-4 text-center text-[11px] font-medium leading-snug text-[#3e5219] transition-all duration-300 ease-out",
                loaderMessageVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              )}
            >
              {tDetail(loaderMessageKey)}
            </p>
          </div>
        ) : heroImageUrl ? (
          imageFit === "contain" ? (
            <>
              {/* Blur backdrop: rellena el marco sin franjas negras */}
              <img
                src={heroImageUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 z-0 h-full w-full scale-110 object-cover opacity-60 blur-xl brightness-75"
                draggable={false}
              />
              <div className="relative z-10 flex h-full w-full items-center justify-center">
                <img
                  src={heroImageUrl}
                  alt={
                    recipe.titulo
                      ? tDetail("dishPhotoAlt", { title: recipe.titulo })
                      : tDetail("dishPhotoAltFallback")
                  }
                  className="max-h-full max-w-full object-contain"
                  loading="eager"
                  decoding="async"
                  onError={() => {
                    if (primaryUrl && !imageFailed && heroImageUrl === primaryUrl) {
                      setImageFailed(true);
                      return;
                    }
                    if (referenceUrl && !imageFailed && heroImageUrl === referenceUrl) {
                      setImageFailed(true);
                      return;
                    }
                    setFallbackFailed(true);
                  }}
                />
              </div>
            </>
          ) : (
            <img
              src={heroImageUrl}
              alt={
                recipe.titulo
                  ? tDetail("dishPhotoAlt", { title: recipe.titulo })
                  : tDetail("dishPhotoAltFallback")
              }
              className="relative z-10 h-full w-full object-cover"
              loading="eager"
              decoding="async"
              onError={() => {
                if (primaryUrl && !imageFailed && heroImageUrl === primaryUrl) {
                  setImageFailed(true);
                  return;
                }
                if (referenceUrl && !imageFailed && heroImageUrl === referenceUrl) {
                  setImageFailed(true);
                  return;
                }
                setFallbackFailed(true);
              }}
            />
          )
        ) : (
          <div className="relative z-10 h-full w-full bg-gradient-to-br from-[#556B2F]/40 via-stone-400 to-stone-600" />
        )}

        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-20",
            imageFit === "contain"
              ? "bg-gradient-to-t from-black/80 via-black/20 to-transparent"
              : "bg-gradient-to-t from-black/80 via-black/45 to-transparent"
          )}
        />
        {mealTypeAdvisory?.trim() ? (
          <div className="absolute inset-0 z-30 pointer-events-none [&>*]:pointer-events-auto">
            <RecipeAdvisoryPulseButton
              message={mealTypeAdvisory}
              tone={inferAdvisoryTone(mealTypeAdvisory)}
            />
          </div>
        ) : null}
        {heroBadge?.trim() ? (
          <span className="absolute left-3 top-3 z-30 inline-flex items-center rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm ring-1 ring-white/20">
            {heroBadge}
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 z-30 space-y-2 px-4 pb-3 pt-10">
          <h1 className="font-serif text-lg font-semibold leading-snug text-white drop-shadow-md">
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
            hideTime={!recipe.tiempo_preparacion?.trim()}
          />
        </div>
      </div>

      {!loggedMeal ? (
        <div
          className="border-b border-stone-100 bg-white px-4 pt-2"
          role="tablist"
          aria-label={t("recipeDetailTabs")}
        >
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
      ) : (
        <div className="border-b border-stone-100 bg-white px-4 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
            {tDetail.has("foodsLabel") ? tDetail("foodsLabel") : "Alimentos"}
          </p>
        </div>
      )}

      <div className="bg-white px-4 py-3">
        {loggedMeal || tab === "ingredients" ? (
          loggedMeal ? (
            <ul className="space-y-1.5">
              {recipe.ingredientes_detallados.length > 0 ? (
                recipe.ingredientes_detallados.map((item) => (
                  <li
                    key={item}
                    className="text-[12px] leading-snug text-stone-700"
                  >
                    <span className="mr-1 text-[#556B2F]" aria-hidden>
                      ·
                    </span>
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-[12px] text-stone-400">—</li>
              )}
            </ul>
          ) : (
            <>
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
                      <li className="text-[12px] text-stone-400">
                        {t("ingredientsAllCovered")}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )
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
  proteinLabel,
  hideTime = false
}: {
  timeLabel: string;
  mealTypeLabel?: string | null;
  servingsLabel?: string | null;
  kcal: number | null;
  protein: number | null;
  onDark?: boolean;
  kcalLabel: string;
  proteinLabel: string;
  hideTime?: boolean;
}) {
  const chip = onDark
    ? "inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
    : "inline-flex items-center gap-1 rounded-full border border-stone-200/80 bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-700 shadow-sm";

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {mealTypeLabel ? <span className={chip}>☀️ {mealTypeLabel}</span> : null}
      {!hideTime ? <span className={chip}>⚡ {timeLabel}</span> : null}
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
