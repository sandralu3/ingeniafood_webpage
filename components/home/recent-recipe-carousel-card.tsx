import Link from "next/link";
import { RecipeMedia } from "@/components/recipes/recipe-media";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  categories: string[];
  href: string;
  imageUrl?: string | null;
  isSocialVideo?: boolean;
  className?: string;
};

export function RecentRecipeCarouselCard({
  title,
  categories,
  href,
  imageUrl,
  isSocialVideo = false,
  className
}: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md",
        className
      )}
    >
      <RecipeMedia
        imageUrl={imageUrl}
        isSocialVideo={isSocialVideo}
        variant="thumbnail"
        title={title}
      />

      <div className="flex flex-1 flex-col justify-between p-3.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-stone-800">
          {title}
        </h3>

        {categories.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {categories.slice(0, 2).map((category) => (
              <span
                key={category}
                className="rounded-full border border-[#556B2F]/12 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-[#556B2F]/80"
              >
                {category}
              </span>
            ))}
          </div>
        ) : (
          <span className="mt-2.5 text-[9px] font-medium uppercase tracking-[0.08em] text-stone-400">
            Saludable
          </span>
        )}
      </div>
    </Link>
  );
}
