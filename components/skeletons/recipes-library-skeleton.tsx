import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function RecipeTileSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-stone-100/90 bg-white shadow-sm shadow-stone-200/20">
      <Skeleton silent className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-1.5 px-2 pb-1.5 pt-1.5">
        <Skeleton silent className="h-2.5 w-[92%] rounded" />
        <Skeleton silent className="h-2.5 w-[70%] rounded" />
        <div className="mt-0.5 flex items-center gap-1">
          <Skeleton silent className="h-3.5 w-12 rounded-md" />
          <Skeleton silent className="h-2.5 w-10 rounded" />
        </div>
        <div className="mt-auto flex justify-end gap-0.5">
          <Skeleton silent className="h-5 w-5 rounded-full" />
          <Skeleton silent className="h-5 w-5 rounded-full" />
          <Skeleton silent className="h-5 w-5 rounded-full" />
          <Skeleton silent className="h-5 w-5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function RecipeCarouselSectionSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  return (
    <section className="space-y-1.5" aria-hidden>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-baseline gap-1.5">
          <Skeleton silent className="h-3.5 w-16 rounded-md" />
          <Skeleton silent className="h-2.5 w-5 rounded" />
        </div>
        <Skeleton silent className="h-6 w-16 rounded-full" />
      </div>
      <div className="-mx-4 flex gap-2 overflow-hidden px-4 pb-0.5">
        {Array.from({ length: cardCount }).map((_, index) => (
          <div key={index} className="w-[36%] max-w-[9.5rem] shrink-0 sm:w-40">
            <RecipeTileSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Home de Recetas: filas con carrusel. */
export function RecipesLibrarySkeleton({
  className,
  sections = 4
}: {
  className?: string;
  sections?: number;
}) {
  return (
    <div
      className={cn("space-y-4", className)}
      role="status"
      aria-label="Cargando recetas"
    >
      {Array.from({ length: sections }).map((_, index) => (
        <RecipeCarouselSectionSkeleton key={index} />
      ))}
    </div>
  );
}

/** Vista «Ver más»: rejilla 2 columnas. */
export function RecipesSectionGridSkeleton({
  className,
  count = 6
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-2 sm:gap-2.5", className)}
      role="status"
      aria-label="Cargando recetas"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="min-w-0">
          <RecipeTileSkeleton />
        </div>
      ))}
    </div>
  );
}
