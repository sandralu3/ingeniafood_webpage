"use client";

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  SHARE_CARD_HEIGHT_PX,
  SHARE_CARD_WIDTH_PX
} from "@/components/scanner/recipe-share-card";
import {
  shareOrDownloadRecipePng,
  type ShareableRecipe
} from "@/lib/share/recipe-share-image";

type ShareResult = "shared" | "downloaded";

export function useShareRecipeImage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const shareRecipeImage = useCallback(async (recipe: ShareableRecipe): Promise<ShareResult | null> => {
    const node = cardRef.current;
    if (!node) {
      setErrorMessage("No se pudo preparar la tarjeta para compartir.");
      return null;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const dataUrl = await toPng(node, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#fdfcfb",
        width: SHARE_CARD_WIDTH_PX,
        height: SHARE_CARD_HEIGHT_PX,
        canvasWidth: SHARE_CARD_WIDTH_PX * 2,
        canvasHeight: SHARE_CARD_HEIGHT_PX * 2,
        skipFonts: false,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          width: `${SHARE_CARD_WIDTH_PX}px`,
          height: `${SHARE_CARD_HEIGHT_PX}px`
        }
      });

      const result = await shareOrDownloadRecipePng(dataUrl, recipe.titulo);
      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }
      console.error("[share-recipe] Error generando imagen:", error);
      setErrorMessage("No pudimos generar la imagen para compartir. Inténtalo de nuevo.");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    cardRef,
    shareRecipeImage,
    isGenerating,
    errorMessage,
    clearError: () => setErrorMessage(null)
  };
}
