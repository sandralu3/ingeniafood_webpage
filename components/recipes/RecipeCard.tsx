"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Clock3,
  Flame,
  Heart,
  Loader2,
  Pencil,
  Play,
  ScanLine,
  Share2,
  Trash2,
  UtensilsCrossed
} from "lucide-react";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import { SandraRecipeBadge } from "@/components/recipes/sandra-recipe-badge";
import type { ExternalMealBadge } from "@/lib/plan/external-meal";
import {
  getRecipeImageFallback,
  pickStoredRecipeImageUrl
} from "@/lib/recipes/dish-image-fallback";
import type { RecipeMacros } from "@/lib/recipes/recipe-macros";
import { cn } from "@/lib/utils";

type RecipeCardProps = {
  title: string;
  categoryLabel?: string | null;
  originBadge?: ExternalMealBadge | null;
  originBadgeLabel?: string | null;
  savedAtLabel: string;
  detailHref: string;
  recipeId?: string;
  imageUrl?: string | null;
  referenceImageUrl?: string | null;
  instagramUrl?: string | null;
  isSocialVideo?: boolean;
  isSandraRecipe?: boolean;
  cookingTimeMinutes?: number | null;
  macros?: RecipeMacros | null;
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
  editAriaLabel?: string;
  onPrefetch?: () => void;
};

const thumbnailClass =
  "relative h-full min-h-[5.5rem] w-[5.25rem] shrink-0 overflow-hidden rounded-l-2xl sm:w-28 sm:rounded-l-3xl";

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
  const resolvedUrl =
    stored || (allowStockFallback ? getRecipeImageFallback({ title, imageUrl, referenceImageUrl }) : null);
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const displayUrl = !failed
    ? resolvedUrl
    : allowStockFallback && !fallbackFailed
      ? getRecipeImageFallback({ title })
      : null;

  if (displayUrl) {
    return (
      <div className={cn(thumbnailClass, "bg-stone-100")}>
        <img
          src={displayUrl}
          alt={title ? `Imagen de ${title}` : ""}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={() => {
            if (!failed) {
              setFailed(true);
              return;
            }
            setFallbackFailed(true);
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-black/[0.03]"
          aria-hidden
        />
      </div>
    );
  }

  if (isSocialVideo) {
    return (
      <div
        className={cn(
          thumbnailClass,
          "flex items-center justify-center bg-gradient-to-br from-stone-800 to-[#3d2e28]"
        )}
      >
        <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
          <Play className="ml-0.5 h-3.5 w-3.5 fill-white text-white" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        thumbnailClass,
        "bg-gradient-to-br from-[#F0F4ED] to-[#E8EFE3]"
      )}
      aria-hidden
    />
  );
}

const MONTH_SHORT: Record<string, string> = {
  enero: "ene",
  febrero: "feb",
  marzo: "mar",
  abril: "abr",
  mayo: "may",
  junio: "jun",
  julio: "jul",
  agosto: "ago",
  septiembre: "sep",
  octubre: "oct",
  noviembre: "nov",
  diciembre: "dic",
  january: "Jan",
  february: "Feb",
  march: "Mar",
  april: "Apr",
  may: "May",
  june: "Jun",
  july: "Jul",
  august: "Aug",
  september: "Sep",
  october: "Oct",
  november: "Nov",
  december: "Dec"
};

function compactSavedDate(label: string): string {
  let text = label
    .replace(/^Guardado el\s+/i, "")
    .replace(/^Saved on\s+/i, "")
    .replace(/^Guardada em\s+/i, "")
    .replace(/^Gespeichert am\s+/i, "")
    .replace(/^Enregistrée le\s+/i, "")
    .trim();

  text = text.replace(/\s+de\s+/gi, " ");
  text = text.replace(
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
    (month) => MONTH_SHORT[month.toLowerCase()] ?? month
  );

  return text;
}

function OriginBadge({
  badge,
  label
}: {
  badge: ExternalMealBadge;
  label: string;
}) {
  if (badge === "escaneado") {
    return (
      <span className="inline-flex w-fit max-w-full items-center gap-0.5 truncate rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-100/80">
        <ScanLine className="h-2.5 w-2.5 shrink-0" strokeWidth={2.25} aria-hidden />
        <span className="truncate">{label.replace(/^📸\s*/, "")}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit max-w-full items-center gap-0.5 truncate rounded-md bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-800 ring-1 ring-orange-100/80">
      <UtensilsCrossed className="h-2.5 w-2.5 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="truncate">{label.replace(/^📍\s*/, "")}</span>
    </span>
  );
}

function NutritionMeta({
  cookingTimeMinutes,
  macros
}: {
  cookingTimeMinutes?: number | null;
  macros?: RecipeMacros | null;
}) {
  const hasTime = typeof cookingTimeMinutes === "number" && cookingTimeMinutes > 0;
  if (!hasTime && !macros) return null;

  return (
    <div className="space-y-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] tabular-nums text-stone-500">
        {macros?.calorias ? (
          <span className="inline-flex items-center gap-0.5 font-semibold text-stone-600">
            <Flame className="h-2.5 w-2.5 text-amber-500" strokeWidth={2.25} aria-hidden />
            {macros.calorias} kcal
          </span>
        ) : null}
        {hasTime ? (
          <span className="inline-flex items-center gap-0.5 font-medium">
            <Clock3 className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
            {cookingTimeMinutes} min
          </span>
        ) : null}
      </div>
      {macros ? (
        <p className="truncate text-[9px] font-semibold tabular-nums tracking-wide text-stone-500">
          <span className="text-emerald-700/80">{macros.proteinas_g}g P</span>
          <span className="mx-1 text-stone-300">·</span>
          <span className="text-amber-800/80">{macros.carbohidratos_g}g C</span>
          <span className="mx-1 text-stone-300">·</span>
          <span className="text-rose-700/80">{macros.grasas_g}g G</span>
        </p>
      ) : null}
    </div>
  );
}

const actionBtnClass =
  "inline-flex h-6 w-6 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-40";

export function RecipeCard({
  title,
  categoryLabel,
  originBadge = null,
  originBadgeLabel = null,
  savedAtLabel,
  detailHref,
  imageUrl,
  referenceImageUrl,
  instagramUrl,
  isSocialVideo = false,
  isSandraRecipe = false,
  cookingTimeMinutes,
  macros,
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
  editAriaLabel,
  onPrefetch
}: RecipeCardProps) {
  const dateLabel = compactSavedDate(savedAtLabel);

  return (
    <article
      className={cn(
        "mb-2.5 flex w-full overflow-hidden rounded-2xl border border-stone-100/90 bg-white shadow-sm shadow-stone-200/30 sm:rounded-3xl",
        className
      )}
    >
      <div className="relative shrink-0 self-stretch">
        <Link
          href={detailHref}
          onMouseEnter={onPrefetch}
          onFocus={onPrefetch}
          className="block h-full"
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
          <div className="absolute right-1 top-1 z-10 scale-90">
            <RecipeInstagramLink url={instagramUrl} variant="icon" />
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 py-2.5 pl-2.5 pr-2.5 sm:gap-2 sm:py-3 sm:pl-3 sm:pr-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={detailHref}
            onMouseEnter={onPrefetch}
            onFocus={onPrefetch}
            className="block min-w-0"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="min-w-0 flex-1 truncate text-[13px] font-bold leading-tight text-stone-800">
                {title}
              </h3>
              <span className="shrink-0 text-[9px] font-medium tabular-nums text-stone-400">
                {dateLabel}
              </span>
            </div>
          </Link>

          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {isSandraRecipe ? <SandraRecipeBadge compact /> : null}
            {originBadge && originBadgeLabel ? (
              <OriginBadge badge={originBadge} label={originBadgeLabel} />
            ) : categoryLabel ? (
              <span className="w-fit max-w-full truncate rounded-md bg-[#F5EBE6] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#C06A4F]">
                {categoryLabel}
              </span>
            ) : null}
          </div>

          <NutritionMeta cookingTimeMinutes={cookingTimeMinutes} macros={macros} />
        </div>

        <div className="-mr-0.5 flex items-center justify-end gap-px">
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
                actionBtnClass,
                isFavorite
                  ? "text-[#D07D62] hover:bg-rose-50 hover:text-[#B8654D]"
                  : "text-stone-300 hover:bg-stone-50 hover:text-[#D07D62]",
                "focus-visible:ring-[#D07D62]/30"
              )}
            >
              {isTogglingFavorite ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Heart
                  className={cn("h-3 w-3", isFavorite ? "fill-current" : "")}
                  strokeWidth={1.75}
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
                actionBtnClass,
                "text-stone-400 hover:bg-stone-50 hover:text-stone-600",
                "focus-visible:ring-stone-300"
              )}
            >
              {isSharing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Share2 className="h-3 w-3" strokeWidth={1.75} />
              )}
            </button>
          ) : null}

          <Link
            href={detailHref}
            onMouseEnter={onPrefetch}
            onFocus={onPrefetch}
            aria-label={editAriaLabel ?? "Editar o ver receta"}
            className={cn(
              actionBtnClass,
              "text-stone-400 hover:bg-stone-50 hover:text-stone-600",
              "focus-visible:ring-stone-300"
            )}
          >
            <Pencil className="h-3 w-3" strokeWidth={1.75} />
          </Link>

          {onDelete ? (
            <button
              type="button"
              aria-label={deleteAriaLabel ?? "Eliminar receta"}
              disabled={isDeleteDisabled || isDeleting}
              onClick={onDelete}
              className={cn(
                actionBtnClass,
                "text-stone-400 hover:bg-rose-50 hover:text-red-600",
                "focus-visible:ring-red-300"
              )}
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" strokeWidth={1.75} />
              )}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
