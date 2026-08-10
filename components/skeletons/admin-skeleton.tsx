import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AdminHubSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn("mx-auto max-w-md space-y-4 px-4 py-6", className)}
      role="status"
      aria-label="Cargando administración"
      aria-busy="true"
    >
      <div className="space-y-2" aria-hidden>
        <Skeleton silent className="h-5 w-40 rounded-md" />
        <Skeleton silent className="h-3 w-56 rounded-md" />
      </div>
      <div className="space-y-2.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton silent key={index} className="h-12 w-full rounded-full" />
        ))}
      </div>
    </section>
  );
}

export function AdminListSkeleton({
  className,
  rows = 6
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div
      className={cn("space-y-2", className)}
      role="status"
      aria-label="Cargando listado"
      aria-busy="true"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-2.5 shadow-sm"
          aria-hidden
        >
          <Skeleton silent className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton silent className="h-3.5 w-[80%] rounded-md" />
            <Skeleton silent className="h-2.5 w-24 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
