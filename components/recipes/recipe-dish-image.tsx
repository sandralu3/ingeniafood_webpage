"use client";

import { useState } from "react";
import { ImageOff, Lock, Sparkles } from "lucide-react";
import { PremiumRichText } from "@/components/premium/premium-label";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";

type Props = {
  imageUrl?: string | null;
  referenceImageUrl?: string | null;
  recipeTitle?: string;
  className?: string;
  /** Recetas guardadas: muestra la foto almacenada sin bloqueo Premium. */
  displayMode?: "live" | "library";
};

export function RecipeDishImage({
  imageUrl,
  referenceImageUrl,
  recipeTitle,
  className,
  displayMode = "live"
}: Props) {
  const { isPaidPremium, isLoading } = usePremium();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [realImageFailed, setRealImageFailed] = useState(false);
  const [referenceImageFailed, setReferenceImageFailed] = useState(false);

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
              alt={recipeTitle ? `Foto del plato: ${recipeTitle}` : "Foto del plato"}
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
              onError={() => setRealImageFailed(true)}
            />
          </div>
          <p className="text-center text-[10px] font-medium text-stone-500">
            Foto guardada de esta receta
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
          <p className="text-[10px] font-medium text-stone-500">
            No pudimos cargar la imagen guardada.
          </p>
        </div>
      );
    }
    return null;
  }

  const effectiveReferenceUrl =
    referenceImageUrl ?? (!isPaidPremium && imageUrl ? imageUrl : null);
  const effectiveRealUrl = isPaidPremium ? imageUrl : null;

  const showRealImage = Boolean(isPaidPremium && effectiveRealUrl && !realImageFailed);
  const showReferenceImage = Boolean(
    effectiveReferenceUrl &&
      !referenceImageFailed &&
      (!showRealImage || effectiveReferenceUrl !== effectiveRealUrl)
  );
  const showReferenceOnly = showReferenceImage && !showRealImage;

  if (showRealImage) {
    return (
      <div className={cn("mx-auto w-full max-w-xs space-y-1.5", className)}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100 shadow-sm shadow-stone-200/40">
          <img
            src={effectiveRealUrl!}
            alt={recipeTitle ? `Foto del plato: ${recipeTitle}` : "Foto del plato"}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            onError={() => setRealImageFailed(true)}
          />
        </div>
        <p className="text-center text-[10px] font-medium text-stone-500">
          Foto de tu plato generada para esta receta
        </p>
      </div>
    );
  }

  if (showReferenceOnly) {
    return (
      <>
        <div
          className={cn("mx-auto w-full max-w-[13rem] space-y-2", className)}
          data-share-exclude
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-stone-200/80 bg-stone-100">
            <img
              src={effectiveReferenceUrl!}
              alt={recipeTitle ? `Imagen de referencia: ${recipeTitle}` : "Imagen de referencia"}
              className="h-full w-full object-cover opacity-90"
              loading="lazy"
              decoding="async"
              onError={() => setReferenceImageFailed(true)}
            />
          </div>

          <p className="text-center text-[10px] leading-snug text-stone-500">
            Imagen de referencia. No corresponde específicamente a esta receta.
          </p>

          {!isPaidPremium ? (
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-3 py-2.5 text-center">
              <p className="text-[10px] font-semibold leading-snug text-stone-700">
                <PremiumRichText
                  text="¿Quieres ver la foto real de tu plato? Activa Premium"
                  size="2xs"
                />
              </p>
              <button
                type="button"
                onClick={() => setShowUpgradeDialog(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#C9A227] px-3.5 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                <Sparkles className="h-3 w-3" strokeWidth={2} aria-hidden />
                Ver foto real del plato
              </button>
            </div>
          ) : null}
        </div>

        <PremiumUpgradeDialog
          open={showUpgradeDialog}
          onClose={() => setShowUpgradeDialog(false)}
          featureLabel="Foto real del plato"
        />
      </>
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
        <p className="text-[10px] font-medium text-stone-500">
          No pudimos cargar la imagen. Genera la receta de nuevo.
        </p>
      </div>
    );
  }

  if (isPaidPremium) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "mx-auto flex aspect-[4/3] w-full max-w-xs flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-stone-200/70 bg-stone-50 px-4 text-center shadow-sm",
          className
        )}
        data-share-exclude
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
          <Lock className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        <p className="text-[10px] font-semibold leading-snug text-stone-700">
          <PremiumRichText
            text="La foto real de tu plato es una función Premium"
            size="2xs"
          />
        </p>
        <button
          type="button"
          onClick={() => setShowUpgradeDialog(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#C9A227] px-3.5 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          <Sparkles className="h-3 w-3" strokeWidth={2} aria-hidden />
          Ver foto real del plato
        </button>
      </div>

      <PremiumUpgradeDialog
        open={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        featureLabel="Foto real del plato"
      />
    </>
  );
}
