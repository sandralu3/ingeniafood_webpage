"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecipeImageLoader } from "@/components/recipes/RecipeImageLoader";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";

type Props = {
  imageUrl?: string | null;
  referenceImageUrl?: string | null;
  recipeTitle?: string;
  className?: string;
  /** Recetas guardadas: muestra la foto almacenada sin bloqueo Premium. */
  displayMode?: "live" | "library";
  /** Foto Premium en generación asíncrona (~15–20s). */
  isGeneratingPhoto?: boolean;
};

export function RecipeDishImage({
  imageUrl,
  referenceImageUrl,
  recipeTitle,
  className,
  displayMode = "live",
  isGeneratingPhoto = false
}: Props) {
  const t = useTranslations("RecipeDetail");
  const { isPaidPremium, isLoading } = usePremium();
  const [realImageFailed, setRealImageFailed] = useState(false);
  const [referenceImageFailed, setReferenceImageFailed] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);

  useEffect(() => {
    setRealImageFailed(false);
    setImageVisible(false);
  }, [imageUrl]);

  if (isLoading) {
    return null;
  }

  if (displayMode === "library") {
    const libraryUrl = imageUrl ?? referenceImageUrl;
    if (libraryUrl && !realImageFailed) {
      return (
        <div className={cn("mx-auto w-full max-w-xs space-y-1.5", className)}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100 shadow-sm shadow-stone-200/40">
            <img
              src={libraryUrl}
              alt={
                recipeTitle
                  ? t("dishPhotoAlt", { title: recipeTitle })
                  : t("dishPhotoAltFallback")
              }
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
              onError={() => setRealImageFailed(true)}
            />
          </div>
          <p className="text-center text-[10px] font-medium text-stone-500">
            {t("savedPhotoCaption")}
          </p>
        </div>
      );
    }
    if (libraryUrl && realImageFailed) {
      return (
        <div
          className={cn(
            "mx-auto flex aspect-[4/3] w-full max-w-xs flex-col items-center justify-center gap-2 rounded-xl border border-stone-200/70 bg-stone-50 px-4 text-center",
            className
          )}
        >
          <ImageOff className="h-7 w-7 text-stone-400" aria-hidden />
          <p className="text-[10px] font-medium text-stone-500">{t("savedPhotoLoadError")}</p>
        </div>
      );
    }
    return null;
  }

  // Fotos (OpenAI o banco) solo para Premium de pago. Free/trial: ninguna imagen.
  if (!isPaidPremium) {
    return null;
  }

  const effectiveReferenceUrl = referenceImageUrl ?? null;
  const effectiveRealUrl = imageUrl ?? null;

  const showRealImage = Boolean(effectiveRealUrl && !realImageFailed);
  const showGeneratingSkeleton = Boolean(isGeneratingPhoto && !showRealImage);
  const showReferenceImage = Boolean(
    effectiveReferenceUrl &&
      !referenceImageFailed &&
      !showGeneratingSkeleton &&
      (!showRealImage || effectiveReferenceUrl !== effectiveRealUrl)
  );
  const showReferenceOnly = showReferenceImage && !showRealImage;

  if (showGeneratingSkeleton) {
    return <RecipeImageLoader className={className} />;
  }

  if (showRealImage) {
    return (
      <div className={cn("mx-auto w-full max-w-xs space-y-1.5", className)}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100 shadow-sm shadow-stone-200/40">
          <img
            src={effectiveRealUrl!}
            alt={
              recipeTitle
                ? t("dishPhotoAlt", { title: recipeTitle })
                : t("dishPhotoAltFallback")
            }
            className={cn(
              "h-full w-full object-cover transition-opacity duration-700 ease-out",
              imageVisible ? "opacity-100" : "opacity-0"
            )}
            loading="eager"
            decoding="async"
            onLoad={() => setImageVisible(true)}
            onError={() => setRealImageFailed(true)}
          />
        </div>
        <p className="text-center text-[10px] font-medium text-stone-500">
          {t("generatedPhotoCaption")}
        </p>
      </div>
    );
  }

  if (showReferenceOnly) {
    return (
      <div className={cn("mx-auto w-full max-w-[13rem] space-y-2", className)}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-stone-200/80 bg-stone-100">
          <img
            src={effectiveReferenceUrl!}
            alt={
              recipeTitle
                ? t("referenceImageAlt", { title: recipeTitle })
                : t("referenceImageAltFallback")
            }
            className="h-full w-full object-cover opacity-90"
            loading="lazy"
            decoding="async"
            onError={() => setReferenceImageFailed(true)}
          />
        </div>
        <p className="text-center text-[10px] leading-snug text-stone-500">
          {t("referenceImageNote")}
        </p>
      </div>
    );
  }

  if ((effectiveRealUrl && realImageFailed) || (effectiveReferenceUrl && referenceImageFailed)) {
    return (
      <div
        className={cn(
          "mx-auto flex aspect-[4/3] w-full max-w-xs flex-col items-center justify-center gap-2 rounded-xl border border-stone-200/70 bg-stone-50 px-4 text-center",
          className
        )}
      >
        <ImageOff className="h-7 w-7 text-stone-400" aria-hidden />
        <p className="text-[10px] font-medium text-stone-500">{t("imageLoadError")}</p>
      </div>
    );
  }

  return null;
}
