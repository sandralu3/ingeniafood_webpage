"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";
import { formatTimeLabel } from "@/lib/share/recipe-share-utils";
import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
import { partitionIngredientsByPantry } from "@/lib/recipes/recipe-options";
import { DEFAULT_DISH_HERO_FALLBACK, getRecipeImageFallback } from "@/lib/recipes/dish-image-fallback";
import { isShowingReferenceDishImage } from "@/lib/recipes/dish-image-kind";
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
  /** Si false, al mostrar imagen de referencia se anima a Premium. */
  isPremium?: boolean;
  /** Ya usó su único intento de foto real (prueba 24h / Premium once). */
  hasGeneratedRealPhoto?: boolean;
  /** Receta oficial de Sandra: la foto es siempre la real; sin avisos de referencia. */
  isSandraRecipe?: boolean;
  /** Badges debajo de la foto (p. ej. Receta de Sandra / filtros). */
  headerBadges?: ReactNode;
  /**
   * hero = imagen a ancho completo (detalle).
   * card = tarjeta con margen (escáner / embebido).
   */
  layout?: "hero" | "card";
  /** Barra flotante sobre la foto (Volver + acciones). Solo con layout="hero". */
  heroChrome?: ReactNode;
  /** Contenido sobre la foto (p. ej. Ver en Instagram). */
  heroMediaOverlay?: ReactNode;
  onRequestPremium?: () => void;
};

export function RecipeResultHeroCard({
  recipe,
  pantryIngredients = [],
  mealTypeAdvisory = null,
  isGeneratingPhoto = false,
  appliedFilters = null,
  imageFit: _imageFit = "cover",
  heroBadge = null,
  loggedMeal = false,
  isPremium = false,
  hasGeneratedRealPhoto = false,
  isSandraRecipe = false,
  headerBadges = null,
  layout = "card",
  heroChrome = null,
  heroMediaOverlay = null,
  onRequestPremium
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
  const catalogFallback = useMemo(
    () =>
      getRecipeImageFallback({
        titulo: recipe.titulo,
        ingredientes_detallados: recipe.ingredientes_detallados,
        tags: recipe.tags
      }),
    [recipe.titulo, recipe.ingredientes_detallados, recipe.tags]
  );
  const heroImageUrl = showGenerating
    ? null
    : primaryUrl && !imageFailed
      ? primaryUrl
      : !isGeneratingPhoto && referenceUrl && !imageFailed
        ? referenceUrl
        : !isGeneratingPhoto && !fallbackFailed
          ? catalogFallback || DEFAULT_DISH_HERO_FALLBACK
          : null;

  const showingReferenceImage =
    !isSandraRecipe &&
    !loggedMeal &&
    !showGenerating &&
    isShowingReferenceDishImage({
      recipe,
      heroImageUrl,
      imageFailed
    });

  const isHeroLayout = layout === "hero";
  /** Solo en resultado de escáner con despensa: Ya tienes / Te faltan. */
  const showPantrySplit = pantryIngredients.length > 0;

  const handleHeroImageError = () => {
    if (primaryUrl && !imageFailed && heroImageUrl === primaryUrl) {
      setImageFailed(true);
      return;
    }
    if (referenceUrl && !imageFailed && heroImageUrl === referenceUrl) {
      setImageFailed(true);
      return;
    }
    setFallbackFailed(true);
  };

  const dishPhotoAlt = recipe.titulo
    ? tDetail("dishPhotoAlt", { title: recipe.titulo })
    : tDetail("dishPhotoAltFallback");

  return (
    <section
      className={cn(
        "overflow-hidden bg-white",
        isHeroLayout
          ? "rounded-none border-0 shadow-none"
          : "rounded-2xl border border-stone-100 shadow-sm"
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-stone-200",
          isHeroLayout
            ? "aspect-video w-full"
            : "mx-3 mt-3 aspect-video rounded-xl"
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
            <div className="relative flex w-full max-w-[10rem] flex-1 items-center justify-center pt-2">
              <DotLottieReact
                src={LOTTIE_SRC}
                loop
                autoplay
                className="h-full w-full"
              />
            </div>
            <p
              className={cn(
                "relative z-10 mb-6 min-h-[2rem] px-3 text-center text-[11px] font-medium leading-snug text-[#3e5219] transition-all duration-300 ease-out",
                loaderMessageVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              )}
            >
              {tDetail(loaderMessageKey)}
            </p>
          </div>
        ) : heroImageUrl ? (
          <>
            {/*
              Fondo borroso: scale alto para que el blur no deje
              bordes transparentes (que se veían como franjas negras).
            */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
              <img
                src={heroImageUrl}
                alt=""
                className="absolute left-1/2 top-1/2 h-[135%] w-[135%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover opacity-80 blur-2xl saturate-[1.35] brightness-105"
                draggable={false}
              />
              {/* Suaviza laterales para que el blur no se vea como franja plana */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/25" />
            </div>
            {/* Capa frontal: foto completa, sin recortar */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <img
                src={heroImageUrl}
                alt={dishPhotoAlt}
                className="h-full max-h-full w-full max-w-full object-contain"
                loading="eager"
                decoding="async"
                onError={handleHeroImageError}
              />
            </div>
          </>
        ) : (
          <div className="relative z-10 h-full w-full bg-gradient-to-br from-[#556B2F]/40 via-stone-400 to-stone-600" />
        )}

        {isHeroLayout || heroChrome ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/40 via-black/15 to-transparent pb-10 pt-3">
            <div className="pointer-events-auto flex items-center justify-between gap-2 px-3">
              {heroChrome}
            </div>
          </div>
        ) : null}

        {heroMediaOverlay}

        {heroBadge?.trim() ? (
          <span
            className={cn(
              "absolute z-30 inline-flex items-center rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm ring-1 ring-white/20",
              isHeroLayout || heroChrome ? "left-3 top-14" : "left-2.5 top-2.5"
            )}
          >
            {heroBadge}
          </span>
        ) : null}
        {showingReferenceImage ? (
          <span
            className={cn(
              "absolute z-30 inline-flex items-center rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/95 backdrop-blur-sm",
              isHeroLayout || heroChrome
                ? heroBadge?.trim()
                  ? "left-3 top-[4.75rem]"
                  : "left-3 top-14"
                : heroBadge?.trim()
                  ? "left-2.5 top-10"
                  : "left-2.5 top-2.5"
            )}
          >
            {tDetail("referenceImageBadge")}
          </span>
        ) : null}
        {showingReferenceImage ? (
          <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 pr-14">
            <div className="rounded-full border border-white/25 bg-black/35 px-3 py-1.5 shadow-sm backdrop-blur-md">
              <p className="text-[10px] leading-snug text-white/95">
                {isPremium && hasGeneratedRealPhoto
                  ? tDetail("referenceImageAfterRealPhoto")
                  : tDetail("referenceImageNote")}
              </p>
              {!isPremium && onRequestPremium ? (
                <button
                  type="button"
                  onClick={onRequestPremium}
                  className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#F5E6A6] underline-offset-2 hover:underline"
                >
                  <Crown className="h-3 w-3" strokeWidth={2} aria-hidden />
                  {tDetail("premiumRealPhotoPrompt")}
                </button>
              ) : !isPremium ? (
                <p className="mt-0.5 text-[10px] font-semibold text-[#F5E6A6]">
                  {tDetail("premiumRealPhotoPrompt")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {mealTypeAdvisory?.trim() ? (
          <RecipeAdvisoryPulseButton
            message={mealTypeAdvisory}
            tone={inferAdvisoryTone(mealTypeAdvisory)}
          />
        ) : null}
      </div>

      <div
        className={cn(
          "space-y-2 border-b border-stone-100 bg-white",
          isHeroLayout ? "px-4 pb-3 pt-3" : "px-3 pb-2.5 pt-2.5"
        )}
      >
        {headerBadges ? (
          <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {headerBadges}
          </div>
        ) : null}
        <h1
          className={cn(
            "font-serif font-semibold leading-snug tracking-tight text-stone-900",
            isHeroLayout ? "text-xl" : "text-lg"
          )}
        >
          {recipe.titulo}
        </h1>
        <HeroBadges
          timeLabel={timeLabel}
          mealTypeLabel={mealTypeLabel}
          servingsLabel={servingsLabel}
          kcal={macros ? Math.round(macros.calorias) : null}
          protein={macros ? Math.round(macros.proteinas_g) : null}
          kcalLabel={t("macroKcal")}
          proteinLabel={t("macroProteinShort")}
          hideTime={!recipe.tiempo_preparacion?.trim()}
          compact
        />
      </div>

      {!loggedMeal ? (
        <div
          className={cn(
            "border-b border-stone-100 bg-white pt-1.5",
            isHeroLayout ? "px-4" : "px-3"
          )}
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
        <div
          className={cn(
            "border-b border-stone-100 bg-white pt-2.5",
            isHeroLayout ? "px-4" : "px-3"
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
            {tDetail.has("foodsLabel") ? tDetail("foodsLabel") : "Alimentos"}
          </p>
        </div>
      )}

      <div className={cn("bg-white py-2.5", isHeroLayout ? "px-4" : "px-3")}>
        {loggedMeal || tab === "ingredients" ? (
          loggedMeal || !showPantrySplit ? (
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
  kcalLabel,
  proteinLabel,
  hideTime = false,
  compact = false
}: {
  timeLabel: string;
  mealTypeLabel?: string | null;
  servingsLabel?: string | null;
  kcal: number | null;
  protein: number | null;
  kcalLabel: string;
  proteinLabel: string;
  hideTime?: boolean;
  compact?: boolean;
}) {
  const chip = compact
    ? "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700"
    : "inline-flex items-center gap-1 rounded-full border border-stone-200/80 bg-[#F7F5F1] px-2 py-0.5 text-[10px] font-semibold text-stone-700";

  return (
    <div
      className={cn(
        "flex gap-1.5",
        compact
          ? "flex-nowrap overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex-wrap gap-y-1.5"
      )}
    >
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
