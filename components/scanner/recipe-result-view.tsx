"use client";

import { useState } from "react";
import { ArrowLeft, Bookmark, Calendar, Loader2, Share2 } from "lucide-react";
import { AddToPlanSheet } from "@/components/scanner/add-to-plan-sheet";
import { RecipeShareCapture } from "@/components/share/recipe-share-capture";
import { useShareRecipeImage } from "@/hooks/use-share-recipe-image";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";
import type { AppliedRecipeFilters } from "@/lib/recipes/premium-recipe-filters";

type Props = {
  recipe: ShareableRecipe;
  /** Banner cuando la receta se generó con foto de despensa */
  showPhotoBanner?: boolean;
  appliedFilters?: AppliedRecipeFilters | null;
  showAppliedFilters?: boolean;
  mealTypeAdvisory?: string | null;
  onSaveFavorites?: () => void;
  onNewSearch?: () => void;
  onPersistRecipeId: () => Promise<string | null>;
  onPlanAssigned?: (message: string) => void;
  isSavingFavorites?: boolean;
  isSavedFavorites?: boolean;
};

export function RecipeResultView({
  recipe,
  onSaveFavorites,
  onNewSearch,
  onPersistRecipeId,
  onPlanAssigned,
  isSavingFavorites = false,
  isSavedFavorites = false,
  appliedFilters = null,
  showAppliedFilters = false,
  mealTypeAdvisory = null
}: Props) {
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const { captureRef, shareRecipeImage, isGenerating, errorMessage, clearError } =
    useShareRecipeImage();

  const handleShareImage = () => {
    clearError();
    void shareRecipeImage(recipe, { useExistingCapture: true });
  };

  const actionsDisabled = isGenerating || isSavingFavorites;

  return (
    <article className="space-y-3 pb-24 duration-500 has-[.recipe-share-capturing]:pb-4">
      {onNewSearch ? (
        <div data-share-exclude>
          <button
            type="button"
            onClick={onNewSearch}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#556B2F] transition hover:text-[#3e5219]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Nueva búsqueda
          </button>
        </div>
      ) : null}

      <RecipeShareCapture
        ref={captureRef}
        recipe={recipe}
        showScanBanner
        appliedFilters={appliedFilters}
        showAppliedFilters={showAppliedFilters}
        mealTypeAdvisory={mealTypeAdvisory}
      />

      <div className="space-y-2" data-share-exclude>
        <button
          type="button"
          onClick={() => setIsPlanModalOpen(true)}
          disabled={actionsDisabled}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-stone-200/60 bg-[#F0F4ED] px-4 py-2.5 text-sm font-semibold text-[#3e5219] transition hover:bg-[#E9F0E6] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Calendar className="h-4 w-4" strokeWidth={2} />
          Añadir al plan semanal
        </button>

        <button
          type="button"
          onClick={handleShareImage}
          disabled={isGenerating}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-stone-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-[#556B2F] shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" strokeWidth={2} />
          )}
          {isGenerating ? "Generando imagen..." : "Compartir receta"}
        </button>

        {errorMessage ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onSaveFavorites}
          disabled={actionsDisabled || isSavedFavorites}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a5f28] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Bookmark className="h-4 w-4" strokeWidth={2} />
          {isSavedFavorites
            ? "Guardado"
            : isSavingFavorites
              ? "Guardando..."
              : "Guardar en mi recetario"}
        </button>
      </div>

      <AddToPlanSheet
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        persistRecipeId={onPersistRecipeId}
        onSuccess={onPlanAssigned}
      />
    </article>
  );
}
