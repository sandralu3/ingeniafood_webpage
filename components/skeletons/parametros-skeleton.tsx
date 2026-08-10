import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function ParamSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm" aria-hidden>
      <div className="mb-3 flex items-start gap-2">
        <Skeleton silent className="mt-0.5 h-7 w-7 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton silent className="h-3.5 w-32 rounded-md" />
          <Skeleton silent className="h-2.5 w-48 rounded" />
        </div>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton silent className="h-2.5 w-20 rounded" />
            <Skeleton silent className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Parámetros: nutrición + agua + notificaciones. */
export function ParametrosSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("space-y-3", className)}
      role="status"
      aria-label="Cargando parámetros"
      aria-busy="true"
    >
      <ParamSectionSkeleton rows={4} />
      <ParamSectionSkeleton rows={2} />
      <ParamSectionSkeleton rows={1} />
    </div>
  );
}
