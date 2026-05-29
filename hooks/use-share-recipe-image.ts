"use client";

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toPng } from "html-to-image";
import {
  shareOrDownloadRecipePng,
  type ShareableRecipe
} from "@/lib/share/recipe-share-image";

const CAPTURE_CLASS = "recipe-share-capturing";

type ShareResult = "shared" | "downloaded";

type ShareOptions = {
  recipeId?: string;
  /** true cuando el nodo de captura ya está montado en pantalla (vista de escáner) */
  useExistingCapture?: boolean;
};

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function useShareRecipeImage() {
  const captureRef = useRef<HTMLDivElement>(null);
  const [captureRecipe, setCaptureRecipe] = useState<ShareableRecipe | null>(null);
  const [sharingRecipeId, setSharingRecipeId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const shareRecipeImage = useCallback(
    async (recipe: ShareableRecipe, options?: ShareOptions): Promise<ShareResult | null> => {
      setErrorMessage(null);
      setSharingRecipeId(options?.recipeId ?? (options?.useExistingCapture ? "active" : null));
      setIsGenerating(true);

      const useExistingCapture = options?.useExistingCapture === true;

      if (!useExistingCapture) {
        flushSync(() => {
          setCaptureRecipe(recipe);
        });
        await waitForNextPaint();
      }

      const node = captureRef.current;
      if (!node) {
        setErrorMessage("No se pudo preparar la receta para compartir.");
        setSharingRecipeId(null);
        if (!useExistingCapture) setCaptureRecipe(null);
        setIsGenerating(false);
        return null;
      }

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
        setSharingRecipeId(null);
        if (!useExistingCapture) setCaptureRecipe(null);
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    captureRef,
    captureRecipe,
    shareRecipeImage,
    sharingRecipeId,
    isGenerating,
    errorMessage,
    clearError: () => setErrorMessage(null)
  };
}
