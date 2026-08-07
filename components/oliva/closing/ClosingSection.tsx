import { ScrollReveal, SectionShell } from "@/components/oliva/motion";
import "./closing.css";

export function ClosingSection() {
  return (
    <SectionShell id="cerrar" variant="linen" glow="center">
      <div className="oliva-closing-glow pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-[760px] px-6 text-center lg:px-10">
        <ScrollReveal>
          <h2 className="font-sans text-3xl font-semibold leading-[1.15] tracking-tight text-[#1b1c19] sm:text-4xl lg:text-[2.75rem]">
            Nunca vuelvas a preguntarte qué cocinar.
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={80} className="mx-auto mt-8 max-w-xl space-y-5 text-base leading-relaxed text-[#53433e] sm:text-lg">
          <p>
            IngeniaFood está diseñada para ayudarte a decidir más rápido,
            aprovechar mejor lo que ya tienes en casa y disfrutar más del
            momento de cocinar.
          </p>
          <p>
            Empieza gratuitamente y, cuando quieras descubrir todo su potencial,
            activa tus 24 horas Premium.
          </p>
          <p className="font-medium text-[#1b1c19]">Tú decides cuándo.</p>
        </ScrollReveal>

        <ScrollReveal delay={140} variant="scale" className="mt-12 sm:mt-14">
          <a
            href="#empieza"
            className="oliva-closing-cta inline-flex items-center justify-center rounded-xl bg-[#8f4c35] px-9 py-4 text-base font-semibold text-white hover:bg-[#7a402d] sm:px-10 sm:text-lg"
          >
            Empieza hoy
          </a>
          <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-[#86736d]">
            Sin tarjeta de crédito.
            <br />
            Activa tus 24 horas Premium cuando tú decidas.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={180} variant="fade">
          <div
            className="mx-auto mt-20 h-px w-16 bg-[#556B2F]/15 sm:mt-24"
            aria-hidden="true"
          />
          <p className="mt-10 font-sans text-xl font-medium leading-snug tracking-tight text-[#1b1c19] sm:mt-12 sm:text-2xl lg:text-[1.65rem]">
            Menos tiempo pensando.
            <br />
            Más tiempo disfrutando.
          </p>
        </ScrollReveal>
      </div>
    </SectionShell>
  );
}
