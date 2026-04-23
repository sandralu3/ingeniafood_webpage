import { Clock3, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type RecipeCardProps = {
  title: string;
  category: string;
  time: string;
  description: string;
  imageLabel: string;
  featured?: boolean;
  className?: string;
};

export function RecipeCard({
  title,
  category,
  time,
  description,
  imageLabel,
  featured = false,
  className
}: RecipeCardProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border border-brand-green-light/25 bg-white/80 shadow-sm",
        "transition-transform duration-200 hover:-translate-y-0.5",
        className
      )}
    >
      <div className="relative">
        <div
          className={cn(
            "flex items-end bg-gradient-to-br from-brand-green-light/35 to-brand-green-light/10 px-4 pb-4",
            featured ? "h-52" : "h-36"
          )}
          role="img"
          aria-label={imageLabel}
        >
          <span className="rounded-full bg-brand-cream/85 px-3 py-1 text-xs font-semibold text-brand-green-dark">
            Placeholder imagen
          </span>
        </div>
        <span className="absolute left-4 top-4 rounded-full bg-brand-green-dark px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-cream">
          {category}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <h3
          className={cn(
            "font-semibold tracking-tight text-brand-green-dark",
            featured ? "text-xl" : "text-base"
          )}
        >
          {title}
        </h3>
        <p className="line-clamp-2 text-sm text-brand-green-dark/75">{description}</p>

        <div className="flex items-center gap-3 text-xs font-medium text-brand-green-dark/80">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {time}
          </span>
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3.5 w-3.5" />
            Saludable
          </span>
        </div>
      </div>
    </article>
  );
}
