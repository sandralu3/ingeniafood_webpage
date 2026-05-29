import Link from "next/link";
import { ArrowRight, Loader2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RecipeCardProps = {
  title: string;
  categories: string[];
  savedAtLabel: string;
  detailHref: string;
  className?: string;
  onShare?: () => void;
  isSharing?: boolean;
  isShareDisabled?: boolean;
  onPrefetch?: () => void;
};

export function RecipeCard({
  title,
  categories,
  savedAtLabel,
  detailHref,
  className,
  onShare,
  isSharing = false,
  isShareDisabled = false,
  onPrefetch
}: RecipeCardProps) {
  return (
    <article
      className={cn(
        "group rounded-2xl bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-md",
        className
      )}
    >
      <div className="space-y-3">
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

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-100/80 pt-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-stone-400">{savedAtLabel}</p>

        <div className="flex shrink-0 items-center gap-0.5">
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
