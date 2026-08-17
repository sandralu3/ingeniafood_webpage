/**
 * Editorial visuals for Why section — compact, equal-height cards.
 */

const OLIVE = "#556B2F";
const OLIVE_SOFT = "rgb(85 107 47 / 0.12)";

type VisualProps = {
  className?: string;
};

/** Despensa → receta (escena de escaneo compacta) */
export function PantryToRecipeVisual({ className }: VisualProps) {
  return (
    <div
      className={`oliva-why-visual oliva-why-visual--pantry ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="oliva-why-scan-panel">
        <div className="oliva-why-scan-head">
          <span className="oliva-why-scan-icon">
            <svg viewBox="0 0 20 20" fill="none">
              <path
                d="M3 7V5a2 2 0 0 1 2-2h2M15 3h2a2 2 0 0 1 2 2v2M17 13v2a2 2 0 0 1-2 2h-2M5 17H3a2 2 0 0 1-2-2v-2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle
                cx="10"
                cy="10"
                r="2.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </span>
          <span className="oliva-why-scan-label">Escaneando</span>
          <span className="oliva-why-scan-live">En vivo</span>
        </div>

        <div className="oliva-why-scan-stage">
          <span className="oliva-why-scan-beam" />
          <div className="oliva-why-ing-grid">
            <div className="oliva-why-ing oliva-why-ing--egg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/svg/foodfriedegg_122735.svg" alt="" />
            </div>
            <div className="oliva-why-ing oliva-why-ing--tomato">
              <svg viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="22" r="13" fill="#e85a4f" />
                <circle cx="16" cy="19" r="3" fill="#ff8a82" opacity="0.55" />
                <path
                  d="M20 9c-2 0-4 2-4 4 0 1.5 1 2.5 2 3.5 1-.5 2-1 2-2.5 0-2-1.5-5-0-5z"
                  fill="#6ea84a"
                />
              </svg>
            </div>
            <div className="oliva-why-ing oliva-why-ing--broccoli">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/oliva/broccoli.png" alt="" />
            </div>
            <div className="oliva-why-ing oliva-why-ing--rice">
              <svg viewBox="0 0 40 40" fill="none">
                <ellipse cx="20" cy="24" rx="14" ry="10" fill="#f5ead6" />
                <ellipse cx="20" cy="22" rx="12" ry="8" fill="#fff8ef" />
              </svg>
            </div>
          </div>
        </div>

        <div className="oliva-why-recipe-result">
          <span className="oliva-why-recipe-spark">✦ Bowl · 12 min</span>
        </div>
      </div>
    </div>
  );
}

/** Cocina real: reloj + 12 min */
export function RealLifeVisual({ className }: VisualProps) {
  return (
    <div
      className={`oliva-why-visual oliva-why-visual--clock ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="oliva-why-clock-ring">
        <svg viewBox="0 0 88 88" className="oliva-why-clock-svg" fill="none">
          <circle
            cx="44"
            cy="44"
            r="32"
            stroke={OLIVE}
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
          <circle cx="44" cy="44" r="26" stroke={OLIVE_SOFT} strokeWidth="8" />
          <circle cx="44" cy="44" r="3" fill={OLIVE} fillOpacity="0.75" />
          <path
            className="oliva-why-clock-hand"
            d="M44 44V24"
            stroke={OLIVE}
            strokeOpacity="0.85"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M44 44l14 10"
            stroke={OLIVE}
            strokeOpacity="0.45"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="oliva-why-time-chip">
        <p className="oliva-why-time-label">Lista en</p>
        <p className="oliva-why-time-value">
          12<span>min</span>
        </p>
        <p className="oliva-why-time-note">Sin lista de la compra</p>
      </div>
    </div>
  );
}

/** Semana / rutina */
export function DailyCompanionVisual({ className }: VisualProps) {
  const days = ["L", "M", "X", "J", "V"] as const;
  const heights = [28, 40, 24, 44, 32] as const;

  return (
    <div
      className={`oliva-why-visual oliva-why-visual--week ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="oliva-why-week-card">
        <p className="oliva-why-week-label">Tu semana</p>
        <div className="oliva-why-week-bars">
          {days.map((day, i) => (
            <div key={day} className="oliva-why-week-day">
              <div
                className="oliva-why-meal"
                style={{ height: `${heights[i]}px`, opacity: 0.28 + i * 0.14 }}
              />
              <span>{day}</span>
            </div>
          ))}
        </div>
        <p className="oliva-why-week-note">Sin decidir cada día desde cero</p>
      </div>
    </div>
  );
}
