import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function HoyGreetingSkeleton({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "flex w-full items-center justify-between gap-3 border-b border-stone-100 pb-2",
        className
      )}
      aria-hidden
    >
      <div className="min-w-0 flex-1 space-y-1">
        <Skeleton silent className="h-3 w-24 rounded-md" />
        <Skeleton silent className="h-6 w-28 rounded-md" />
      </div>
      <Skeleton silent className="h-10 w-10 shrink-0 rounded-full" />
    </header>
  );
}

export function HoyScanBannerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm",
        className
      )}
      aria-hidden
    >
      <div className="flex items-center gap-2">
        <Skeleton silent className="h-8 w-8 shrink-0 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton silent className="h-3.5 w-28 rounded-md" />
          <Skeleton silent className="h-2.5 w-36 rounded-md" />
        </div>
      </div>
      <Skeleton silent className="h-3.5 w-3.5 shrink-0 rounded-full" />
    </div>
  );
}

function ProgressBoardCardSkeleton() {
  return (
    <div className="relative flex min-h-[5.5rem] w-full flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white/90 p-2 shadow-sm">
      <Skeleton silent className="absolute inset-x-0 top-0 h-1 rounded-none" />
      <div className="mb-1.5 flex items-start justify-between gap-1.5">
        <Skeleton silent className="h-2.5 w-16 rounded" />
        <Skeleton silent className="h-5 w-5 shrink-0 rounded-full" />
      </div>
      <Skeleton silent className="mt-auto h-5 w-12 rounded-md" />
      <Skeleton silent className="mt-1 h-2.5 w-20 rounded-md" />
    </div>
  );
}

export function HoyProgressBoardSkeleton({
  className,
  showSectionLabel = true
}: {
  className?: string;
  showSectionLabel?: boolean;
}) {
  return (
    <section className={cn("space-y-2", className)} aria-hidden>
      {showSectionLabel ? <Skeleton silent className="mx-0.5 h-2.5 w-32 rounded" /> : null}
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <ProgressBoardCardSkeleton key={index} />
        ))}
      </div>
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
    <section
      className={cn(
        "rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30",
        className
      )}
      aria-hidden
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Skeleton silent className="h-4 w-24 rounded-md" />
          <Skeleton silent className="h-3 w-8 rounded-md" />
        </div>
        <Skeleton silent className="h-3 w-10 rounded-md" />
      </div>

      <ul className="space-y-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <ChallengeRowSkeleton key={index} />
        ))}
      </ul>
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
      className={cn("space-y-3", className)}
      role="status"
      aria-label="Cargando tu día"
      aria-busy="true"
    >
      {includeGreeting ? <HoyGreetingSkeleton /> : null}
      <HoyScanBannerSkeleton />
      <HoyProgressBoardSkeleton />
      <HoyDailyChallengesSkeleton />
    </div>
  );
}
