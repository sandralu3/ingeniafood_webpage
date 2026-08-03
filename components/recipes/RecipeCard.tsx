"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Loader2, Play, Share2, Trash2 } from "lucide-react";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import {
  getRecipeImageFallback,
  pickStoredRecipeImageUrl
} from "@/lib/recipes/dish-image-fallback";
import { cn } from "@/lib/utils";

type RecipeCardProps = {
  title: string;
  categoryLabel?: string | null;
  savedAtLabel: string;
  detailHref: string;
  recipeId?: string;
  imageUrl?: string | null;
  referenceImageUrl?: string | null;
  instagramUrl?: string | null;
  isSocialVideo?: boolean;
  className?: string;
  onShare?: () => void;
  isSharing?: boolean;
  isShareDisabled?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isTogglingFavorite?: boolean;
  isFavoriteDisabled?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
  isDeleteDisabled?: boolean;
  favoriteAriaLabel?: string;
  deleteAriaLabel?: string;
  shareAriaLabel?: string;
  onPrefetch?: () => void;
};

const thumbnailClass =
  "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg";

function RecipeCardThumbnail({
  title,
  imageUrl,
  referenceImageUrl,
  isSocialVideo,
  allowStockFallback = true
}: {
  title: string;
  imageUrl?: string | null;
  referenceImageUrl?: string | null;
  isSocialVideo?: boolean;
  allowStockFallback?: boolean;
}) {
  const stored = pickStoredRecipeImageUrl({ imageUrl, referenceImageUrl, title });
  const resolvedUrl = stored || (allowStockFallback ? getRecipeImageFallback({ title, imageUrl, referenceImageUrl }) : null);
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const displayUrl = !failed
    ? resolvedUrl
    : allowStockFallback && !fallbackFailed
      ? getRecipeImageFallback({ title })
      : null;

  if (displayUrl) {
    return (
      <div className={cn(thumbnailClass, "border border-stone-200/40 bg-stone-100")}>
        <img
          src={displayUrl}
          alt={title ? `Imagen de ${title}` : ""}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => {
            if (!failed) {
              setFailed(true);
              return;
            }
            setFallbackFailed(true);
          }}
        />
      </div>
    );
  }

  if (isSocialVideo) {
    return (
      <div
        className={cn(
          thumbnailClass,
          "flex items-center justify-center border border-stone-200/40 bg-gradient-to-br from-stone-800 to-[#3d2e28]"
        )}
      >
        <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
          <Play className="ml-0.5 h-3 w-3 fill-white text-white" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        thumbnailClass,
        "border border-stone-200/40 bg-gradient-to-br from-[#F0F4ED] to-[#E8EFE3]"
      )}
      aria-hidden
    />
  );
}

function compactSavedDate(label: string): string {
  return label.replace(/^Guardado el\s+/i, "");
}

export function RecipeCard({
  title,
  categoryLabel,
  savedAtLabel,
  detailHref,
  recipeId,
  imageUrl,
  referenceImageUrl,
  instagramUrl,
  isSocialVideo = false,
  className,
  onShare,
  isSharing = false,
  isShareDisabled = false,
  isFavorite = false,
  onToggleFavorite,
  isTogglingFavorite = false,
  isFavoriteDisabled = false,
  onDelete,
  isDeleting = false,
  isDeleteDisabled = false,
  favoriteAriaLabel,
  deleteAriaLabel,
  shareAriaLabel,
  onPrefetch
}: RecipeCardProps) {
  return (
    <article
      className={cn(
        "mb-2 flex h-20 w-full items-center justify-between rounded-xl border border-stone-200/60 bg-white p-2.5 shadow-sm",
        className
      )}
    >
      <div className="relative shrink-0">
        <Link
          href={detailHref}
          onMouseEnter={onPrefetch}
          onFocus={onPrefetch}
          className="block"
          aria-label={`Ver ${title}`}
        >
          <RecipeCardThumbnail
            title={title}
            imageUrl={imageUrl}
            referenceImageUrl={referenceImageUrl}
            isSocialVideo={isSocialVideo}
          />
        </Link>
        {instagramUrl ? (
          <div className="absolute -right-0.5 -top-0.5 z-10 scale-90">
            <RecipeInstagramLink url={instagramUrl} variant="icon" />
          </div>
        ) : null}
      </div>

      <Link
        href={detailHref}
        onMouseEnter={onPrefetch}
        onFocus={onPrefetch}
        className="flex h-full min-w-0 flex-1 flex-col justify-center px-3"
      >
        <h3 className="mb-0.5 truncate text-xs font-bold text-stone-800">{title}</h3>

        {categoryLabel ? (
          <span className="w-fit rounded-md bg-[#F5EBE6] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#C06A4F]">
            {categoryLabel}
          </span>
        ) : null}
      </Link>

      <div className="flex h-full shrink-0 flex-col items-end justify-between">
        <span className="max-w-[5.5rem] truncate text-[10px] text-stone-400">
          {compactSavedDate(savedAtLabel)}
        </span>

        <div className="flex items-center gap-0.5">
          {onToggleFavorite ? (
            <button
              type="button"
              aria-label={
                favoriteAriaLabel ??
                (isFavorite ? "Quitar de favoritos" : "Añadir a favoritos")
              }
              aria-pressed={isFavorite}
              disabled={isFavoriteDisabled || isTogglingFavorite}
              onClick={onToggleFavorite}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full transition",
                isFavorite
                  ? "text-[#D07D62] hover:text-[#B8654D]"
                  : "text-stone-300 hover:text-[#D07D62]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D07D62]/30",
                "disabled:cursor-not-allowed disabled:opacity-40"
              )}
            >
              {isTogglingFavorite ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Heart
                  className={cn("h-3 w-3", isFavorite ? "fill-current" : "")}
                  strokeWidth={1.5}
                />
              )}
            </button>
          ) : null}

          {onShare ? (
            <button
              type="button"
              aria-label={shareAriaLabel ?? "Compartir receta como imagen"}
              disabled={isShareDisabled || isSharing}
              onClick={onShare}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-stone-400 transition hover:text-stone-600",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-300",
                "disabled:cursor-not-allowed disabled:opacity-40"
              )}
            >
              {isSharing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Share2 className="h-3 w-3" strokeWidth={1.5} />
              )}
            </button>
          ) : null}

          {onDelete ? (
            <button
              type="button"
              aria-label={deleteAriaLabel ?? "Eliminar receta"}
              disabled={isDeleteDisabled || isDeleting}
              onClick={onDelete}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-stone-400 transition hover:text-red-600",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-300",
                "disabled:cursor-not-allowed disabled:opacity-40"
              )}
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              )}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
