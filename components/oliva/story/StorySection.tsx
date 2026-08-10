import { ScrollReveal } from "@/components/oliva/motion";
import { StoryAnimation } from "./StoryAnimation";
import "./story-animation.css";

export function StorySection() {
  return (
    <section
      id="dilema"
      className="oliva-section oliva-snap-section oliva-dilema relative overflow-hidden"
    >
      <div className="oliva-dilema-atmosphere" aria-hidden="true">
        <div className="oliva-dilema-glow oliva-dilema-glow--a" />
        <div className="oliva-dilema-glow oliva-dilema-glow--b" />
        <div className="oliva-dilema-grain" />
      </div>

      <div className="oliva-snap-inner relative z-[1]">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
          <div className="mx-auto w-full max-w-[560px] lg:mx-0">
            <ScrollReveal delay={0} variant="up">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e9967a] sm:text-xs">
                El dilema
              </p>
            </ScrollReveal>

            <ScrollReveal delay={60} variant="up">
              <h2 className="mt-4 font-sans text-3xl font-semibold leading-[1.12] tracking-tight text-[#fbf9f4] sm:text-4xl lg:text-[2.75rem]">
                Llegas a casa.
                <br />
                Abres la nevera.
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={120} variant="up">
              <ul className="mt-7 space-y-1.5 text-base leading-relaxed text-[#d5d0c4] sm:text-lg">
                <li>Hay huevos.</li>
                <li>Un tomate.</li>
                <li>Un aguacate.</li>
                <li>Un poco de queso.</li>
              </ul>
            </ScrollReveal>

            <ScrollReveal delay={180} variant="scale">
              <p className="mt-9 font-sans text-3xl font-semibold leading-snug tracking-tight text-[#e9967a] sm:text-4xl">
                ¿Qué cocino hoy?
              </p>
            </ScrollReveal>

            <ScrollReveal delay={240} variant="up">
              <div className="mt-7 max-w-md space-y-3 text-base leading-relaxed text-[#c4beb2] sm:text-lg">
                <p>
                  Otra vez la misma pregunta. El cansancio. Los minutos que se
                  van mirando sin decidir.
                </p>
                <p>Y al final, casi siempre, lo de siempre.</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300} variant="fade">
              <div className="mt-10">
                <p className="text-base font-medium text-[#fbf9f4] sm:text-lg">
                  Hay otra forma de empezar.
                </p>
                <a
                  href="#proceso"
                  className="mt-3 inline-flex text-sm font-medium text-[#e9967a] underline-offset-4 transition-colors hover:text-[#f5b49a] hover:underline"
                >
                  Ver cómo funciona
                </a>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal
            variant="left"
            delay={100}
            className="flex w-full justify-center lg:justify-end"
          >
            <StoryAnimation />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
