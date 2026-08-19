"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import type { OnboardingPage } from "@/lib/onboarding/onboarding-state";
import {
  isOnboardingCompleted,
  markOnboardingCompleted
} from "@/lib/onboarding/onboarding-state";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding/onboarding-steps";
import { cn } from "@/lib/utils";

type Props = {
  page: OnboardingPage;
  /** Delay ms before starting (lets page content render). */
  delayMs?: number;
};

type SpotlightRect = { top: number; left: number; width: number; height: number };

function resolvePosition(
  step: OnboardingStep,
  rect: SpotlightRect | null
): React.CSSProperties {
  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "min(340px, 90vw)"
    };
  }

  const pos = step.position ?? "bottom";
  const gap = 14;
  const base: React.CSSProperties = {
    maxWidth: "min(320px, 85vw)",
    position: "absolute"
  };

  if (pos === "bottom") {
    const maxTooltipWidth = Math.min(320, window.innerWidth * 0.85);
    const half = maxTooltipWidth / 2;
    const desiredCenterX = rect.left + rect.width / 2;
    const clampedCenterX = Math.max(16 + half, Math.min(desiredCenterX, window.innerWidth - 16 - half));
    return {
      ...base,
      top: rect.top + rect.height + gap,
      left: clampedCenterX,
      transform: "translateX(-50%)"
    };
  }
  if (pos === "top") {
    const maxTooltipWidth = Math.min(320, window.innerWidth * 0.85);
    const half = maxTooltipWidth / 2;
    const desiredCenterX = rect.left + rect.width / 2;
    const clampedCenterX = Math.max(16 + half, Math.min(desiredCenterX, window.innerWidth - 16 - half));
    return {
      ...base,
      bottom: window.innerHeight - rect.top + gap,
      left: clampedCenterX,
      transform: "translateX(-50%)"
    };
  }
  if (pos === "right") {
    return { ...base, top: rect.top, left: rect.left + rect.width + gap };
  }
  return { ...base, top: rect.top, right: window.innerWidth - rect.left + gap };
}

function SpotlightSVG({ rect }: { rect: SpotlightRect | null }) {
  if (!rect) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[998] bg-black/55 transition-opacity duration-300" />
    );
  }

  const pad = 8;
  const r = 16;
  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[998] h-full w-full transition-opacity duration-300"
      aria-hidden
    >
      <defs>
        <mask id="ob-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={r} ry={r} fill="black" />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.55)"
        mask="url(#ob-mask)"
      />
    </svg>
  );
}

export function OnboardingOverlay({ page, delayMs = 600 }: Props) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [fadeIn, setFadeIn] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = ONBOARDING_STEPS[page];
  const step = steps[stepIndex] as OnboardingStep | undefined;
  const isLast = stepIndex >= steps.length - 1;

  useEffect(() => {
    if (isOnboardingCompleted(page)) return;
    timeoutRef.current = setTimeout(() => {
      setActive(true);
      setFadeIn(true);
    }, delayMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [page, delayMs]);

  const updateSpotlight = useCallback(() => {
    if (!step) return;
    if (!step.targetSelector) {
      setSpotlightRect(null);
      setTooltipStyle(resolvePosition(step, null));
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      setSpotlightRect(null);
      setTooltipStyle(resolvePosition(step, null));
      return;
    }
    const r = el.getBoundingClientRect();
    const rect = { top: r.top, left: r.left, width: r.width, height: r.height };
    setSpotlightRect(rect);
    setTooltipStyle(resolvePosition(step, rect));
  }, [step]);

  useEffect(() => {
    if (!active || !step) return;
    updateSpotlight();

    // El target puede aparecer tarde (data async) o tras un click (menús).
    // Reintentamos un breve periodo para que tooltip + spotlight se re-ancoren.
    const hasTargetSelector = Boolean(step.targetSelector);
    let attempts = 0;
    const maxAttempts = 12; // ~3s con intervalo 250ms
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (hasTargetSelector && step.targetSelector) {
      const tryScrollIntoView = () => {
        const el = document.querySelector(step.targetSelector!);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const padding = 110;
        const isOffscreen =
          r.top < padding || r.bottom > window.innerHeight - padding;

        if (isOffscreen) {
          // Centra el target para que el tooltip (y el foco) se vean bien.
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      };

      // Primer intento (cuando el target ya exista).
      tryScrollIntoView();

      intervalId = setInterval(() => {
        attempts += 1;
        const el = document.querySelector(step.targetSelector!);
        if (!el) {
          if (attempts >= maxAttempts) {
            if (intervalId) clearInterval(intervalId);
          }
          return;
        }

        // Ya existe el elemento: re-calcamos posición y paramos.
        updateSpotlight();
        // Si en ese momento sigue fuera de viewport, lo centramos.
        tryScrollIntoView();
        if (intervalId) clearInterval(intervalId);
      }, 250);
    }

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
      if (intervalId) clearInterval(intervalId);
    };
  }, [active, step, stepIndex, updateSpotlight]);

  const close = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setActive(false);
      markOnboardingCompleted(page);
    }, 250);
  }, [page]);

  const next = useCallback(() => {
    if (isLast) {
      close();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [isLast, close]);

  if (!active || !step) return null;

  return (
    <>
      <SpotlightSVG rect={spotlightRect} />

      {/* Tap backdrop to advance */}
      <div
        className={cn(
          "fixed inset-0 z-[999] transition-opacity duration-300",
          fadeIn ? "opacity-100" : "opacity-0"
        )}
        onClick={next}
        aria-hidden
      />

      {/* Tooltip card */}
      <div
        className={cn(
          "fixed z-[1000] rounded-2xl border border-white/20 bg-white px-5 py-4 shadow-2xl shadow-black/20 transition-all duration-300",
          fadeIn ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
        style={tooltipStyle}
        role="dialog"
        aria-label="Guía de inicio"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          className="absolute right-2 top-2 rounded-full p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          aria-label="Cerrar guía"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="pr-6 text-[15px] font-bold leading-snug text-stone-900">
          {step.title}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">
          {step.description}
        </p>

        <div className="mt-3 flex items-center justify-between">
          {/* Step dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === stepIndex
                    ? "w-5 bg-[#4C6B3F]"
                    : i < stepIndex
                      ? "w-1.5 bg-[#4C6B3F]/40"
                      : "w-1.5 bg-stone-300"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="inline-flex items-center gap-1 rounded-full bg-[#4C6B3F] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            {isLast ? "¡Empezar!" : "Siguiente"}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </>
  );
}
