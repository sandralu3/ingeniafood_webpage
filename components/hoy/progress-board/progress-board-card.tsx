import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ProgressBoardCardProps = {
  title: string;
  /** Badge u meta junto al título (ej. score 94/100). */
  titleMeta?: ReactNode;
  accentBarClass: string;
  accentTextClass: string;
  icon: LucideIcon;
  onClick?: () => void;
  showChevron?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function ProgressBoardCard({
  title,
  titleMeta,
  accentBarClass,
  accentTextClass,
  icon: Icon,
  onClick,
  showChevron = Boolean(onClick),
  children,
  className
}: ProgressBoardCardProps) {
  const shellClass = cn(
    "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white/90 p-3 text-left shadow-sm transition sm:p-3.5",
    onClick && "hover:bg-white active:scale-[0.99]",
    className
  );

  const content = (
    <>
      <div className={cn("absolute inset-x-0 top-0 h-1", accentBarClass)} aria-hidden />

      <div className="mb-2 flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <p className={cn("text-[9px] font-bold uppercase tracking-[0.12em]", accentTextClass)}>
            {title}
          </p>
          {titleMeta ? <div className="mt-1">{titleMeta}</div> : null}
        </div>
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-50 text-stone-400",
            onClick && "transition group-hover:bg-stone-100 group-hover:text-stone-600",
            accentTextClass
          )}
          aria-hidden
        >
          <Icon className="h-3 w-3" />
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-2">{children}</div>

      {showChevron ? (
        <ChevronRight
          className="pointer-events-none absolute bottom-2.5 right-2 h-3 w-3 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500"
          aria-hidden
        />
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shellClass}>
        {content}
      </button>
    );
  }

  return <div className={shellClass}>{content}</div>;
}
