import { ScrollReveal, SectionShell } from "@/components/oliva/motion";
import { ExperiencePill } from "./ExperiencePill";
import { PremiumTrialCard } from "./PremiumTrialCard";
import "./access.css";

export function AccessSection() {
  return (
    <SectionShell
      id="empieza"
      variant="sand"
      glow="none"
      className="oliva-access-section"
      contentClassName="oliva-access-inner"
    >
      <div className="oliva-access-atmosphere" aria-hidden="true">
        <div className="oliva-access-drift oliva-access-drift--a" />
        <div className="oliva-access-drift oliva-access-drift--b" />
      </div>

      <div className="oliva-access-content mx-auto max-w-6xl px-5 sm:px-6 lg:px-10">
        <ScrollReveal className="oliva-access-header text-center">
          <p className="oliva-access-eyebrow">Empieza hoy</p>
          <h2 className="oliva-access-title">
            Empieza hoy.
            <br />
            Tú decides hasta dónde llegar.
          </h2>
          <p className="oliva-access-subtitle">
            Descubre IngeniaFood a tu ritmo. Cuando quieras, activa tu
            experiencia Premium de 24 horas — sin prisas, sin compromiso.
          </p>
        </ScrollReveal>

        <div className="oliva-access-grid">
          <ScrollReveal
            delay={60}
            variant="left"
            className="oliva-access-copy"
          >
            <p className="oliva-access-kicker">Empieza gratis</p>
            <div className="oliva-access-copy-body">
              <p>
                Explora IngeniaFood, organiza tus recetas y descubre una nueva
                forma de decidir qué cocinar cada día.
              </p>
              <p>
                Cuando quieras experimentar todas las funciones, activa tu
                acceso Premium durante 24 horas.
              </p>
              <p className="oliva-access-copy-emphasis">
                El tiempo empieza a contar únicamente cuando tú pulses el
                botón.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal
            delay={100}
            variant="scale"
            className="oliva-access-card-wrap"
          >
            <PremiumTrialCard />
          </ScrollReveal>
        </div>

        <ScrollReveal delay={140} className="oliva-access-pills">
          <ExperiencePill
            label="Free"
            description="Ideal para empezar y descubrir la aplicación."
          />
          <ExperiencePill
            label="Premium"
            description="Todas las herramientas para sacar el máximo partido."
          />
        </ScrollReveal>
      </div>
    </SectionShell>
  );
}
