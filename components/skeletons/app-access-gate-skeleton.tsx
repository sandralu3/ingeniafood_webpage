import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Pantalla breve del gate PWA (auth / standalone). */
export function AppAccessGateSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center bg-[#FDFCFB] px-6",
        className
      )}
      role="status"
      aria-busy="true"
      aria-label="Cargando IngeniaFood"
      suppressHydrationWarning
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-4" aria-hidden>
        <Skeleton silent className="h-12 w-12 rounded-2xl" />
        <Skeleton silent className="h-4 w-36 rounded-md" />
        <Skeleton silent className="h-3 w-48 rounded-md" />
        <div className="mt-2 w-full space-y-2">
          <Skeleton silent className="h-11 w-full rounded-full" />
          <Skeleton silent className="h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
