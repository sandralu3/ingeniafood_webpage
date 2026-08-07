import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionVariant = "cream" | "paper" | "sand" | "linen";
type SectionGlow = "none" | "center" | "left" | "right";
type SectionAlign = "center" | "start";

type SectionShellProps = {
  id?: string;
  variant?: SectionVariant;
  glow?: SectionGlow;
  divider?: boolean;
  align?: SectionAlign;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function SectionShell({
  id,
  variant = "cream",
  glow = "none",
  divider = false,
  align = "center",
  className,
  contentClassName,
  children
}: SectionShellProps) {
  return (
    <section
      id={id}
      className={cn(
        "oliva-section oliva-snap-section",
        align === "start" && "oliva-snap-section--start",
        `oliva-section--${variant}`,
        divider && "oliva-section--divider",
        className
      )}
    >
      {glow !== "none" && (
        <div
          className={cn(
            "oliva-section-glow pointer-events-none absolute inset-0",
            `oliva-section-glow--${glow}`
          )}
          aria-hidden="true"
        />
      )}

      <div className={cn("oliva-snap-inner relative", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
