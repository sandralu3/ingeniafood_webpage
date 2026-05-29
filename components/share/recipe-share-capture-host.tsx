"use client";

import type { Ref } from "react";
import { RecipeShareCapture } from "@/components/share/recipe-share-capture";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";

type Props = {
  captureRef: Ref<HTMLDivElement>;
  recipe: ShareableRecipe | null;
  /** offscreen = clon fuera de pantalla para compartir desde listas */
  mode?: "inline" | "offscreen";
  showScanBanner?: boolean;
};

export function RecipeShareCaptureHost({
  captureRef,
  recipe,
  mode = "offscreen",
  showScanBanner = false
}: Props) {
  if (!recipe) return null;

  if (mode === "offscreen") {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed left-[-12000px] top-0 z-[-1] w-full max-w-md opacity-0"
      >
        <RecipeShareCapture ref={captureRef} recipe={recipe} showScanBanner={showScanBanner} />
      </div>
    );
  }

  return (
    <RecipeShareCapture ref={captureRef} recipe={recipe} showScanBanner={showScanBanner} />
  );
}
