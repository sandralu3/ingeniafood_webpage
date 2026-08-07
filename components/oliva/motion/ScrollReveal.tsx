"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode
} from "react";
import { cn } from "@/lib/utils";

type RevealVariant = "up" | "scale" | "fade" | "left" | "right";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
  variant?: RevealVariant;
  once?: boolean;
};

function isElementInView(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewHeight * 0.95 && rect.bottom > 0;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  variant = "up",
  once = true
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => {
      el.classList.add("oliva-revealed");
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      return;
    }

    // Already visible on mount (snap sections / first paint)
    if (isElementInView(el)) {
      reveal();
      if (once) return;
    }

    let observer: IntersectionObserver | null = null;

    try {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            reveal();
            if (once) observer?.disconnect();
          } else if (!once) {
            el.classList.remove("oliva-revealed");
          }
        },
        { threshold: 0.08, rootMargin: "0px 0px -2% 0px" }
      );
      observer.observe(el);
    } catch {
      reveal();
    }

    // Safety net: never leave content permanently invisible
    // (e.g. broken observers / unusual scroll containers via tunnels)
    const fallback = window.setTimeout(() => {
      if (!el.classList.contains("oliva-revealed") && isElementInView(el)) {
        reveal();
      }
    }, 1200);

    const hardFallback = window.setTimeout(() => {
      if (!el.classList.contains("oliva-revealed")) {
        reveal();
      }
    }, 4000);

    return () => {
      observer?.disconnect();
      window.clearTimeout(fallback);
      window.clearTimeout(hardFallback);
    };
  }, [once]);

  return (
    <Tag
      // @ts-expect-error — polymorphic ref
      ref={ref}
      className={cn(
        "oliva-scroll-reveal",
        `oliva-scroll-reveal--${variant}`,
        className
      )}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
