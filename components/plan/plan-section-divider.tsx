import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionDividerAccent = {
  dividerText: string;
  dividerLine: string;
};

type Props = {
  label: ReactNode;
  accent: SectionDividerAccent;
  className?: string;
  trailing?: ReactNode;
};

export function PlanSectionDivider({ label, accent, className, trailing }: Props) {
  return (
    <div className={cn("mb-1 flex items-center gap-2 px-0.5", className)}>
      <p
        className={cn(
          "shrink-0 text-[9px] font-bold uppercase tracking-[0.14em]",
          accent.dividerText
        )}
      >
        {label}
      </p>
      <span className={cn("h-px min-w-0 flex-1", accent.dividerLine)} aria-hidden />
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
