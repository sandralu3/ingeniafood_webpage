import { ScrollReveal } from "@/components/oliva/motion";

export function WhyContrastStrip() {
  return (
    <ScrollReveal delay={40} variant="scale" className="oliva-why-contrast-wrap">
      <div className="oliva-why-contrast" aria-label="Diferencia frente a otras apps">
        <div className="oliva-why-contrast-side oliva-why-contrast-side--old">
          <span className="oliva-why-contrast-label">Lo habitual</span>
          <p>Buscar una receta y luego ir de compras</p>
        </div>

        <div className="oliva-why-contrast-bridge" aria-hidden="true">
          <span className="oliva-why-contrast-dot" />
          <svg viewBox="0 0 48 12" className="oliva-why-contrast-arrow">
            <path
              d="M0 6h38M32 1l6 5-6 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="oliva-why-contrast-side oliva-why-contrast-side--new">
          <span className="oliva-why-contrast-label">IngeniaFood</span>
          <p>Empezar por lo que ya tienes en casa</p>
        </div>
      </div>
    </ScrollReveal>
  );
}
