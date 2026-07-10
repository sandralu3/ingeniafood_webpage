import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ProgressBoardCardProps = {
  title: string;
  accentBarClass: string;
  accentTextClass: string;
  icon: LucideIcon;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
};

export function ProgressBoardCard({
  title,
  accentBarClass,
  accentTextClass,
  icon: Icon,
  onClick,
  children,
  className
}: ProgressBoardCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex min-h-[6.75rem] w-full flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white p-2.5 text-left shadow-sm transition-transform duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99]",
        className
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", accentBarClass)} aria-hidden />

      <div className="mb-1.5 flex items-start justify-between gap-1.5">
        <p className={cn("text-[9px] font-bold uppercase tracking-[0.12em]", accentTextClass)}>
          {title}
        </p>
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-50 text-stone-400 transition group-hover:bg-stone-100 group-hover:text-stone-600",
            accentTextClass
          )}
          aria-hidden
        >
          <Icon className="h-3 w-3" />
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-end">{children}</div>

      <ChevronRight
        className="absolute bottom-2 right-2 h-3 w-3 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500"
        aria-hidden
      />
    </button>
  );
}
