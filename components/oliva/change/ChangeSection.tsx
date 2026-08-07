import { SectionHeader, SectionShell, ScrollReveal } from "@/components/oliva/motion";
import { ChangeCard } from "./ChangeCard";
import {
  CalendarIllustration,
  FavoritesIllustration,
  HabitsIllustration,
  PantryIllustration,
  ProgressIllustration,
  RecipesIllustration
} from "./illustrations";
import "./change.css";

const CARDS = [
  {
    title: "Nunca vuelvas a empezar desde cero",
    description:
      "Guarda tus recetas favoritas y tenlas siempre listas para volver a prepararlas.",
    illustration: <FavoritesIllustration className="h-16 w-20" />
  },
  {
    title: "Tu semana organizada",
    description:
      "Planifica desayunos, comidas y cenas en pocos minutos.",
    illustration: <CalendarIllustration className="h-16 w-20" />
  },
  {
    title: "Cocina con lo que ya tienes",
    description:
      "Aprovecha mejor tu despensa y reduce el desperdicio de alimentos.",
    illustration: <PantryIllustration className="h-16 w-20" />
  },
  {
    title: "Descubre nuevas recetas",
    description:
      "Cada combinación de ingredientes puede convertirse en una idea diferente.",
    illustration: <RecipesIllustration className="h-16 w-20" />
  },
  {
    title: "Hábitos saludables",
    description:
      "Pequeños retos diarios para ayudarte a mantener una rutina.",
    illustration: <HabitsIllustration className="h-16 w-20" />
  },
  {
    title: "Tu progreso",
    description:
      "Observa cómo evoluciona tu alimentación con el paso del tiempo.",
    illustration: <ProgressIllustration className="h-16 w-20" />
  }
] as const;

export function ChangeSection() {
  return (
    <SectionShell id="cambio" variant="cream" glow="center" align="start">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <SectionHeader
          title="Tu cocina cambia por completo."
          subtitle="IngeniaFood te acompaña antes, durante y después de cocinar."
        />

        <div className="mt-16 grid gap-6 sm:mt-20 sm:grid-cols-2 sm:gap-7 lg:mt-24 lg:grid-cols-3 lg:gap-8">
          {CARDS.map((card, index) => (
            <ScrollReveal key={card.title} delay={index * 70} variant="scale">
              <ChangeCard
                title={card.title}
                description={card.description}
                illustration={card.illustration}
              />
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal
          className="mx-auto mt-24 max-w-3xl text-center sm:mt-28 lg:mt-32"
          delay={100}
        >
          <p className="font-sans text-3xl font-semibold leading-[1.2] tracking-tight text-[#1b1c19] sm:text-4xl lg:text-5xl">
            Cocinar deja de ser una preocupación.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-[#53433e] sm:text-xl">
            Y empieza a formar parte de tu rutina.
          </p>
        </ScrollReveal>
      </div>
    </SectionShell>
  );
}
