import { cn } from "@/lib/utils";

type BetaBadgeProps = {
  className?: string;
  /** header = compacto junto al logo; drawer = un poco más legible */
  size?: "sm" | "md";
};

/**
 * Marca de versión Beta — puntos estratégicos de la app (header, drawer…).
 */
export function BetaBadge({ className, size = "sm" }: BetaBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border font-bold uppercase tracking-[0.14em] text-[#556B2F]",
        "border-[#556B2F]/25 bg-[#556B2F]/8",
        size === "sm" && "px-1 py-px text-[8px] leading-none",
        size === "md" && "px-1.5 py-0.5 text-[9px] leading-none",
        className
      )}
      title="Versión Beta"
      aria-label="Versión Beta"
    >
      Beta
    </span>
  );
}
