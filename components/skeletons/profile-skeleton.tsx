import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Perfil: avatar + formulario + bloque Premium. */
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "-mx-4 min-h-[calc(100dvh-10rem)] bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-2 pt-1",
        className
      )}
      role="status"
      aria-label="Cargando perfil"
      aria-busy="true"
    >
      <div className="mx-auto max-w-md space-y-6" aria-hidden>
        <header className="space-y-2 text-center">
          <Skeleton silent className="mx-auto h-5 w-24 rounded-md" />
          <Skeleton silent className="mx-auto h-3 w-48 rounded-md" />
        </header>

        <div className="flex flex-col items-center gap-2.5">
          <Skeleton silent className="h-24 w-24 rounded-full" />
          <Skeleton silent className="h-5 w-20 rounded-full" />
        </div>

        <div className="space-y-3 rounded-2xl bg-white/90 p-3 shadow-sm">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton silent className="h-2.5 w-16 rounded" />
              <Skeleton silent className="h-11 w-full rounded-xl" />
            </div>
          ))}
          <Skeleton silent className="mt-1 h-11 w-full rounded-full" />
        </div>

        <div className="space-y-2 rounded-2xl bg-white/90 p-3 shadow-sm">
          <Skeleton silent className="h-3 w-20 rounded" />
          <Skeleton silent className="h-10 w-full rounded-xl" />
        </div>

        <div className="space-y-2 rounded-2xl border border-stone-100 bg-white/90 p-3 shadow-sm">
          <Skeleton silent className="h-3.5 w-28 rounded" />
          <Skeleton silent className="h-3 w-full rounded" />
          <Skeleton silent className="h-10 w-full rounded-full" />
        </div>
      </div>
    </section>
  );
}
