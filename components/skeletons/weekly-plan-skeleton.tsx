import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MEAL_LABELS = ["Desayuno", "Almuerzo", "Cena"] as const;
const DAY_COUNT = 7;

/** Franja de 7 días en grid (como PlanDayCarousel). */
function PlanWeekCarouselSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("w-full py-0.5", className)} aria-hidden>
      <div className="grid w-full grid-cols-7 gap-1">
        {Array.from({ length: DAY_COUNT }).map((_, index) => (
          <div
            key={index}
            className="flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl border border-transparent bg-white/80 px-0.5 pb-1.5 pt-1.5"
          >
            <Skeleton silent className="h-2.5 w-6 rounded" />
            <Skeleton silent className="h-3.5 w-5 rounded" />
            <Skeleton silent className="h-1 w-6 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanMealRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-stone-100/90 bg-white p-2.5 shadow-sm shadow-stone-100/20">
      <Skeleton silent className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton silent className="h-3 w-[85%] rounded-md" />
        <Skeleton silent className="h-2.5 w-16 rounded" />
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <Skeleton silent className="h-7 w-7 rounded-full" />
        <Skeleton silent className="h-7 w-7 rounded-full" />
      </div>
    </div>
  );
}

function PlanDayMealsSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("space-y-2.5", className)} aria-hidden>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Skeleton silent className="h-4 w-20 rounded-md" />
          <Skeleton silent className="h-3 w-14 rounded-md" />
        </div>
        <Skeleton silent className="h-5 w-12 rounded-full" />
      </div>

      <ul className="space-y-2.5">
        {MEAL_LABELS.map((label) => (
          <li key={label}>
            <div className="mb-1 flex items-center gap-2 px-0.5">
              <Skeleton silent className="h-2.5 w-16 rounded" />
              <Skeleton silent className="h-px flex-1 rounded-full" />
            </div>
            <PlanMealRowSkeleton />
          </li>
        ))}
      </ul>

      <div className="space-y-1.5 pt-1">
        <Skeleton silent className="h-2.5 w-14 rounded" />
        <div className="flex gap-2 overflow-hidden">
          <Skeleton silent className="h-16 w-28 shrink-0 rounded-xl" />
          <Skeleton silent className="h-16 w-28 shrink-0 rounded-xl" />
        </div>
      </div>
    </section>
  );
}

type WeeklyPlanSkeletonProps = {
  className?: string;
  /** Incluye bloque de título (24px, 50%) para pantallas de carga completa. */
  showTitle?: boolean;
};

export function WeeklyPlanSkeleton({ className, showTitle = false }: WeeklyPlanSkeletonProps) {
  return (
    <div
      className={cn("space-y-3", className)}
      role="status"
      aria-label="Cargando plan semanal"
      aria-busy="true"
    >
      {showTitle ? (
        <div className="space-y-2" aria-hidden>
          <Skeleton silent className="h-6 w-1/2 max-w-[12rem] rounded-lg" />
          <Skeleton silent className="h-3 w-full max-w-md rounded-md" />
        </div>
      ) : null}

      <PlanWeekCarouselSkeleton />
      <PlanDayMealsSkeleton />
    </div>
  );
}

export { PlanWeekCarouselSkeleton, PlanDayMealsSkeleton, PlanMealRowSkeleton };
