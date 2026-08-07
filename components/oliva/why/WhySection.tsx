import { SectionHeader, SectionShell } from "@/components/oliva/motion";
import { FounderQuote } from "./FounderQuote";
import { WhyBlock } from "./WhyBlock";
import {
  DailyCompanionVisual,
  PantryToRecipeVisual,
  RealLifeVisual
} from "./WhyVisuals";
import "./why.css";

export function WhySection() {
  return (
    <SectionShell id="por-que" variant="paper" glow="right" divider align="start">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <SectionHeader
          title="Más que recetas. Una forma más inteligente de cocinar."
          subtitle="IngeniaFood no empieza con una receta. Empieza contigo, con tu despensa y con tu día."
        />

        <div className="mt-20 space-y-28 sm:mt-24 lg:mt-32 lg:space-y-36">
          <WhyBlock
            title="Tu despensa es el punto de partida."
            visual={<PantryToRecipeVisual />}
            delay={0}
          >
            <p>En la mayoría de aplicaciones buscas una receta.</p>
            <p>
              En IngeniaFood empiezas por los ingredientes que ya tienes.
            </p>
          </WhyBlock>

          <WhyBlock
            title="Pensada para la vida real."
            visual={<RealLifeVisual />}
            reverse
            delay={60}
          >
            <p>No necesitas ingredientes difíciles.</p>
            <p>No necesitas dedicar horas a cocinar.</p>
            <p>No necesitas planificar con días de antelación.</p>
            <p className="font-medium text-[#1b1c19]">
              Solo abrir la aplicación y empezar.
            </p>
          </WhyBlock>

          <WhyBlock
            title="Te acompaña cada día."
            visual={<DailyCompanionVisual />}
            delay={120}
          >
            <p>No es un recetario.</p>
            <p>No es un buscador.</p>
            <p>
              Es una aplicación que se adapta a tus preferencias y te ayuda a
              convertir la cocina en un hábito más sencillo.
            </p>
          </WhyBlock>
        </div>

        <div className="relative mt-28 sm:mt-32 lg:mt-40">
          <div
            className="mx-auto mb-12 h-px w-16 bg-[#d9d2c4]"
            aria-hidden="true"
          />
          <FounderQuote />
        </div>
      </div>
    </SectionShell>
  );
}
