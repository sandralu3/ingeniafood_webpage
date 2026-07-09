"use client";

import { useState } from "react";
import {
  Bookmark,
  Calendar,
  Loader2,
  Share2
} from "lucide-react";
import { AddToPlanSheet } from "@/components/scanner/add-to-plan-sheet";
import { RecipeShareCapture } from "@/components/share/recipe-share-capture";
import { useShareRecipeImage } from "@/hooks/use-share-recipe-image";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";

type Props = {
  recipe: ShareableRecipe;
  /** Banner cuando la receta se generó con foto de despensa */
  showPhotoBanner?: boolean;
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
  isSavedFavorites = false
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
    <article className="bg-[#FAFAFA] pb-28 pt-1 duration-500 has-[.recipe-share-capturing]:pb-4">
      {onNewSearch ? (
        <div className="mb-2 px-1" data-share-exclude>
          <button
            type="button"
            onClick={onNewSearch}
            className="text-sm font-semibold text-sv-primary underline decoration-sv-primary/40 underline-offset-4 transition hover:opacity-80"
          >
            ← Nueva búsqueda
          </button>
        </div>
      ) : null}

      <RecipeShareCapture ref={captureRef} recipe={recipe} showScanBanner />

      <div className="mt-4 space-y-3 px-0" data-share-exclude>
        <button
          type="button"
          onClick={() => setIsPlanModalOpen(true)}
          disabled={actionsDisabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E9F0E6] px-4 py-3 font-semibold text-[#4C6B3F] transition-all hover:bg-[#DEE8DA] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Calendar size={16} />
          Añadir al plan semanal
        </button>

        <button
          type="button"
          onClick={handleShareImage}
          disabled={isGenerating}
          className="group flex w-full items-center justify-center gap-2 rounded-full border border-[#4c6633]/20 bg-white px-5 py-3.5 text-sm font-semibold text-[#4c6633] shadow-sm transition hover:bg-[#4c6633]/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {isGenerating ? "Generando imagen..." : "Compartir Receta (Imagen)"}
        </button>
        {errorMessage ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSaveFavorites}
          disabled={actionsDisabled || isSavedFavorites}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#4c6633] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4c6633]/20 transition hover:bg-[#556B2F] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Bookmark className="h-4 w-4 fill-current" />
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
