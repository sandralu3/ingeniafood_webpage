import { Skeleton } from "@/components/ui/skeleton";

type PlanRecipePickerSkeletonProps = {
  cards?: number;
};

export function PlanRecipePickerSkeleton({ cards = 9 }: PlanRecipePickerSkeletonProps) {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando recetas">
      <Skeleton silent className="h-3.5 w-36 rounded-md" />
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm"
          >
            <Skeleton silent className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 px-2 py-2">
              <Skeleton silent className="h-3 w-[92%] rounded" />
              <Skeleton silent className="h-3 w-[70%] rounded" />
              <div className="flex items-center gap-1.5">
                <Skeleton silent className="h-2.5 w-10 rounded" />
                <Skeleton silent className="h-4 w-14 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
