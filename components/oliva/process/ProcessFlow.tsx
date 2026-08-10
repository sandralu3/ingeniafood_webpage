"use client";

import { CalendarDays, ChefHat, ScanLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { ScrollReveal } from "@/components/oliva/motion";
import { TryCta } from "@/components/oliva/try";
import "./process-section.css";

const INTRO_PATH = [
  { num: "01", label: "Escanea" },
  { num: "02", label: "Receta" },
  { num: "03", label: "Plan" }
] as const;

const INTRO_FLOATS: {
  Icon: LucideIcon;
  className: string;
  label: string;
}[] = [
  {
    Icon: ScanLine,
    className: "oliva-process-intro-float--a",
    label: "Escanea tu despensa"
  },
  {
    Icon: ChefHat,
    className: "oliva-process-intro-float--b",
    label: "Consigue tu receta"
  },
  {
    Icon: CalendarDays,
    className: "oliva-process-intro-float--c",
    label: "Guárdala en tu plan"
  }
];

/** Closer triad — settled steps (not the intro floats / path). */
const CLOSER_STEPS: {
  Icon: LucideIcon;
  label: string;
}[] = [
  { Icon: ScanLine, label: "Escanea" },
  { Icon: ChefHat, label: "Receta" },
  { Icon: CalendarDays, label: "Plan" }
];

const STEPS = [
  {
    number: "01",
    title: "Escanea tu despensa",
    body: "Haz una foto de tu nevera o elige lo que tienes a mano. La app entiende tus ingredientes al instante.",
    image: "/images/oliva/process/02-escaneo.png",
    alt: "Pantalla de escaneo de nevera en IngeniaFood"
  },
  {
    number: "02",
    title: "Consigue tu receta",
    body: "Te propone platos con lo que ya tienes, el tiempo que te falta y lo que necesitarías comprar.",
    image: "/images/oliva/process/03-receta.png",
    alt: "Detalle de receta generada en IngeniaFood"
  },
  {
    number: "03",
    title: "Guárdala en tu plan",
    body: "Elige el día y la comida. Sin pensarlo dos veces: de la nevera a la mesa.",
    image: "/images/oliva/process/04-plan.png",
    alt: "Programar receta en el plan semanal de IngeniaFood"
  }
] as const;

function PhoneShot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="oliva-process-phone">
      <div className="oliva-process-phone-glow" aria-hidden="true" />
      <div className="oliva-process-phone-shell">
        <div className="oliva-process-phone-screen">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 1023px) 220px, 300px"
            className="object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

const STEP_NUMBERS = ["01", "02", "03"] as const;

const WATERMARK_OPACITY = {
  mobile: 0.08,
  flightDesktop: 0.07,
  landedDesktop: 0.07
} as const;

function isDesktop() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function getFlightOpacity() {
  return isDesktop()
    ? WATERMARK_OPACITY.flightDesktop
    : WATERMARK_OPACITY.mobile;
}

function getLandedOpacity() {
  return isDesktop()
    ? WATERMARK_OPACITY.landedDesktop
    : WATERMARK_OPACITY.mobile;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function getLinearTravel(stepTop: number, viewH: number) {
  return Math.min(1, Math.max(0, 1 - stepTop / viewH));
}

function centerOf(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Resting center of an absolutely positioned child (ignores transforms). */
function restingCenter(el: HTMLElement, parentRect: DOMRect) {
  return {
    x: parentRect.left + el.offsetLeft + el.offsetWidth / 2,
    y: parentRect.top + el.offsetTop + el.offsetHeight / 2
  };
}

export function ProcessFlow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stepsRoot = stepsRef.current;
    if (!root || !stepsRoot) return;

    const introWatermarks = STEP_NUMBERS.map((_, index) =>
      root.querySelector<HTMLElement>(
        `.oliva-process-intro-watermark--${index + 1}`
      )
    );
    const stepWatermarks = STEP_NUMBERS.map((num) =>
      root.querySelector<HTMLElement>(`.oliva-process-step-watermark--${num}`)
    );
    const flyWatermarks = STEP_NUMBERS.map((num) =>
      root.querySelector<HTMLElement>(`.oliva-process-fly-wm--${num}`)
    );
    const steps = Array.from(
      stepsRoot.querySelectorAll<HTMLElement>(".oliva-process-step")
    );
    const fill = stepsRoot.querySelector<HTMLElement>(
      ".oliva-process-rail-fill"
    );
    const closer = root.querySelector<HTMLElement>(".oliva-process-closer");

    const setProgress = (el: HTMLElement, value: number) => {
      el.style.setProperty("--progress", value.toFixed(4));
    };

    const setCloserEnter = (value: number) => {
      if (!closer) return;
      closer.style.setProperty("--enter", value.toFixed(4));
    };

    const resetIntroWatermarks = () => {
      introWatermarks.forEach((el) => {
        if (el) el.style.opacity = "";
      });
    };

    const resetStepWatermarks = () => {
      stepWatermarks.forEach((el) => {
        if (!el) return;
        el.style.opacity = "0";
        el.classList.remove("is-landed");
      });
    };

    const resetFlyWatermarks = () => {
      flyWatermarks.forEach((el) => {
        if (!el) return;
        el.style.opacity = "0";
        el.style.transform = "translate3d(-9999px, -9999px, 0)";
      });
    };

    const landedOpacity = getLandedOpacity();
    const desktop = isDesktop();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      steps.forEach((step) => {
        setProgress(step, 1);
        step.style.setProperty("--depth", "0");
      });
      setCloserEnter(1);
      if (fill) fill.style.transform = "scaleY(1)";
      resetFlyWatermarks();
      stepWatermarks.forEach((el) => {
        if (!el) return;
        el.style.opacity = String(landedOpacity);
        el.classList.add("is-landed");
      });
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const viewH = window.innerHeight || 1;
      const flightOpacityNow = getFlightOpacity();
      const landedOpacityNow = getLandedOpacity();
      const flowRect = root.getBoundingClientRect();
      const stepRects = steps.map((step) => step.getBoundingClientRect());

      if (closer) {
        const closerRect = closer.getBoundingClientRect();
        const rawEnter =
          closerRect.top >= 0
            ? 1 - closerRect.top / viewH
            : 1;
        setCloserEnter(smoothstep(Math.min(1, Math.max(0, rawEnter))));
      }
      for (let i = 0; i < steps.length; i++) {
        const rect = stepRects[i];
        // Mobile: keep content fully settled; desktop keeps scrub motion
        if (!desktop) {
          setProgress(steps[i], 1);
          steps[i].style.setProperty("--depth", "0");
        } else {
          const raw =
            rect.top >= 0 ? 1 - rect.top / viewH : 1 + rect.top / viewH;
          setProgress(steps[i], smoothstep(raw));
          const depth = Math.max(-1, Math.min(1, rect.top / viewH));
          steps[i].style.setProperty("--depth", depth.toFixed(4));
        }
      }

      if (fill) {
        if (!desktop) {
          fill.style.transform = "scaleY(1)";
        } else {
          const sum = steps.reduce((acc, step) => {
            return acc + Number(step.style.getPropertyValue("--progress") || 0);
          }, 0);
          fill.style.transform = `scaleY(${Math.max(0.05, sum / steps.length)})`;
        }
      }

      const travel0 = getLinearTravel(stepRects[0]?.top ?? viewH, viewH);

      if (travel0 <= 0.01) {
        resetIntroWatermarks();
        resetStepWatermarks();
        resetFlyWatermarks();
        return;
      }

      for (let i = 0; i < STEP_NUMBERS.length; i++) {
        const introWm = introWatermarks[i];
        const stepWm = stepWatermarks[i];
        const flyWm = flyWatermarks[i];
        if (!introWm || !stepWm || !flyWm) continue;

        const travel = getLinearTravel(stepRects[i].top, viewH);
        const inView =
          stepRects[i].top < viewH * 0.92 &&
          stepRects[i].bottom > viewH * 0.08;

        if (travel <= 0.02) {
          introWm.style.opacity = "";
          stepWm.style.opacity = "0";
          stepWm.classList.remove("is-landed");
          flyWm.style.opacity = "0";
          continue;
        }

        introWm.style.opacity = "0";

        // Land earlier on mobile so the number settles with the snap
        const landAt = desktop ? 0.98 : 0.9;
        const from = centerOf(introWm.getBoundingClientRect());
        const to = restingCenter(stepWm, stepRects[i]);

        // Fly base size matches intro; grow toward step watermark size.
        // Desktop also adds ~42% so landed numbers stay clearly larger.
        const introW = Math.max(introWm.offsetWidth, 1);
        const stepW = Math.max(stepWm.offsetWidth, 1);
        const sizeRatio = stepW / introW;
        const finalScale = desktop
          ? Math.max(1.42, sizeRatio)
          : Math.max(1, sizeRatio);

        // Landed: desktop keeps the grown flyer; mobile hands off to the
        // in-step watermark so the number sits behind title/phone.
        if (travel >= landAt && inView) {
          if (desktop) {
            stepWm.style.opacity = "0";
            stepWm.classList.remove("is-landed");
            flyWm.style.opacity = String(landedOpacityNow);
            flyWm.style.transform = `translate3d(${(to.x - flowRect.left).toFixed(1)}px, ${(to.y - flowRect.top).toFixed(1)}px, 0) translate(-50%, -50%) scale(${finalScale.toFixed(4)})`;
          } else {
            flyWm.style.opacity = "0";
            stepWm.style.opacity = String(flightOpacityNow);
            stepWm.classList.add("is-landed");
          }
          continue;
        }

        stepWm.style.opacity = "0";
        stepWm.classList.remove("is-landed");

        if (!inView && travel >= landAt) {
          flyWm.style.opacity = "0";
          continue;
        }

        const scale = 1 + travel * (finalScale - 1);
        const x = lerp(from.x, to.x, travel) - flowRect.left;
        const y = lerp(from.y, to.y, travel) - flowRect.top;

        flyWm.style.opacity = String(flightOpacityNow);
        flyWm.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(4)})`;
      }
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
      resetIntroWatermarks();
      resetStepWatermarks();
      resetFlyWatermarks();
    };
  }, []);

  return (
    <div ref={rootRef} className="oliva-process-flow">
      <div className="oliva-process-fly-layer" aria-hidden="true">
        {STEP_NUMBERS.map((num) => (
          <span
            key={num}
            className={`oliva-process-fly-wm oliva-process-fly-wm--${num}`}
          >
            {num}
          </span>
        ))}
      </div>

      <div className="oliva-process-intro">
        <div className="oliva-process-intro-atmosphere" aria-hidden="true">
          <span className="oliva-process-intro-watermark oliva-process-intro-watermark--1">
            01
          </span>
          <span className="oliva-process-intro-watermark oliva-process-intro-watermark--2">
            02
          </span>
          <span className="oliva-process-intro-watermark oliva-process-intro-watermark--3">
            03
          </span>
          <div className="oliva-process-intro-drift oliva-process-intro-drift--a" />
          <div className="oliva-process-intro-drift oliva-process-intro-drift--b" />
          <svg
            className="oliva-process-intro-arc"
            viewBox="0 0 400 120"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M20 90 Q200 8 380 90"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="6 10"
              strokeLinecap="round"
            />
          </svg>
          {INTRO_FLOATS.map(({ Icon, className, label }) => (
            <span
              key={className}
              className={`oliva-process-intro-float ${className}`}
              title={label}
            >
              <Icon aria-hidden="true" />
            </span>
          ))}
        </div>

        <ScrollReveal className="oliva-process-intro-content">
          <p className="oliva-process-intro-eyebrow">Cómo funciona</p>
          <h2 className="oliva-process-intro-title">Cocinar, en tres pasos</h2>
          <p className="oliva-process-intro-subtitle">
            Sin inventar. Con lo que ya tienes en casa.
          </p>

          <ol className="oliva-process-intro-path" aria-label="Los tres pasos">
            {INTRO_PATH.map((step, index) => (
              <li key={step.num} className="oliva-process-intro-path-item">
                {index > 0 ? (
                  <span
                    className="oliva-process-intro-path-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                ) : null}
                <span className="oliva-process-intro-path-num">{step.num}</span>
                <span className="oliva-process-intro-path-label">
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </ScrollReveal>
      </div>

      <div ref={stepsRef} className="oliva-process-steps">
        <div className="oliva-process-rail" aria-hidden="true">
          <div className="oliva-process-rail-track" />
          <div className="oliva-process-rail-fill" />
        </div>

        {STEPS.map((step, index) => {
          const imageLeft = index % 2 === 1;
          const from = imageLeft ? "left" : "right";

          return (
            <article
              key={step.number}
              className="oliva-process-step"
              data-from={from}
              style={{
                ["--progress" as string]: 0,
                ["--depth" as string]: 0
              }}
            >
              <span
                className={`oliva-process-step-watermark oliva-process-step-watermark--${step.number}`}
                aria-hidden="true"
              >
                {step.number}
              </span>
              <div
                className={`oliva-process-step-grid ${
                  imageLeft ? "oliva-process-step-grid--flip" : ""
                }`}
              >
                <div className="oliva-process-step-visual">
                  <PhoneShot src={step.image} alt={step.alt} />
                </div>

                <div className="oliva-process-step-copy">
                  <p
                    className="oliva-process-step-num"
                    data-step-num={step.number}
                  >
                    Paso {step.number}
                  </p>
                  <h3 className="oliva-process-step-title">{step.title}</h3>
                  <p className="oliva-process-step-body">{step.body}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div
        className="oliva-process-closer"
        style={{ ["--enter" as string]: 0 }}
      >
        <div className="oliva-process-closer-atmosphere" aria-hidden="true">
          <div className="oliva-process-closer-drift oliva-process-closer-drift--a" />
          <div className="oliva-process-closer-drift oliva-process-closer-drift--b" />
          <div className="oliva-process-closer-drift oliva-process-closer-drift--c" />
          <span className="oliva-process-closer-mark">Listo</span>
          <div className="oliva-process-closer-ring-wrap">
            <svg
              className="oliva-process-closer-ring"
              viewBox="0 0 320 320"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="160"
                cy="160"
                r="118"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeDasharray="4 11"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <ScrollReveal className="oliva-process-closer-content">
          <p className="oliva-process-closer-eyebrow">Ya lo tienes</p>
          <h2 className="oliva-process-closer-title">
            Tres pasos.
            <br />
            Cero dudas.
          </h2>
          <p className="oliva-process-closer-sub">
            De la nevera a la mesa, sin inventar qué cocinar.
          </p>

          <ul className="oliva-process-closer-triad" aria-label="Pasos resueltos">
            {CLOSER_STEPS.map(({ Icon, label }, index) => (
              <li
                key={label}
                className={`oliva-process-closer-triad-item oliva-process-closer-triad-item--${index + 1}`}
              >
                <span className="oliva-process-closer-triad-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="oliva-process-closer-triad-label">{label}</span>
              </li>
            ))}
          </ul>

          <TryCta
            variant="primary"
            size="md"
            className="oliva-process-closer-cta"
          >
            Probar gratis
          </TryCta>
        </ScrollReveal>
      </div>
    </div>
  );
}
