import { PhoneMockup } from "@/components/oliva/PhoneMockup";
import { TryCta } from "@/components/oliva/try";
import "./hero.css";

export function Hero() {
  return (
    <section
      id="inicio"
      className="oliva-snap-section oliva-snap-section--start relative overflow-hidden bg-[#fbf9f4] text-[#1b1c19]"
    >
      <div className="oliva-hero-glow pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="oliva-hero-atmosphere" aria-hidden="true">
        <div className="oliva-hero-drift oliva-hero-drift--a" />
        <div className="oliva-hero-drift oliva-hero-drift--b" />
        <div className="oliva-hero-drift oliva-hero-drift--c" />
        <div className="oliva-hero-grain" />
      </div>

      {/* Spacer for fixed header */}
      <div className="relative z-[1] h-[4.5rem] shrink-0 lg:h-[5.25rem]" aria-hidden="true" />

      <div className="oliva-snap-inner relative z-[1] flex flex-1 flex-col !pt-0 !pb-16 sm:!pb-20">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 lg:px-10">
          <div className="grid items-center gap-12 lg:grid-cols-[10fr_12fr] lg:gap-10 xl:gap-14">
            {/* Copy — brand, one idea, one action */}
            <div className="flex w-full max-w-[520px] flex-col items-start lg:max-w-none">
              <p
                className="oliva-hero-enter text-base tracking-[0.04em] lg:text-lg"
                style={{ ["--hero-delay" as string]: "0ms" }}
              >
                <span className="font-light text-[#444444]">Ingenia</span>
                <span className="font-bold text-[#556B2F]">Food</span>
              </p>

              <p
                className="oliva-hero-enter mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[#556B2F]/75 sm:text-xs"
                style={{ ["--hero-delay" as string]: "60ms" }}
              >
                Lista en minutos
              </p>

              <h1
                className="oliva-hero-enter mt-3 font-sans text-4xl font-semibold leading-[1.08] tracking-tight text-[#1b1c19] sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem]"
                style={{ ["--hero-delay" as string]: "100ms" }}
              >
                Nunca vuelvas a preguntarte qué cocinar.
              </h1>

              <p
                className="oliva-hero-enter mt-5 max-w-md text-base leading-relaxed text-[#53433e] sm:text-lg"
                style={{ ["--hero-delay" as string]: "180ms" }}
              >
                Abre la nevera. Nosotros encontramos qué preparar.
              </p>

              <div
                className="oliva-hero-enter mt-9 flex flex-col items-start gap-4 sm:mt-10"
                style={{ ["--hero-delay" as string]: "260ms" }}
              >
                <TryCta
                  variant="primary"
                  size="md"
                  className="oliva-hero-cta px-9 py-4 text-base sm:text-lg"
                >
                  Probar gratis
                </TryCta>
                <a
                  href="#proceso"
                  className="text-sm font-medium text-[#556B2F] underline-offset-4 transition-colors hover:text-[#8f4c35] hover:underline"
                >
                  Ver cómo funciona
                </a>
              </div>

              <p
                className="oliva-hero-enter mt-5 max-w-xs text-sm leading-relaxed text-[#86736d]"
                style={{ ["--hero-delay" as string]: "340ms" }}
              >
                24 h Premium cuando tú quieras
              </p>
            </div>

            {/* Product — phone + orbiting ingredients */}
            <div className="oliva-hero-stage flex justify-center lg:justify-end">
              <div
                className="oliva-hero-phone-glow"
                aria-hidden="true"
              />
              <div className="oliva-hero-phone-enter">
                <PhoneMockup className="w-[min(100%,380px)] sm:w-[400px] lg:w-[440px]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <a
        href="#dilema"
        className="oliva-hero-scroll-hint"
        aria-label="Seguir descubriendo"
      >
        <span>Descubre</span>
        <svg
          className="oliva-hero-scroll-chevron"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </section>
  );
}
