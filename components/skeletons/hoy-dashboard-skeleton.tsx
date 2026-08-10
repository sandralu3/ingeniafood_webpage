import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function HoyGreetingSkeleton({ className }: { className?: string }) {
  return (
    <header className={cn("flex w-full items-start justify-between gap-3", className)} aria-hidden>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton silent className="h-3 w-24 rounded-md" />
        <Skeleton silent className="h-7 w-40 rounded-md" />
        <Skeleton silent className="h-3 w-52 rounded-md" />
      </div>
      <Skeleton silent className="h-8 w-24 shrink-0 rounded-full" />
    </header>
  );
}

/** CTA escáner: hero alto con imagen a la derecha (coincide con HoyDashboard). */
export function HoyScanBannerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex min-h-[148px] overflow-hidden rounded-[22px] bg-[#E8EDE3]/80 p-4 shadow-sm",
        className
      )}
      aria-hidden
    >
      <div className="relative z-10 flex min-w-0 max-w-[58%] items-start gap-3 pr-2">
        <Skeleton silent className="mt-0.5 h-10 w-10 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <Skeleton silent className="h-4 w-36 rounded-md" />
          <Skeleton silent className="h-3 w-full max-w-[11rem] rounded-md" />
          <Skeleton silent className="h-3 w-28 rounded-md" />
          <Skeleton silent className="mt-2 h-7 w-36 rounded-full" />
        </div>
      </div>
      <Skeleton silent className="absolute inset-y-0 right-0 w-[48%] rounded-none" />
    </div>
  );
}

/** Racha + dosis en una sola tarjeta de dos columnas. */
export function HoyProgressBoardSkeleton({
  className,
  showSectionLabel = false
}: {
  className?: string;
  showSectionLabel?: boolean;
}) {
  return (
    <section className={cn(className)} aria-hidden>
      {showSectionLabel ? <Skeleton silent className="mb-2 mx-0.5 h-2.5 w-32 rounded" /> : null}
      <div className="grid grid-cols-2 items-stretch rounded-[22px] border border-stone-100/80 bg-white shadow-sm shadow-stone-200/40">
        <div className="flex min-w-0 flex-col gap-1.5 px-3.5 py-3 sm:px-4 sm:py-3.5">
          <Skeleton silent className="h-3 w-14 rounded" />
          <Skeleton silent className="h-7 w-12 rounded-md" />
          <Skeleton silent className="h-2.5 w-28 rounded" />
          <div className="mt-1 flex gap-1">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton silent key={index} className="h-1.5 w-1.5 rounded-full" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 border-l border-stone-100 px-3.5 py-3 sm:px-4 sm:py-3.5">
          <Skeleton silent className="h-3 w-24 rounded" />
          <div className="flex items-center justify-between gap-2">
            <Skeleton silent className="h-7 w-16 rounded-md" />
            <Skeleton silent className="h-10 w-10 rounded-full" />
          </div>
          <Skeleton silent className="h-2.5 w-28 rounded" />
        </div>
      </div>
    </section>
  );
}

/** Menú del día: cabecera + rejilla de comidas. */
export function HoyTodayMenuSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "space-y-2.5 rounded-[22px] border border-stone-100/80 bg-white p-3 shadow-sm shadow-stone-200/30",
        className
      )}
      aria-hidden
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton silent className="h-3.5 w-28 rounded-md" />
        <Skeleton silent className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton silent className="aspect-square w-full rounded-xl" />
            <Skeleton silent className="h-2 w-12 rounded" />
            <Skeleton silent className="h-2.5 w-full rounded" />
          </div>
        ))}
      </div>
      <Skeleton silent className="h-8 w-full rounded-xl" />
    </section>
  );
}

export function ChallengeRowSkeleton() {
  return (
    <li className="rounded-lg bg-stone-50/70 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <Skeleton silent className="h-6 w-6 shrink-0 rounded-full" />
        <Skeleton silent className="h-3 min-w-0 flex-1 rounded-md" />
        <Skeleton silent className="h-3 w-6 shrink-0 rounded" />
        <Skeleton silent className="h-5 w-5 shrink-0 rounded-full" />
      </div>
    </li>
  );
}

export function HoyDailyChallengesSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("space-y-2", className)} aria-hidden>
      <div className="flex items-start justify-between gap-2 px-0.5">
        <Skeleton silent className="h-2.5 w-24 rounded" />
        <div className="flex items-center gap-2">
          <Skeleton silent className="h-4 w-10 rounded-full" />
          <Skeleton silent className="h-3 w-10 rounded-md" />
        </div>
      </div>
      <div className="rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30">
        <ul className="space-y-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <ChallengeRowSkeleton key={index} />
          ))}
        </ul>
      </div>
    </section>
  );
}

type HoyDashboardSkeletonProps = {
  className?: string;
  includeGreeting?: boolean;
};

export function HoyDashboardSkeleton({
  className,
  includeGreeting = false
}: HoyDashboardSkeletonProps) {
  return (
    <div
      className={cn("space-y-3.5", className)}
      role="status"
      aria-label="Cargando tu día"
      aria-busy="true"
    >
      {includeGreeting ? <HoyGreetingSkeleton /> : null}
      <HoyScanBannerSkeleton />
      <HoyProgressBoardSkeleton />
      <HoyTodayMenuSkeleton />
      <HoyDailyChallengesSkeleton />
    </div>
  );
}
