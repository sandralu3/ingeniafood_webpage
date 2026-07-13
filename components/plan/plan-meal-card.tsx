"use client";

import { useState } from "react";
import Link from "next/link";
import { Coffee, Clock3, Loader2, RefreshCw, Soup, Trash2, Utensils } from "lucide-react";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import { RecipeMedia } from "@/components/recipes/recipe-media";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { removePlanMeal, swapPlanMeal } from "@/lib/plan/plan-service";
import type { MealType } from "@/lib/plan/constants";
import { getMealTypeIcon, getMealTypeSubtleAccent } from "@/lib/plan/meal-type-accent";
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
  calories?: number;
  isAirfryer?: boolean;
  isFlourless?: boolean;
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

function buildNutritionPills(meal: PlanMeal): string[] {
  const pills: string[] = [];

  if (meal.isFlourless) pills.push("Sin harinas");
  if (meal.isAirfryer) pills.push("Airfryer");
  if (!meal.isAirfryer && !meal.isFlourless) pills.push("Saludable");

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
  compact = false
}: {
  imageUrl?: string | null;
  title: string;
  mealType: MealType;
  compact?: boolean;
}) {
  const sizeClass = compact ? "h-14 w-14 rounded-lg" : "h-20 w-20 rounded-xl";
  const iconSize = compact ? "h-5 w-5" : "h-7 w-7";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={title ? `Imagen de ${title}` : "Imagen de la receta"}
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
  compact = false
}: {
  isSwapping: boolean;
  isRemoving: boolean;
  swapDisabled: boolean;
  removeDisabled: boolean;
  onSwap: () => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  const buttonSize = compact ? "h-7 w-7" : "h-8 w-8";
  const iconSize = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className={cn("flex shrink-0 items-center gap-1", compact ? "flex-row" : "flex-col gap-1.5 sm:flex-row")}>
      <button
        type="button"
        onClick={onRemove}
        disabled={removeDisabled}
        aria-label="Quitar receta del día"
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
        aria-label="Intercambiar receta"
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
  floating = false
}: {
  isSwapping: boolean;
  disabled: boolean;
  onClick: () => void;
  floating?: boolean;
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
      aria-label="Intercambiar receta"
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
  className
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
}) {
  const nutritionPills = buildNutritionPills(meal);

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
        aria-label={`Ver receta: ${meal.title}`}
      >
        <MealThumbnail
          imageUrl={meal.imageUrl}
          title={meal.title}
          mealType={meal.mealType}
          compact={compact}
        />

        <div className="min-w-0 flex-1">
          {showMealType ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              {meal.mealType}
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

          {!compact && nutritionPills.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {meal.calories ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  <Clock3 className="h-3 w-3" />
                  {meal.calories} min
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
          ) : compact && meal.calories ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-stone-500">
              <Clock3 className="h-2.5 w-2.5" />
              {meal.calories} min
            </p>
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

  const handleSwap = async () => {
    if (swapDisabled) return;

    setIsSwapping(true);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        onSwapError?.("Inicia sesión para intercambiar comidas del plan.");
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
        onSwapError?.("No encontramos otra receta compatible para este tipo de comida.");
        return;
      }

      setIsFading(true);
      window.setTimeout(() => {
        onMealSwapped?.(updated);
        setIsFading(false);
      }, 220);
    } catch (error) {
      console.error("[plan-meal-card] Error en swap:", error);
      onSwapError?.("No pudimos intercambiar la receta. Inténtalo de nuevo.");
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
        onRemoveError?.("Inicia sesión para editar tu plan semanal.");
        return;
      }

      const removed = await removePlanMeal({
        userId: user.id,
        planEntryId: meal.id
      });

      if (!removed) {
        onRemoveError?.("No pudimos quitar la receta del plan.");
        return;
      }

      setIsRemoveDialogOpen(false);
      onMealRemoved?.(meal.mealType);
    } catch (error) {
      console.error("[plan-meal-card] Error quitando receta:", error);
      onRemoveError?.("Ocurrió un error al quitar la receta del plan.");
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
    onRemove: requestRemove
  };

  const confirmDialog = (
    <ConfirmDialog
      open={isRemoveDialogOpen}
      onOpenChange={setIsRemoveDialogOpen}
      title="¿Quitar esta receta del día?"
      description={`Se eliminará "${meal.title}" de tu plan de ${meal.mealType.toLowerCase()}.`}
      confirmLabel="Quitar receta"
      cancelLabel="Cancelar"
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
          aria-label={`Ver receta: ${meal.title}`}
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
        />

        <button
          type="button"
          onClick={requestRemove}
          disabled={removeDisabled}
          aria-label="Quitar receta del día"
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
          {meal.calories ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-white/80">
              <Clock3 className="h-3 w-3" />
              {meal.calories} min
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
