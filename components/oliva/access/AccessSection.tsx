import { SectionHeader, SectionShell, ScrollReveal } from "@/components/oliva/motion";
import { ExperiencePill } from "./ExperiencePill";
import { PremiumTrialCard } from "./PremiumTrialCard";
import "./access.css";

export function AccessSection() {
  return (
    <SectionShell id="empieza" variant="sand" glow="right">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <SectionHeader
          title={
            <>
              Empieza hoy.
              <br />
              Tú decides hasta dónde llegar.
            </>
          }
          subtitle={
            <>
              <p>Descubre IngeniaFood a tu ritmo.</p>
              <p className="mt-3">
                Cuando quieras conocer todo su potencial, activa tu experiencia
                Premium de 24 horas.
              </p>
              <p className="mt-3 text-[#86736d]">
                Sin prisas.
                <br />
                Sin compromiso.
              </p>
            </>
          }
        />

        <div className="mt-16 grid items-center gap-14 sm:mt-20 lg:mt-24 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <ScrollReveal delay={80} variant="left" className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <p className="text-sm font-semibold tracking-wide text-[#556B2F]">
              Empieza gratis
            </p>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-[#53433e] sm:text-lg">
              <p>
                Explora IngeniaFood, organiza tus recetas y descubre una nueva
                forma de decidir qué cocinar cada día.
              </p>
              <p>
                Cuando quieras experimentar todas las funciones, activa tu
                acceso Premium durante 24 horas.
              </p>
              <p className="font-medium text-[#1b1c19]">
                El tiempo empieza a contar únicamente cuando tú pulses el
                botón.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={140} variant="scale" className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <PremiumTrialCard />
          </ScrollReveal>
        </div>

        <ScrollReveal
          delay={200}
          className="mx-auto mt-12 grid max-w-3xl gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:mt-16"
        >
          <ExperiencePill
            label="Free"
            description="Ideal para empezar y descubrir la aplicación."
          />
          <ExperiencePill
            label="Premium"
            description="Todas las herramientas para sacar el máximo partido a IngeniaFood."
          />
        </ScrollReveal>
      </div>
    </SectionShell>
  );
}
