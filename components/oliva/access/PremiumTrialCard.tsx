import { TryCta } from "@/components/oliva/try";

const BENEFITS = [
  "Todas las funciones disponibles",
  "Escáner inteligente",
  "Planificador semanal",
  "Funciones Premium"
] as const;

export function PremiumTrialCard() {
  return (
    <div className="relative">
      <div
        className="oliva-access-glow pointer-events-none absolute -inset-10 sm:-inset-14"
        aria-hidden="true"
      />

      <article className="oliva-access-card relative overflow-hidden rounded-2xl border border-[#e0d9cc] bg-[#fffcf7] p-8 sm:p-9">
        <span className="oliva-access-badge inline-flex items-center rounded-full border border-[#556B2F]/25 bg-[#556B2F]/[0.07] px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-[#556B2F]">
          Premium Experience
        </span>

        <h3 className="mt-5 font-sans text-2xl font-semibold leading-snug tracking-tight text-[#1b1c19] sm:text-[1.65rem]">
          24 horas para descubrir todo IngeniaFood
        </h3>

        <ul className="mt-7 space-y-3.5">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-3 text-[0.9375rem] leading-snug text-[#53433e]"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[#556B2F]"
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 8.5l3 3 6-7"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        <TryCta className="oliva-access-cta mt-8 w-full" variant="primary" size="md">
          Activar cuando yo quiera
        </TryCta>

        <div className="mt-5 space-y-1 text-center text-sm leading-relaxed text-[#86736d]">
          <p>No necesitas tarjeta de crédito.</p>
          <p>La prueba solo comienza cuando tú decidas.</p>
        </div>
      </article>
    </div>
  );
}
