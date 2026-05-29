"use client";

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  shareOrDownloadRecipePng,
  type ShareableRecipe
} from "@/lib/share/recipe-share-image";

const CAPTURE_CLASS = "recipe-share-capturing";

type ShareResult = "shared" | "downloaded";

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function useShareRecipeImage() {
  const captureRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const shareRecipeImage = useCallback(
    async (recipe: ShareableRecipe): Promise<ShareResult | null> => {
      const node = captureRef.current;
      if (!node) {
        setErrorMessage("No se pudo preparar la receta para compartir.");
        return null;
      }

      setIsGenerating(true);
      setErrorMessage(null);

      node.classList.add(CAPTURE_CLASS);

      try {
        node.scrollIntoView({ block: "start", behavior: "auto" });
        await document.fonts.ready;
        await waitForNextPaint();

        const dataUrl = await toPng(node, {
          quality: 0.95,
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#FAFAFA",
          skipFonts: false
        });

        return await shareOrDownloadRecipePng(dataUrl, recipe.titulo);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return null;
        }
        console.error("[share-recipe] Error generando imagen:", error);
        setErrorMessage("No pudimos generar la imagen para compartir. Inténtalo de nuevo.");
        return null;
      } finally {
        node.classList.remove(CAPTURE_CLASS);
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    captureRef,
    shareRecipeImage,
    isGenerating,
    errorMessage,
    clearError: () => setErrorMessage(null)
  };
}
