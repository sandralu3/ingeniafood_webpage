"use client";

import { useState } from "react";
import Link from "next/link";
import { Coffee, Clock3, Loader2, RefreshCw, Soup, Trash2, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import { RecipeMedia } from "@/components/recipes/recipe-media";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { removePlanMeal, swapPlanMeal } from "@/lib/plan/plan-service";
import type { MealType } from "@/lib/plan/constants";
import { getMealTypeIcon, getMealTypeSubtleAccent } from "@/lib/plan/meal-type-accent";
import {
  externalMealBadgeLabel,
  type ExternalMealBadge
} from "@/lib/plan/external-meal";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

export type PlanMeal = {
  id: string;
  recipeId: string;
  title: string;
  mealType: MealType;
  imageUrl?: string | null;
  instagramUrl?: string | null;
  isSocialVideo?: boolean;
  /** Tiempo de preparación en minutos */
  prepMinutes?: number;
  /** @deprecated Usa prepMinutes */
  calories?: number;
  /** Calorías estimadas de la receta */
  kcal?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  ingredientNames?: string[];
  hasVegetables?: boolean;
  hasProtein?: boolean;
  isAirfryer?: boolean;
  isFlourless?: boolean;
  /** Comida registrada fuera / escaneada (no cocinada del recetario). */
  externalBadge?: ExternalMealBadge | null;
};

type PlanMealCardProps = {
  meal: PlanMeal;
  onMealSwapped?: (updatedMeal: PlanMeal) => void;
  onSwapError?: (message: string) => void;
  onMealRemoved?: (mealType: MealType) => void;
  onRemoveError?: (message: string) => void;
  variant?: "default" | "slot" | "panel";
  className?: string;
};

function ExternalMealBadgePill({ badge }: { badge: ExternalMealBadge }) {
  return (
    <span
      className={cn(
        "mt-1 inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        badge === "escaneado"
          ? "bg-sky-50 text-sky-800 ring-1 ring-sky-200/70"
          : "bg-violet-50 text-violet-800 ring-1 ring-violet-200/70"
      )}
    >
      {externalMealBadgeLabel(badge)}
    </span>
  );
}

function getPrepMinutes(meal: PlanMeal): number | undefined {
  return meal.prepMinutes ?? meal.calories;
}

function buildNutritionPills(
  meal: PlanMeal,
  labels: { flourless: string; airfryer: string; healthy: string }
): string[] {
  const pills: string[] = [];

  if (meal.isFlourless) pills.push(labels.flourless);
  if (meal.isAirfryer) pills.push(labels.airfryer);
  if (!meal.isAirfryer && !meal.isFlourless) pills.push(labels.healthy);

  return pills.slice(0, 2);
}

function recipeDetailHref(recipeId: string) {
  return `/app-recetas/recipes/${recipeId}`;
}

function getMealPlaceholderStyle(mealType: MealType): {
  className: string;
  Icon: typeof Coffee;
} {
  switch (mealType) {
    case "Desayuno":
      return {
        className: "bg-amber-50 text-amber-700 ring-amber-100/80",
        Icon: Coffee
      };
    case "Almuerzo":
      return {
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100/80",
        Icon: Utensils
      };
    case "Cena":
      return {
        className: "bg-indigo-50/70 text-indigo-700 ring-indigo-100/80",
        Icon: Soup
      };
    default:
      return {
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100/80",
        Icon: Utensils
      };
  }
}

function MealThumbnail({
  imageUrl,
  title,
  mealType,
  compact = false,
  imageAlt,
  imageAltFallback
}: {
  imageUrl?: string | null;
  title: string;
  mealType: MealType;
  compact?: boolean;
  imageAlt: string;
  imageAltFallback: string;
}) {
  const sizeClass = compact ? "h-14 w-14 rounded-lg" : "h-20 w-20 rounded-xl";
  const iconSize = compact ? "h-5 w-5" : "h-7 w-7";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={title ? imageAlt : imageAltFallback}
        className={cn("shrink-0 object-cover ring-1 ring-stone-100", sizeClass)}
        loading="lazy"
      />
    );
  }

  if (compact) {
    const accent = getMealTypeSubtleAccent(mealType);
    const Icon = getMealTypeIcon(mealType);

    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center ring-1",
          sizeClass,
          accent.iconCircleBg,
          accent.iconRing,
          accent.iconText
        )}
        aria-hidden
      >
        <Icon className={cn("stroke-[1.75]", iconSize)} />
      </div>
    );
  }

  const { className, Icon } = getMealPlaceholderStyle(mealType);

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center ring-1", sizeClass, className)}
      aria-hidden
    >
      <Icon className={cn("stroke-[1.75]", iconSize)} />
    </div>
  );
}

function CompactActionButtons({
  isSwapping,
  isRemoving,
  swapDisabled,
  removeDisabled,
  onSwap,
  onRemove,
  compact = false,
  removeAria,
  swapAria
}: {
  isSwapping: boolean;
  isRemoving: boolean;
  swapDisabled: boolean;
  removeDisabled: boolean;
  onSwap: () => void;
  onRemove: () => void;
  compact?: boolean;
  removeAria: string;
  swapAria: string;
}) {
  const buttonSize = compact ? "h-7 w-7" : "h-8 w-8";
  const iconSize = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className={cn("flex shrink-0 items-center gap-1", compact ? "flex-row" : "flex-col gap-1.5 sm:flex-row")}>
      <button
        type="button"
        onClick={onRemove}
        disabled={removeDisabled}
        aria-label={removeAria}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50",
          buttonSize
        )}
      >
        {isRemoving ? (
          <Loader2 className={cn("animate-spin", iconSize)} />
        ) : (
          <Trash2 className={iconSize} strokeWidth={2.25} />
        )}
      </button>

      <button
        type="button"
        onClick={onSwap}
        disabled={swapDisabled}
        aria-label={swapAria}
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-stone-100 font-bold uppercase tracking-wide text-stone-600 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50",
          compact ? "h-7 px-2 text-[9px]" : "px-2.5 py-1.5 text-[10px]"
        )}
      >
        {isSwapping ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" strokeWidth={2.5} />
        )}
        Swap
      </button>
    </div>
  );
}

function SwapButton({
  isSwapping,
  disabled,
  onClick,
  floating = false,
  swapAria
}: {
  isSwapping: boolean;
  disabled: boolean;
  onClick: () => void;
  floating?: boolean;
  swapAria: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50",
        floating
          ? "absolute right-3 top-3 z-20 border border-white/30 bg-white/80 px-2.5 py-1.5 text-stone-800 shadow-lg backdrop-blur-md hover:bg-white"
          : "border border-[#556B2F]/20 bg-[#F0F4ED] px-2.5 py-1 text-[#3e5219] hover:bg-[#dce7c3]"
      )}
      aria-label={swapAria}
    >
      {isSwapping ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3" strokeWidth={2.5} />
      )}
      Swap
    </button>
  );
}

function HorizontalMealCard({
  meal,
  isFading,
  showMealType = true,
  compact = false,
  isSwapping,
  isRemoving,
  swapDisabled,
  removeDisabled,
  onSwap,
  onRemove,
  className,
  mealTypeLabel,
  removeAria,
  swapAria,
  viewRecipeAria,
  imageAlt,
  imageAltFallback,
  nutritionPills
}: {
  meal: PlanMeal;
  isFading: boolean;
  showMealType?: boolean;
  compact?: boolean;
  isSwapping: boolean;
  isRemoving: boolean;
  swapDisabled: boolean;
  removeDisabled: boolean;
  onSwap: () => void;
  onRemove: () => void;
  className?: string;
  mealTypeLabel: string;
  removeAria: string;
  swapAria: string;
  viewRecipeAria: string;
  imageAlt: string;
  imageAltFallback: string;
  nutritionPills: string[];
}) {
  return (
    <article
      className={cn(
        "flex items-center transition-all duration-300",
        compact
          ? "gap-2 rounded-lg bg-transparent px-0 py-0"
          : "gap-3 rounded-2xl border border-stone-100/80 bg-white p-3 shadow-md shadow-stone-200/40",
        isFading && "scale-[0.98] opacity-70",
        className
      )}
    >
      <Link
        href={recipeDetailHref(meal.recipeId)}
        className={cn(
          "flex min-w-0 flex-1 items-center rounded-xl transition hover:bg-stone-50/60 active:bg-stone-50",
          compact ? "gap-2" : "gap-4"
        )}
        aria-label={viewRecipeAria}
      >
        <MealThumbnail
          imageUrl={meal.imageUrl}
          title={meal.title}
          mealType={meal.mealType}
          compact={compact}
          imageAlt={imageAlt}
          imageAltFallback={imageAltFallback}
        />

        <div className="min-w-0 flex-1">
          {showMealType ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              {mealTypeLabel}
            </p>
          ) : null}

          <h3
            className={cn(
              "line-clamp-2 font-bold leading-snug",
              compact ? "text-sm text-stone-800" : "text-base text-stone-800",
              showMealType ? "mt-0.5" : ""
            )}
          >
            {meal.title}
          </h3>

          {meal.externalBadge ? <ExternalMealBadgePill badge={meal.externalBadge} /> : null}

          {!compact && (getPrepMinutes(meal) || meal.kcal || nutritionPills.length > 0) ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {getPrepMinutes(meal) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  <Clock3 className="h-3 w-3" />
                  {getPrepMinutes(meal)} min
                </span>
              ) : null}

              {meal.kcal ? (
                <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800 ring-1 ring-orange-100">
                  {meal.kcal} kcal
                </span>
              ) : null}

              {nutritionPills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200/70"
                >
                  {pill}
                </span>
              ))}
            </div>
          ) : compact && (meal.kcal || getPrepMinutes(meal)) ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              {meal.kcal ? (
                <span className="text-[11px] font-semibold tabular-nums text-orange-800">
                  {meal.kcal} kcal
                </span>
              ) : null}
              {getPrepMinutes(meal) ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-500">
                  <Clock3 className="h-2.5 w-2.5" />
                  {getPrepMinutes(meal)} min
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="flex shrink-0 flex-col items-center gap-2">
        {meal.instagramUrl && !compact ? (
          <RecipeInstagramLink
            url={meal.instagramUrl}
            className="!border-stone-200 !bg-stone-50 !px-2 !py-0.5 !text-[10px] !text-stone-600"
          />
        ) : null}

        <CompactActionButtons
          compact={compact}
          isSwapping={isSwapping}
          isRemoving={isRemoving}
          swapDisabled={swapDisabled}
          removeDisabled={removeDisabled}
          onSwap={onSwap}
          onRemove={onRemove}
          removeAria={removeAria}
          swapAria={swapAria}
        />
      </div>
    </article>
  );
}

export function PlanMealCard({
  meal,
  onMealSwapped,
  onSwapError,
  onMealRemoved,
  onRemoveError,
  variant = "default",
  className
}: PlanMealCardProps) {
  const t = useTranslations("Plan");
  const tCommon = useTranslations("Common");
  const [isSwapping, setIsSwapping] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  const isPanel = variant === "panel";
  const isCompact = variant === "slot";
  const hasReel = Boolean(meal.instagramUrl && !meal.imageUrl);
  const useHeroLayout = isCompact && (Boolean(meal.imageUrl) || hasReel);

  const swapDisabled = isSwapping;
  const removeDisabled = isRemoving || isSwapping;

  const mealTypeLabel = t(`meals.${meal.mealType}`);
  const removeAria = t("removeAria");
  const swapAria = t("swapAria");
  const viewRecipeAria = t("viewRecipeAria", { title: meal.title });
  const imageAlt = t("recipeImageAlt", { title: meal.title });
  const imageAltFallback = t("recipeImageAltFallback");
  const nutritionPills = buildNutritionPills(meal, {
    flourless: t("tagFlourless"),
    airfryer: t("tagAirfryer"),
    healthy: t("tagHealthy")
  });

  const handleSwap = async () => {
    if (swapDisabled) return;

    setIsSwapping(true);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        onSwapError?.(t("loginToSwap"));
        return;
      }

      const mealType = meal.mealType as MealType;
      const updated = await swapPlanMeal({
        userId: user.id,
        planEntryId: meal.id,
        currentRecipeId: meal.recipeId,
        mealType
      });

      if (!updated) {
        onSwapError?.(t("noCompatibleRecipe"));
        return;
      }

      setIsFading(true);
      window.setTimeout(() => {
        onMealSwapped?.(updated);
        setIsFading(false);
      }, 220);
    } catch (error) {
      console.error("[plan-meal-card] Error en swap:", error);
      onSwapError?.(t("swapError"));
    } finally {
      setIsSwapping(false);
    }
  };

  const handleRemove = async () => {
    if (removeDisabled) return;

    setIsRemoving(true);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        onRemoveError?.(t("loginToEdit"));
        return;
      }

      const removed = await removePlanMeal({
        userId: user.id,
        planEntryId: meal.id
      });

      if (!removed) {
        onRemoveError?.(t("removeError"));
        return;
      }

      setIsRemoveDialogOpen(false);
      onMealRemoved?.(meal.mealType);
    } catch (error) {
      console.error("[plan-meal-card] Error quitando receta:", error);
      onRemoveError?.(t("removeErrorGeneric"));
    } finally {
      setIsRemoving(false);
    }
  };

  const requestRemove = () => {
    if (removeDisabled) return;
    setIsRemoveDialogOpen(true);
  };

  const actionProps = {
    isSwapping,
    isRemoving,
    swapDisabled,
    removeDisabled,
    onSwap: () => void handleSwap(),
    onRemove: requestRemove,
    mealTypeLabel,
    removeAria,
    swapAria,
    viewRecipeAria,
    imageAlt,
    imageAltFallback,
    nutritionPills
  };

  const confirmDialog = (
    <ConfirmDialog
      open={isRemoveDialogOpen}
      onOpenChange={setIsRemoveDialogOpen}
      title={t("removeConfirmTitle")}
      description={t("removeConfirmDescription", {
        title: meal.title,
        meal: mealTypeLabel
      })}
      confirmLabel={t("removeConfirm")}
      cancelLabel={tCommon("cancel")}
      onConfirm={() => void handleRemove()}
      isLoading={isRemoving}
      destructive
    />
  );

  if (isPanel || variant === "default") {
    return (
      <>
        <HorizontalMealCard
          meal={meal}
          isFading={isFading}
          showMealType={!isPanel}
          compact={isPanel}
          className={className}
          {...actionProps}
        />
        {confirmDialog}
      </>
    );
  }

  if (useHeroLayout) {
    return (
      <>
        <article
          className={cn(
            "group relative h-36 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-md shadow-stone-200/40 transition-all duration-300",
            isFading && "scale-[0.98] opacity-70",
            className
          )}
        >
          <Link
            href={recipeDetailHref(meal.recipeId)}
            className="absolute inset-0 z-10"
            aria-label={viewRecipeAria}
          />

          <RecipeMedia
            imageUrl={meal.imageUrl}
            isSocialVideo={hasReel}
            variant="fill"
            className="absolute inset-0 h-full w-full"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

          <SwapButton
            floating
            isSwapping={isSwapping}
            disabled={swapDisabled}
            onClick={() => void handleSwap()}
            swapAria={swapAria}
          />

          <button
            type="button"
            onClick={requestRemove}
            disabled={removeDisabled}
            aria-label={removeAria}
            className={cn(
              "absolute left-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/80 text-stone-700 shadow-lg backdrop-blur-md transition hover:bg-white",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.25} />
          </button>

          {meal.instagramUrl ? (
            <RecipeInstagramLink url={meal.instagramUrl} variant="floating" />
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 pt-10">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow-md">
              {meal.title}
            </h3>
            {meal.externalBadge ? (
              <span className="mt-1 inline-flex rounded-md bg-black/35 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                {externalMealBadgeLabel(meal.externalBadge)}
              </span>
            ) : null}
            {getPrepMinutes(meal) || meal.kcal ? (
              <p className="mt-1 inline-flex flex-wrap items-center gap-2 text-[11px] font-medium text-white/80">
                {getPrepMinutes(meal) ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {getPrepMinutes(meal)} min
                  </span>
                ) : null}
                {meal.kcal ? <span>{meal.kcal} kcal</span> : null}
              </p>
            ) : null}
          </div>
        </article>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <HorizontalMealCard
        meal={meal}
        isFading={isFading}
        showMealType={false}
        className={className}
        {...actionProps}
      />
      {confirmDialog}
    </>
  );
}
