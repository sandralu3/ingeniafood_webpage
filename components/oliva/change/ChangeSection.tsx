"use client";

import { useRef, type ReactNode } from "react";
import { ScrollReveal, SectionShell, useScrollParallax } from "@/components/oliva/motion";
import {
  CalendarIllustration,
  FavoritesIllustration,
  HabitsIllustration,
  PantryIllustration,
  ProgressIllustration,
  RecipesIllustration
} from "./illustrations";
import "./change.css";

type Beat = {
  title: string;
  description: string;
  illustration: ReactNode;
};

type Act = {
  phase: string;
  line: string;
  beats: Beat[];
};

const ACTS: Act[] = [
  {
    phase: "Antes",
    line: "Planifica sin fricción",
    beats: [
      {
        title: "Tu semana organizada",
        description:
          "Planifica desayunos, comidas y cenas en pocos minutos.",
        illustration: <CalendarIllustration className="oliva-change-illust-svg" />
      },
      {
        title: "Nunca vuelvas a empezar desde cero",
        description:
          "Guarda tus recetas favoritas y tenlas siempre listas para volver a prepararlas.",
        illustration: <FavoritesIllustration className="oliva-change-illust-svg" />
      }
    ]
  },
  {
    phase: "Durante",
    line: "Cocina con lo que hay",
    beats: [
      {
        title: "Cocina con lo que ya tienes",
        description:
          "Aprovecha mejor tu despensa y reduce el desperdicio de alimentos.",
        illustration: <PantryIllustration className="oliva-change-illust-svg" />
      },
      {
        title: "Descubre nuevas recetas",
        description:
          "Cada combinación de ingredientes puede convertirse en una idea diferente.",
        illustration: <RecipesIllustration className="oliva-change-illust-svg" />
      }
    ]
  },
  {
    phase: "Después",
    line: "Evoluciona con calma",
    beats: [
      {
        title: "Hábitos saludables",
        description:
          "Pequeños retos diarios para ayudarte a mantener una rutina.",
        illustration: <HabitsIllustration className="oliva-change-illust-svg" />
      },
      {
        title: "Tu progreso",
        description:
          "Observa cómo evoluciona tu alimentación con el paso del tiempo.",
        illustration: <ProgressIllustration className="oliva-change-illust-svg" />
      }
    ]
  }
];

export function ChangeSection() {
  const flowRef = useRef<HTMLDivElement>(null);

  useScrollParallax(flowRef);

  return (
    <SectionShell
      id="cambio"
      variant="paper"
      glow="none"
      align="start"
      className="oliva-change-section"
      contentClassName="oliva-change-section-inner"
    >
      <div ref={flowRef} className="oliva-change-flow">
        <header className="oliva-change-intro">
          <div className="oliva-change-intro-atmosphere" aria-hidden="true">
            <div className="oliva-change-drift oliva-change-drift--a" />
            <div className="oliva-change-drift oliva-change-drift--b" />
            <span className="oliva-change-watermark">Cocina</span>
          </div>

          <ScrollReveal
            className="oliva-change-intro-content"
            variant="fade"
          >
            <p className="oliva-change-eyebrow">Tu cocina</p>
            <h2 className="oliva-change-intro-title">
              Tu cocina cambia por completo.
            </h2>
            <p className="oliva-change-intro-sub">
              IngeniaFood te acompaña antes, durante y después de cocinar.
            </p>
          </ScrollReveal>
        </header>

        <div className="oliva-change-main">
          <div className="oliva-change-acts">
            {ACTS.map((act, actIndex) => (
              <section
                key={act.phase}
                className="oliva-change-act"
                aria-labelledby={`cambio-act-${act.phase.toLowerCase()}`}
              >
                <ScrollReveal
                  className="oliva-change-act-header"
                  variant="fade"
                  delay={40 + actIndex * 30}
                >
                  <p
                    className="oliva-change-act-phase"
                    id={`cambio-act-${act.phase.toLowerCase()}`}
                  >
                    {act.phase}
                  </p>
                  <p className="oliva-change-act-line">{act.line}</p>
                </ScrollReveal>

                <div className="oliva-change-act-beats">
                  {act.beats.map((beat, beatIndex) => {
                    const globalIndex = actIndex * 2 + beatIndex;
                    const flip = globalIndex % 2 === 1;

                    return (
                      <article
                        key={beat.title}
                        className={`oliva-change-beat ${
                          flip ? "oliva-change-beat--flip" : ""
                        }`}
                      >
                        <ScrollReveal
                          className="oliva-change-beat-visual"
                          delay={60 + actIndex * 30 + beatIndex * 40}
                          variant="fade"
                        >
                          <div className="oliva-change-illust-frame">
                            {beat.illustration}
                          </div>
                        </ScrollReveal>

                        <ScrollReveal
                          className="oliva-change-beat-copy"
                          delay={100 + actIndex * 30 + beatIndex * 40}
                          variant="fade"
                        >
                          <h3 className="oliva-change-beat-title">{beat.title}</h3>
                          <p className="oliva-change-beat-body">
                            {beat.description}
                          </p>
                        </ScrollReveal>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="oliva-change-closer">
          <div className="oliva-change-closer-atmosphere" aria-hidden="true">
            <div className="oliva-change-drift oliva-change-drift--a" />
            <div className="oliva-change-drift oliva-change-drift--b" />
            <div className="oliva-change-drift oliva-change-drift--c" />
          </div>
          <ScrollReveal
            className="oliva-change-closer-content"
            delay={60}
            variant="fade"
          >
            <p className="oliva-change-closer-title">
              Cocinar deja de ser una preocupación.
            </p>
            <p className="oliva-change-closer-sub">
              Y empieza a formar parte de tu rutina.
            </p>
          </ScrollReveal>
        </div>
      </div>
    </SectionShell>
  );
}
