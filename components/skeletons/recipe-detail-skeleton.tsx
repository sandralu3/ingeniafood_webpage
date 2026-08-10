import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Detalle de receta: hero + badges + chips + pestañas. */
export function RecipeDetailSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-detail-enter space-y-3 pb-8", className)}
      role="status"
      aria-label="Cargando receta"
      aria-busy="true"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-100 sm:aspect-video" aria-hidden>
        <Skeleton silent className="absolute inset-0 rounded-none" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-3 pt-3">
          <Skeleton silent className="h-9 w-9 rounded-full" />
          <div className="flex gap-1.5">
            <Skeleton silent className="h-9 w-9 rounded-full" />
            <Skeleton silent className="h-9 w-9 rounded-full" />
            <Skeleton silent className="h-9 w-9 rounded-full" />
            <Skeleton silent className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <Skeleton
          silent
          className="absolute bottom-3 left-3 h-6 w-32 rounded-full"
        />
      </div>

      <div className="space-y-2 border-b border-stone-100 bg-white px-4 pb-3 pt-3" aria-hidden>
        <div className="flex gap-1.5 overflow-hidden">
          <Skeleton silent className="h-5 w-24 shrink-0 rounded-md" />
          <Skeleton silent className="h-5 w-28 shrink-0 rounded-md" />
          <Skeleton silent className="h-5 w-14 shrink-0 rounded-md" />
        </div>
        <Skeleton silent className="h-6 w-[90%] rounded-md" />
        <div className="flex gap-1.5 overflow-hidden">
          <Skeleton silent className="h-6 w-20 shrink-0 rounded-full" />
          <Skeleton silent className="h-6 w-16 shrink-0 rounded-full" />
          <Skeleton silent className="h-6 w-24 shrink-0 rounded-full" />
          <Skeleton silent className="h-6 w-20 shrink-0 rounded-full" />
        </div>
      </div>

      <div className="space-y-3 px-4" aria-hidden>
        <div className="grid grid-cols-2 gap-1">
          <Skeleton silent className="h-9 rounded-xl" />
          <Skeleton silent className="h-9 rounded-xl" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton silent key={index} className="h-3.5 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
