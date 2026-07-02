"use client";

import { useState } from "react";
import { Clock3, Loader2, RefreshCw } from "lucide-react";
import { RecipeMedia } from "@/components/recipes/recipe-media";
import { swapPlanMeal } from "@/lib/plan/plan-service";
import type { MealType } from "@/lib/plan/constants";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

export type PlanMeal = {
  id: string;
  recipeId: string;
  title: string;
  mealType: MealType;
  imageUrl?: string | null;
  isSocialVideo?: boolean;
  calories?: number;
};

type PlanMealCardProps = {
  meal: PlanMeal;
  onMealSwapped?: (updatedMeal: PlanMeal) => void;
  onSwapError?: (message: string) => void;
  variant?: "default" | "slot";
  className?: string;
};

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

export function PlanMealCard({
  meal,
  onMealSwapped,
  onSwapError,
  variant = "default",
  className
}: PlanMealCardProps) {
  const [isSwapping, setIsSwapping] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const isReelLayout = variant === "slot" || Boolean(meal.isSocialVideo || meal.imageUrl);
  const swapDisabled = isSwapping;

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

  if (isReelLayout) {
    return (
      <article
        className={cn(
          "group relative overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-xl shadow-stone-100/50 transition-all duration-300",
          variant === "slot" ? "h-36" : "h-44",
          isFading && "scale-[0.98] opacity-70",
          className
        )}
      >
        <RecipeMedia
          imageUrl={meal.imageUrl}
          isSocialVideo={meal.isSocialVideo}
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

        <div className="absolute inset-x-0 bottom-0 z-10 p-3 pt-10">
          {variant !== "slot" ? (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
              {meal.mealType}
            </p>
          ) : null}
          <h3
            className={cn(
              "line-clamp-2 font-bold leading-snug text-white drop-shadow-sm",
              variant === "slot" ? "text-sm" : "text-base"
            )}
          >
            {meal.title}
          </h3>
          {meal.calories ? (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-white/80">
              <Clock3 className="h-3 w-3" />
              {meal.calories} min
            </p>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "flex gap-3 overflow-hidden rounded-3xl border border-neutral-100 bg-white p-3 shadow-xl shadow-stone-100/50 transition-all duration-300",
        isFading && "scale-[0.98] opacity-70",
        className
      )}
    >
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl">
        <RecipeMedia
          imageUrl={meal.imageUrl}
          isSocialVideo={meal.isSocialVideo}
          variant="thumbnail"
          title={meal.title}
          className="!h-24 rounded-2xl"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#556B2F]/80">
            {meal.mealType}
          </p>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 transition-opacity duration-300">
            {meal.title}
          </h3>
        </div>

        <div className="flex items-center justify-between gap-2">
          {meal.calories ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
              <Clock3 className="h-3 w-3" />
              {meal.calories} min
            </span>
          ) : (
            <span />
          )}
          <SwapButton
            isSwapping={isSwapping}
            disabled={swapDisabled}
            onClick={() => void handleSwap()}
          />
        </div>
      </div>
    </article>
  );
}
