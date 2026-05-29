"use client";

import { forwardRef } from "react";
import { RecipeShareBranding } from "@/components/scanner/recipe-share-branding";
import { RecipeDetailMagazine } from "@/components/recipes/recipe-detail-magazine";
import { IngeniaFoodLogo } from "@/components/shared/ingenia-food-logo";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";

type Props = {
  recipe: ShareableRecipe;
  showScanBanner?: boolean;
};

export const RecipeShareCapture = forwardRef<HTMLDivElement, Props>(function RecipeShareCapture(
  { recipe, showScanBanner = false },
  ref
) {
  return (
    <div
      id="recipe-container"
      ref={ref}
      className="recipe-capture-root w-full max-w-md space-y-4 bg-[#FAFAFA]"
    >
      <header data-share-only className="border-b border-stone-200/60 px-0.5 pb-4 pt-1">
        <IngeniaFoodLogo variant="share" />
      </header>

      <RecipeDetailMagazine
        recipe={recipe}
        showScanBanner={showScanBanner}
        hideInlineTipOnShare
      />

      <RecipeShareBranding tipSandra={recipe.tip_sandra ?? ""} />
    </div>
  );
});
