import { cn } from "@/lib/utils";

type RecipeCardProps = {
  title: string;
  categories: string[];
  createdAt: string;
  className?: string;
};

export function RecipeCard({
  title,
  categories,
  createdAt,
  className
}: RecipeCardProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-transparent bg-white/95 shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-[#4A6044]/20",
        className
      )}
    >
      <div className="flex min-h-32 flex-col items-start justify-between space-y-2 p-3 text-left">
        <h3 className="text-base font-semibold leading-tight text-brand-green-dark">
          {title}
        </h3>

        <div className="space-y-2">
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-[#4A6044] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                >
                  {category}
                </span>
              ))}
            </div>
          ) : null}

          <div className="text-left text-sm text-gray-500">
            {createdAt}
          </div>
        </div>
      </div>
    </article>
  );
}
