import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Evita el aria-label por defecto cuando el padre ya anuncia el estado de carga. */
  silent?: boolean;
};

export function Skeleton({ className, silent = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton-bone relative overflow-hidden rounded-md bg-[#F2F1ED]", className)}
      role={silent ? undefined : "status"}
      aria-label={silent ? undefined : "Cargando..."}
      aria-hidden={silent ? true : undefined}
      {...props}
    />
  );
}
