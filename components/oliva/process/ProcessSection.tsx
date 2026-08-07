import { SectionHeader, SectionShell, ScrollReveal } from "@/components/oliva/motion";
import { AIAnalyzer } from "./AIAnalyzer";
import { IngredientCloud } from "./IngredientCloud";
import { RecipeCard } from "./RecipeCard";
import { WeeklyPlanner } from "./WeeklyPlanner";
import "./process-animation.css";

const STEPS = [
  {
    label: "Elige tus ingredientes",
    labelClass: "oliva-process-label-1",
    visual: <IngredientCloud />
  },
  {
    label: "Escaneo IA",
    labelClass: "oliva-process-label-2",
    visual: <AIAnalyzer />
  },
  {
    label: "Receta",
    labelClass: "oliva-process-label-3",
    visual: <RecipeCard />
  },
  {
    label: "Plan semanal",
    labelClass: "oliva-process-label-4",
    visual: <WeeklyPlanner />
  }
] as const;

const BENEFITS = [
  "Ahorra tiempo todos los días",
  "Aprovecha lo que ya tienes",
  "Come mejor sin complicarte"
] as const;

export function ProcessSection() {
  return (
    <SectionShell id="proceso" variant="sand" glow="left" align="start">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <SectionHeader
          title="Así de fácil es cocinar con IngeniaFood"
          subtitle="Solo necesitas abrir la aplicación. Nosotros nos encargamos del resto."
        />

        <div className="mt-20 lg:mt-28">
          <div className="grid gap-20 md:grid-cols-2 md:gap-x-12 md:gap-y-24 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-0">
            {STEPS.map((step, index) => (
              <ScrollReveal
                key={step.label}
                delay={index * 90}
                variant="scale"
                className="flex flex-col items-center text-center"
              >
                <p
                  className={`${step.labelClass} mb-10 text-sm font-semibold tracking-wide sm:text-base`}
                >
                  {step.label}
                </p>
                <div className="w-full">{step.visual}</div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        <ScrollReveal
          className="mx-auto mt-28 max-w-3xl text-center sm:mt-32 lg:mt-36"
          variant="up"
          delay={80}
        >
          <p className="font-sans text-3xl font-semibold leading-[1.2] tracking-tight text-[#1b1c19] sm:text-4xl lg:text-5xl">
            Menos decisiones.
          </p>
          <p className="mt-3 font-sans text-3xl font-semibold leading-[1.2] tracking-tight text-[#1b1c19] sm:text-4xl lg:text-5xl">
            Más tiempo disfrutando.
          </p>
        </ScrollReveal>

        <div className="mx-auto mt-16 grid max-w-3xl gap-12 text-center sm:mt-20 sm:grid-cols-3 sm:gap-10">
          {BENEFITS.map((benefit, index) => (
            <ScrollReveal key={benefit} delay={120 + index * 60} variant="fade">
              <p className="text-base font-medium leading-snug text-[#53433e]">
                {benefit}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
