import { Leaf } from "lucide-react";
import { BetaBadge } from "@/components/shared/beta-badge";
import { cn } from "@/lib/utils";

type Props = {
  /** Compacto como el header de la app; auth = centrado en formularios; share = fila para imagen exportada; drawer = menú lateral */
  variant?: "header" | "auth" | "share" | "drawer";
  className?: string;
  /** Muestra la marca Beta junto al wordmark (por defecto sí en header/drawer/auth). */
  showBeta?: boolean;
};

export function IngeniaFoodLogo({
  variant = "header",
  className,
  showBeta
}: Props) {
  const betaVisible =
    showBeta ?? (variant === "header" || variant === "drawer" || variant === "auth");

  if (variant === "drawer") {
    return (
      <div className={cn("flex items-center gap-2 font-sans leading-tight", className)}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#556B2F]/10">
          <Leaf className="h-4 w-4 text-[#556B2F]" strokeWidth={2} />
        </span>
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="text-lg tracking-tight text-stone-900">
            <span className="font-semibold">Ingenia</span>
            <span className="font-semibold text-[#556B2F]">Food</span>
          </p>
          {betaVisible ? <BetaBadge size="md" /> : null}
        </div>
      </div>
    );
  }

  if (variant === "share") {
    return (
      <div className={cn("flex w-full items-center justify-between gap-4", className)}>
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
        <div className="flex flex-wrap items-baseline justify-center gap-2">
          <Leaf className="h-4 w-4 shrink-0 translate-y-px text-[#556B2F]" strokeWidth={2} />
          <p className="text-base tracking-tight text-sv-on-surface sm:text-lg">
            <span className="font-semibold">Ingenia</span>
            <span className="font-semibold text-[#556B2F]">Food</span>
          </p>
          {betaVisible ? <BetaBadge size="md" className="translate-y-[-1px]" /> : null}
          <span className="text-[11px] font-medium lowercase italic tracking-normal text-stone-400">
            by sandra
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 font-sans leading-tight", className)}>
      <div className="flex min-w-0 items-baseline gap-1.5">
        <Leaf className="h-3.5 w-3.5 shrink-0 translate-y-px text-[#556B2F]" strokeWidth={2} />
        <p className="truncate text-sm tracking-tight text-sv-on-surface">
          <span className="font-semibold">Ingenia</span>
          <span className="font-semibold text-[#556B2F]">Food</span>
        </p>
        {betaVisible ? <BetaBadge className="translate-y-[-1px]" /> : null}
        <span className="hidden shrink-0 text-[10px] font-medium lowercase italic tracking-normal text-stone-400 sm:inline">
          by sandra
        </span>
      </div>
    </div>
  );
}
