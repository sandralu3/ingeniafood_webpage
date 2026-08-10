import { ChallengeRowSkeleton } from "@/components/skeletons/hoy-dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Lista de retos (drawer): resumen + filas. */
export function RetosListSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("space-y-3", className)}
      role="status"
      aria-label="Cargando retos"
      aria-busy="true"
    >
      <div className="rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30" aria-hidden>
        <div className="flex items-center gap-2.5">
          <Skeleton silent className="h-8 w-8 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton silent className="h-3 w-36 rounded-md" />
            <Skeleton silent className="h-2.5 w-48 rounded" />
          </div>
        </div>
      </div>

      <div className="space-y-2" aria-hidden>
        <Skeleton silent className="mx-0.5 h-3 w-28 rounded" />
        <Skeleton silent className="mx-0.5 h-2.5 w-40 rounded" />
        <div className="rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30">
          <ul className="space-y-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <ChallengeRowSkeleton key={index} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
