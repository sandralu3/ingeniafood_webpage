"use client";

import { useState } from "react";
import { ArrowLeft, Bookmark, CalendarPlus, Loader2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AddToPlanSheet } from "@/components/scanner/add-to-plan-sheet";
import { RecipeOptionsSelector } from "@/components/scanner/recipe-options-selector";
import { RecipeResultHeroCard } from "@/components/scanner/recipe-result-hero-card";
import { RecipeAppliedFiltersBadges } from "@/components/recipes/recipe-applied-filters-badges";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { RecipeShareCapture } from "@/components/share/recipe-share-capture";
import { useShareRecipeImage } from "@/hooks/use-share-recipe-image";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";
import type { AppliedRecipeFilters } from "@/lib/recipes/premium-recipe-filters";
import type { RecipeOption } from "@/lib/recipes/recipe-options";
import { cn } from "@/lib/utils";

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
  hasGeneratedRealPhoto?: boolean;
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
  isGeneratingPhoto = false,
  hasGeneratedRealPhoto = false
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

  const actionsDisabled = isGenerating || isSavingFavorites || isGeneratingPhoto;
  const showOptions = recipeOptions.length > 1 && Boolean(onSelectRecipeIndex);

  const overlayBtnClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white shadow-sm backdrop-blur-sm ring-1 ring-white/25 transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50";

  const scannerHeroChrome = (
    <>
      {onNewSearch ? (
        <button
          type="button"
          onClick={onNewSearch}
          aria-label={t("newSearch")}
          className={overlayBtnClass}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsPlanModalOpen(true)}
          disabled={actionsDisabled}
          aria-label={t("cookOrSaveToPlan")}
          className={overlayBtnClass}
        >
          <CalendarPlus className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={handleShareImage}
          disabled={actionsDisabled}
          aria-label={t.has("shareRecipe") ? t("shareRecipe") : "Compartir"}
          className={overlayBtnClass}
        >
          {isGenerating || isGeneratingPhoto ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
        {onSaveFavorites ? (
          <button
            type="button"
            onClick={onSaveFavorites}
            disabled={actionsDisabled || isSavedFavorites}
            aria-label={isSavedFavorites ? t("saved") : t("saveToCookbook")}
            className={cn(
              overlayBtnClass,
              isSavedFavorites && "bg-[#556B2F]/85 ring-[#eef4e6]/40"
            )}
          >
            {isSavingFavorites || isGeneratingPhoto ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bookmark
                className={cn("h-4 w-4", isSavedFavorites ? "fill-current" : "")}
                strokeWidth={1.5}
              />
            )}
          </button>
        ) : null}
      </div>
    </>
  );

  return (
    <article className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden duration-500">
      <div className="min-h-0 flex-1 space-y-0 overflow-y-auto overscroll-y-contain px-0 pb-6 touch-pan-y [-webkit-overflow-scrolling:touch]">
        {showOptions ? (
          <div data-share-exclude className="mb-2 px-4 pt-1">
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
            isPremium={isPremium}
            hasGeneratedRealPhoto={hasGeneratedRealPhoto}
            onRequestPremium={() => setShowPremiumDialog(true)}
            layout="hero"
            heroChrome={scannerHeroChrome}
            headerBadges={
              showAppliedFilters && appliedFilters ? (
                <RecipeAppliedFiltersBadges
                  filters={appliedFilters}
                  omit={["mealType", "servings"]}
                />
              ) : null
            }
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
            className="mx-4 mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700"
          >
            {errorMessage}
          </p>
        ) : null}

        <div data-share-exclude className="space-y-2 px-4 pt-3">
          <button
            type="button"
            onClick={() => setIsPlanModalOpen(true)}
            disabled={actionsDisabled}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#556B2F] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#556B2F]/25 transition hover:bg-[#4a5f28] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingPhoto ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("generatingImage")}
              </>
            ) : (
              t("cookOrSaveToPlan")
            )}
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
