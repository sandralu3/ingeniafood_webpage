import { ScrollReveal } from "@/components/oliva/motion";

export function FounderQuote() {
  return (
    <ScrollReveal delay={80} variant="scale">
      <figure className="mx-auto max-w-2xl text-center">
        <blockquote>
          <p className="font-headline text-xl leading-relaxed text-[#1b1c19] sm:text-2xl sm:leading-relaxed [font-family:var(--font-family-headline),Georgia,serif]">
            &ldquo;Creé IngeniaFood porque yo también terminaba el día mirando la
            nevera sin saber qué cocinar. Quería una herramienta que me ayudara a
            decidir en segundos, sin complicarme.&rdquo;
          </p>
        </blockquote>
        <figcaption className="mt-8">
          <p className="font-sans text-base font-semibold text-[#1b1c19]">
            Sandra Vergara
          </p>
          <p className="mt-1 text-sm text-[#53433e]">Fundadora de IngeniaFood</p>
        </figcaption>
      </figure>
    </ScrollReveal>
  );
}
