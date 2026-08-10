"use client";

import { useEffect, type RefObject } from "react";

type UseScrollParallaxOptions = {
  /** CSS custom property without dashes. Default: "parallax" → `--parallax` */
  varName?: string;
};

/**
 * Scroll-linked progress for a section: `0` while resting at the top,
 * rising toward `1` as the section scrolls upward out of view.
 */
export function useScrollParallax(
  ref: RefObject<HTMLElement | null>,
  { varName = "parallax" }: UseScrollParallaxOptions = {}
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cssVar = `--${varName}`;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty(cssVar, "0");
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight || 1;
      const raw = Math.min(1.15, Math.max(0, -rect.top / viewH));
      el.style.setProperty(cssVar, raw.toFixed(4));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, varName]);
}
