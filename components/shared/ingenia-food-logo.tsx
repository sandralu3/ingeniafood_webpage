import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Compacto como el header de la app; share = fila para imagen exportada */
  variant?: "header" | "share";
  className?: string;
};

export function IngeniaFoodLogo({ variant = "header", className }: Props) {
  if (variant === "share") {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-between gap-4",
          className
        )}
      >
        <p className="shrink-0 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.12em] text-[#556B2F]">
          Sandra Vergara
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Leaf className="h-4 w-4 shrink-0 text-[#556B2F]" strokeWidth={2} />
          <p className="whitespace-nowrap text-base tracking-tight text-sv-on-surface">
            <span className="font-semibold">Ingenia</span>
            <span className="font-semibold text-[#556B2F]">Food</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 font-sans leading-tight", className)}>
      <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-sv-on-surface-variant">
        Sandra Vergara
      </p>
      <div className="flex items-center gap-1">
        <Leaf className="h-3.5 w-3.5 shrink-0 text-[#556B2F]" strokeWidth={2} />
        <p className="truncate text-sm tracking-tight text-sv-on-surface">
          <span className="font-semibold">Ingenia</span>
          <span className="font-semibold text-[#556B2F]">Food</span>
        </p>
      </div>
    </div>
  );
}
