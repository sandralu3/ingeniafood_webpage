import { ScrollReveal, SectionShell } from "@/components/oliva/motion";
import { FounderQuote } from "./FounderQuote";
import { WhyAtmosphere } from "./WhyAtmosphere";
import { WhyContrastStrip } from "./WhyContrastStrip";
import { WhyPillarCard } from "./WhyPillarCard";
import {
  DailyCompanionVisual,
  PantryToRecipeVisual,
  RealLifeVisual
} from "./WhyVisuals";
import "./why.css";

export function WhySection() {
  return (
    <SectionShell
      id="por-que"
      variant="paper"
      glow="none"
      divider
      align="start"
      className="oliva-why-section"
      contentClassName="oliva-why-inner"
    >
      <WhyAtmosphere />

      <div className="oliva-why-content mx-auto max-w-6xl px-5 sm:px-6 lg:px-10">
        <ScrollReveal className="oliva-why-header mx-auto max-w-3xl text-center">
          <p className="oliva-why-eyebrow">Por qué IngeniaFood</p>
          <h2 className="oliva-why-title">
            Más que recetas. Una forma más inteligente de cocinar.
          </h2>
          <p className="oliva-why-subtitle">
            IngeniaFood no empieza con una receta. Empieza contigo, con tu
            despensa y con tu día.
          </p>
        </ScrollReveal>

        <div className="oliva-why-intro-extra">
          <WhyContrastStrip />
        </div>

        <div className="oliva-why-bento">
          <WhyPillarCard
            index="01"
            title="Tu despensa es el punto de partida."
            visual={<PantryToRecipeVisual />}
            delay={60}
          >
            <p>
              En la mayoría de apps buscas una receta. Aquí empiezas por lo que
              ya tienes.
            </p>
          </WhyPillarCard>

          <WhyPillarCard
            index="02"
            title="Pensada para la vida real."
            visual={<RealLifeVisual />}
            delay={100}
          >
            <p>
              Sin ingredientes difíciles ni horas de cocina.{" "}
              <span className="oliva-why-card-highlight">
                Solo abrir y empezar.
              </span>
            </p>
          </WhyPillarCard>

          <WhyPillarCard
            index="03"
            title="Te acompaña cada día."
            visual={<DailyCompanionVisual />}
            delay={140}
          >
            <p>
              No es un recetario: se adapta a ti y convierte la cocina en un
              hábito sencillo.
            </p>
          </WhyPillarCard>
        </div>

        <div className="oliva-why-founder-wrap">
          <FounderQuote />
        </div>
      </div>
    </SectionShell>
  );
}
