import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MEAL_LABELS = ["Desayuno", "Almuerzo", "Cena"] as const;
const DAY_COUNT = 7;

function PlanWeekCarouselSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-[#FCFBFA] px-2.5 py-2 shadow-sm shadow-stone-200/25",
        className
      )}
      aria-hidden
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Skeleton silent className="h-4 w-24 rounded-md" />
          <Skeleton silent className="h-3 w-20 rounded-md" />
        </div>
        <Skeleton silent className="h-5 w-10 rounded-full" />
      </div>

      <div className="flex gap-1.5 overflow-hidden pb-0.5">
        {Array.from({ length: DAY_COUNT }).map((_, index) => (
          <div
            key={index}
            className="flex min-w-[3.5rem] flex-col items-center gap-1 rounded-xl bg-white px-2 py-1.5"
          >
            <Skeleton silent className="h-3 w-6 rounded" />
            <Skeleton silent className="h-2.5 w-5 rounded" />
            <Skeleton silent className="h-2 w-8 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanMealRowSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-stone-100/90 bg-white px-2 py-1.5 shadow-sm shadow-stone-100/20">
      <Skeleton silent className="h-7 w-7 shrink-0 rounded-full" />
      <Skeleton silent className="h-3.5 min-w-0 flex-1 rounded-md" />
      <Skeleton silent className="h-7 w-7 shrink-0 rounded-full" />
    </div>
  );
}

function PlanDayMealsSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-[#FCFBFA] px-2.5 py-2 shadow-sm shadow-stone-200/25",
        className
      )}
      aria-hidden
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Skeleton silent className="h-4 w-16 rounded-md" />
          <Skeleton silent className="h-3 w-12 rounded-md" />
        </div>
        <Skeleton silent className="h-5 w-8 rounded-full" />
      </div>

      <ul className="space-y-2">
        {MEAL_LABELS.map((label) => (
          <li key={label}>
            <div className="mb-1 flex items-center gap-2 px-0.5">
              <Skeleton silent className="h-2 w-14 rounded" />
              <Skeleton silent className="h-px flex-1 rounded-full" />
            </div>
            <PlanMealRowSkeleton />
          </li>
        ))}
      </ul>
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
          <Skeleton silent className="h-3 w-4/5 max-w-sm rounded-md" />
        </div>
      ) : null}

      <PlanWeekCarouselSkeleton />
      <PlanDayMealsSkeleton />
    </div>
  );
}

export { PlanWeekCarouselSkeleton, PlanDayMealsSkeleton, PlanMealRowSkeleton };
