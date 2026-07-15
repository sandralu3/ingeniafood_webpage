"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const hoySectionLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400";

export const hoySectionCardClass =
  "rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm shadow-stone-100/30";

type HoySectionHeaderProps = {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function HoySectionHeader({
  title,
  subtitle,
  meta,
  action,
  className
}: HoySectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-2 px-0.5", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className={hoySectionLabelClass}>{title}</p>
          {meta}
        </div>
        {subtitle ? <p className="mt-0.5 text-[11px] text-stone-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

type HoySectionProps = {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  className?: string;
};

export function HoySection({
  title,
  subtitle,
  meta,
  action,
  children,
  contentClassName,
  className
}: HoySectionProps) {
  return (
    <section className={cn("space-y-2", className)}>
      <HoySectionHeader title={title} subtitle={subtitle} meta={meta} action={action} />
      <div className={cn(hoySectionCardClass, contentClassName)}>{children}</div>
    </section>
  );
}
