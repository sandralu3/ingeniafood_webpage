import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Compacto como el header de la app; auth = centrado en formularios; share = fila para imagen exportada */
  variant?: "header" | "auth" | "share";
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

  if (variant === "auth") {
    return (
      <div className={cn("flex justify-center font-sans leading-tight", className)}>
        <div className="flex items-baseline gap-2">
          <Leaf className="h-4 w-4 shrink-0 translate-y-px text-[#556B2F]" strokeWidth={2} />
          <p className="text-base tracking-tight text-sv-on-surface sm:text-lg">
            <span className="font-semibold">Ingenia</span>
            <span className="font-semibold text-[#556B2F]">Food</span>
          </p>
          <span className="text-[11px] font-medium lowercase italic tracking-normal text-stone-400">
            by sandra
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 font-sans leading-tight", className)}>
      <div className="flex items-baseline gap-1.5">
        <Leaf className="h-3.5 w-3.5 shrink-0 translate-y-px text-[#556B2F]" strokeWidth={2} />
        <p className="truncate text-sm tracking-tight text-sv-on-surface">
          <span className="font-semibold">Ingenia</span>
          <span className="font-semibold text-[#556B2F]">Food</span>
        </p>
        <span className="text-[10px] font-medium lowercase italic tracking-normal text-stone-400">
          by sandra
        </span>
      </div>
    </div>
  );
}
