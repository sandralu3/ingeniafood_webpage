import type { ReactNode } from "react";
import { ScrollReveal } from "@/components/oliva/motion";

type WhyBlockProps = {
  title: string;
  children: ReactNode;
  visual: ReactNode;
  reverse?: boolean;
  delay?: number;
};

export function WhyBlock({
  title,
  children,
  visual,
  reverse = false,
  delay = 0
}: WhyBlockProps) {
  return (
    <ScrollReveal
      delay={delay}
      variant={reverse ? "right" : "left"}
      className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20"
    >
      <div className={reverse ? "lg:order-2" : undefined}>
        <h3 className="font-sans text-2xl font-semibold leading-snug tracking-tight text-[#1b1c19] sm:text-3xl">
          {title}
        </h3>
        <div className="mt-5 space-y-4 text-base leading-relaxed text-[#53433e] sm:text-lg">
          {children}
        </div>
      </div>
      <div
        className={`flex justify-center ${reverse ? "lg:order-1 lg:justify-start" : "lg:justify-end"}`}
      >
        {visual}
      </div>
    </ScrollReveal>
  );
}
