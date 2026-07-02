import Link from "next/link";
import { ArrowRight, Heart, Loader2, Share2 } from "lucide-react";
import { RecipeMedia } from "@/components/recipes/recipe-media";
import { cn } from "@/lib/utils";

type RecipeCardProps = {
  title: string;
  categories: string[];
  savedAtLabel: string;
  detailHref: string;
  imageUrl?: string | null;
  isSocialVideo?: boolean;
  className?: string;
  onShare?: () => void;
  isSharing?: boolean;
  isShareDisabled?: boolean;
  onRemove?: () => void;
  isRemoving?: boolean;
  isRemoveDisabled?: boolean;
  onPrefetch?: () => void;
};

export function RecipeCard({
  title,
  categories,
  savedAtLabel,
  detailHref,
  imageUrl,
  isSocialVideo = false,
  className,
  onShare,
  isSharing = false,
  isShareDisabled = false,
  onRemove,
  isRemoving = false,
  isRemoveDisabled = false,
  onPrefetch
}: RecipeCardProps) {
  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-300 hover:shadow-md",
        className
      )}
    >
      <RecipeMedia
        imageUrl={imageUrl}
        isSocialVideo={isSocialVideo}
        variant="card"
        title={title}
      />

      <div className="space-y-3 p-4">
        <h3 className="text-base font-semibold leading-snug tracking-tight text-stone-800">
          {title}
        </h3>

        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <span
                key={category}
                className="rounded-full border border-[#4c6633]/12 bg-[#4c6633]/5 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-[#4c6633]/80"
              >
                {category}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-stone-100/80 px-4 pb-4 pt-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-stone-400">{savedAtLabel}</p>

        <div className="flex shrink-0 items-center gap-0.5">
          {onRemove ? (
            <button
              type="button"
              aria-label="Quitar de favoritos"
              disabled={isRemoveDisabled || isRemoving}
              onClick={onRemove}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition",
                "hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200/60",
                "disabled:cursor-not-allowed disabled:opacity-40"
              )}
            >
              {isRemoving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />
              ) : (
                <Heart className="h-3.5 w-3.5 fill-current" strokeWidth={1.5} />
              )}
            </button>
          ) : null}

          {onShare ? (
            <button
              type="button"
              aria-label="Compartir receta como imagen"
              disabled={isShareDisabled || isSharing}
              onClick={onShare}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-[#4c6633]/55 transition",
                "hover:bg-[#4c6633]/6 hover:text-[#4c6633] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6633]/15",
                "disabled:cursor-not-allowed disabled:opacity-40"
              )}
            >
              {isSharing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4c6633]" />
              ) : (
                <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
            </button>
          ) : null}

          <Link
            href={detailHref}
            onMouseEnter={onPrefetch}
            onFocus={onPrefetch}
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-normal text-[#4c6633]/75 transition hover:bg-[#4c6633]/6 hover:text-[#4c6633] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6633]/15"
          >
            Ver preparación
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </article>
  );
}
