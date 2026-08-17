import type { ReactNode } from "react";
import { ScrollReveal } from "@/components/oliva/motion";

type WhyPillarCardProps = {
  index: string;
  title: string;
  children: ReactNode;
  visual: ReactNode;
  delay?: number;
};

export function WhyPillarCard({
  index,
  title,
  children,
  visual,
  delay = 0
}: WhyPillarCardProps) {
  return (
    <ScrollReveal delay={delay} variant="up" className="oliva-why-card">
      <span className="oliva-why-card-index" aria-hidden="true">
        {index}
      </span>

      <div className="oliva-why-card-visual">{visual}</div>

      <div className="oliva-why-card-body">
        <h3 className="oliva-why-card-title">{title}</h3>
        <div className="oliva-why-card-copy">{children}</div>
      </div>
    </ScrollReveal>
  );
}
