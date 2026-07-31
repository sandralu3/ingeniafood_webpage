"use client";

import { useState } from "react";
import { ArrowLeft, Bookmark, Loader2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AddToPlanSheet } from "@/components/scanner/add-to-plan-sheet";
import { RecipeOptionsSelector } from "@/components/scanner/recipe-options-selector";
import { RecipeResultHeroCard } from "@/components/scanner/recipe-result-hero-card";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { RecipeShareCapture } from "@/components/share/recipe-share-capture";
import { useShareRecipeImage } from "@/hooks/use-share-recipe-image";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";
import type { AppliedRecipeFilters } from "@/lib/recipes/premium-recipe-filters";
import type { RecipeOption } from "@/lib/recipes/recipe-options";

type Props = {
  recipe: ShareableRecipe;
  recipeOptions?: RecipeOption[];
  selectedRecipeIndex?: number;
  onSelectRecipeIndex?: (index: number) => void;
  isPremium?: boolean;
  pantryIngredients?: string[];
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
  isGeneratingPhoto?: boolean;
};

export function RecipeResultView({
  recipe,
  recipeOptions = [],
  selectedRecipeIndex = 0,
  onSelectRecipeIndex,
  isPremium = true,
  pantryIngredients = [],
  onSaveFavorites,
  onNewSearch,
  onPersistRecipeId,
  onPlanAssigned,
  isSavingFavorites = false,
  isSavedFavorites = false,
  appliedFilters = null,
  showAppliedFilters = false,
  mealTypeAdvisory = null,
  isGeneratingPhoto = false
}: Props) {
  const t = useTranslations("Scanner");
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const { captureRef, shareRecipeImage, isGenerating, errorMessage, clearError } =
    useShareRecipeImage();

  const handleShareImage = () => {
    clearError();
    void shareRecipeImage(recipe, { useExistingCapture: true });
  };

  const actionsDisabled = isGenerating || isSavingFavorites;
  const showOptions = recipeOptions.length > 1 && Boolean(onSelectRecipeIndex);

  return (
    <article className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden duration-500">
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-y-contain px-0 pb-6 touch-pan-y [-webkit-overflow-scrolling:touch]">
        {onNewSearch ? (
          <div data-share-exclude className="px-4">
            <button
              type="button"
              onClick={onNewSearch}
              className="inline-flex items-center gap-1 text-[11px] font-semibold leading-none text-[#556B2F] transition hover:text-[#3e5219]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
              {t("newSearch")}
            </button>
          </div>
        ) : null}

        {showOptions ? (
          <div data-share-exclude className="mb-1 px-4">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              {t.has("aiSuggestions")
                ? t("aiSuggestions")
                : "Sugerencias de la IA"}
            </p>
            <RecipeOptionsSelector
              options={recipeOptions}
              selectedIndex={selectedRecipeIndex}
              isPremium={isPremium}
              onSelect={onSelectRecipeIndex!}
              onLockedSelect={() => setShowPremiumDialog(true)}
            />
          </div>
        ) : null}

        <div data-share-exclude>
          <RecipeResultHeroCard
            recipe={recipe}
            pantryIngredients={pantryIngredients}
            mealTypeAdvisory={mealTypeAdvisory}
            isGeneratingPhoto={isGeneratingPhoto}
            appliedFilters={appliedFilters}
          />
        </div>

        {/* Captura fuera de viewport para compartir (mantiene tamaño real para html-to-image) */}
        <div
          className="pointer-events-none fixed left-[-100vw] top-0 z-[-1] w-[360px]"
          aria-hidden
        >
          <RecipeShareCapture
            ref={captureRef}
            recipe={recipe}
            showScanBanner
            appliedFilters={appliedFilters}
            showAppliedFilters={showAppliedFilters}
            mealTypeAdvisory={mealTypeAdvisory}
            isGeneratingPhoto={isGeneratingPhoto}
          />
        </div>

        {errorMessage ? (
          <p
            data-share-exclude
            className="mx-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700"
          >
            {errorMessage}
          </p>
        ) : null}

        <div data-share-exclude className="space-y-2 px-4 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareImage}
              disabled={isGenerating}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-200/70 bg-white px-3 py-2 text-[12px] font-semibold text-[#556B2F] transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {isGenerating
                ? t("generatingImage")
                : t.has("shareRecipe")
                  ? t("shareRecipe")
                  : "Compartir"}
            </button>

            <button
              type="button"
              onClick={onSaveFavorites}
              disabled={actionsDisabled || isSavedFavorites}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-200/70 bg-[#F0F4ED] px-3 py-2 text-[12px] font-semibold text-[#3e5219] transition hover:bg-[#E9F0E6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Bookmark className="h-3.5 w-3.5" strokeWidth={2} />
              {isSavedFavorites
                ? t("saved")
                : isSavingFavorites
                  ? t("saving")
                  : t("saveToCookbook")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPlanModalOpen(true)}
            disabled={actionsDisabled}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#556B2F] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#556B2F]/25 transition hover:bg-[#4a5f28] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("cookOrSaveToPlan")}
          </button>
        </div>
      </div>

      <AddToPlanSheet
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        persistRecipeId={onPersistRecipeId}
        onSuccess={onPlanAssigned}
      />

      <PremiumUpgradeDialog
        open={showPremiumDialog}
        onClose={() => setShowPremiumDialog(false)}
        featureLabel={t("recipeOptionsPremiumFeature")}
      />
    </article>
  );
}
