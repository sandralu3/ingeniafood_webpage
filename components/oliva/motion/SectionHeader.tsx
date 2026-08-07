import type { ReactNode } from "react";
import { ScrollReveal } from "./ScrollReveal";

type SectionHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  return (
    <ScrollReveal className={className ?? "mx-auto max-w-2xl text-center"}>
      <h2 className="font-sans text-3xl font-semibold leading-[1.15] tracking-tight text-[#1b1c19] sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {subtitle ? (
        <div className="oliva-section-subtitle mt-5 text-base leading-relaxed text-[#53433e] sm:text-lg">
          {subtitle}
        </div>
      ) : null}
    </ScrollReveal>
  );
}
