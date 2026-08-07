/**
 * Editorial visuals for Why section — monocromatic, olive identity.
 */

const OLIVE = "#556B2F";

type VisualProps = {
  className?: string;
};

/** Despensa → receta */
export function PantryToRecipeVisual({ className }: VisualProps) {
  return (
    <div
      className={`flex flex-col items-center gap-5 ${className ?? ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 100" className="h-auto w-full max-w-[280px]" fill="none">
        {/* Shelf */}
        <path
          d="M20 72h160"
          stroke={OLIVE}
          strokeOpacity="0.25"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Jars / ingredients on shelf */}
        <rect
          x="36"
          y="42"
          width="22"
          height="30"
          rx="3"
          stroke={OLIVE}
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
        <rect
          x="68"
          y="36"
          width="20"
          height="36"
          rx="3"
          stroke={OLIVE}
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        <ellipse
          cx="112"
          cy="58"
          rx="14"
          ry="14"
          stroke={OLIVE}
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <rect
          x="136"
          y="40"
          width="24"
          height="32"
          rx="4"
          stroke={OLIVE}
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
        <path
          d="M42 52h10M74 48h8M142 52h12"
          stroke={OLIVE}
          strokeOpacity="0.25"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>

      <div className="oliva-why-arrow flex flex-col items-center text-[#556B2F]">
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
          <path
            d="M8 2v14M3 12l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Recipe result */}
      <div className="w-full max-w-[200px] rounded-xl border border-[#556B2F]/30 bg-[#fffcf7] p-4 shadow-[0_4px_20px_rgb(27_28_25/0.04)]">
        <div className="mb-3 h-16 rounded-lg bg-[#556B2F]/10" />
        <div className="h-2 w-3/4 rounded-full bg-[#556B2F]/25" />
        <div className="mt-2 h-2 w-1/2 rounded-full bg-[#556B2F]/15" />
        <p className="mt-3 text-[11px] font-medium tracking-wide text-[#556B2F]/80">
          Bowl Mediterráneo · 12 min
        </p>
      </div>
    </div>
  );
}

/** Cocina real: reloj + 12 min */
export function RealLifeVisual({ className }: VisualProps) {
  return (
    <div
      className={`flex items-center justify-center gap-8 sm:gap-10 ${className ?? ""}`}
      aria-hidden="true"
    >
      {/* Clock */}
      <svg viewBox="0 0 80 64" className="h-20 w-24 shrink-0" fill="none">
        <circle
          cx="40"
          cy="32"
          r="24"
          stroke={OLIVE}
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <circle cx="40" cy="32" r="2" fill={OLIVE} fillOpacity="0.6" />
        <path
          className="oliva-why-clock-hand"
          d="M40 32V16"
          stroke={OLIVE}
          strokeOpacity="0.7"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M40 32l10 8"
          stroke={OLIVE}
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Compact recipe chip */}
      <div className="rounded-2xl border border-[#556B2F]/25 bg-[#fffcf7] px-5 py-4 text-left shadow-[0_4px_20px_rgb(27_28_25/0.04)]">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#556B2F]/60">
          Lista en
        </p>
        <p className="mt-1 font-sans text-3xl font-semibold tracking-tight text-[#1b1c19]">
          12<span className="ml-1 text-lg font-medium text-[#53433e]">min</span>
        </p>
        <p className="mt-2 text-sm text-[#53433e]">Sin lista de la compra</p>
      </div>
    </div>
  );
}

/** Semana / rutina */
export function DailyCompanionVisual({ className }: VisualProps) {
  const days = ["L", "M", "X", "J", "V"] as const;
  const heights = ["h-8", "h-11", "h-7", "h-12", "h-9"] as const;

  return (
    <div
      className={`w-full max-w-[280px] ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="rounded-2xl border border-[#556B2F]/20 bg-[#fffcf7] p-5 shadow-[0_4px_20px_rgb(27_28_25/0.04)]">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[#556B2F]/55">
          Tu semana
        </p>
        <div className="flex items-end justify-between gap-2">
          {days.map((day, i) => (
            <div key={day} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={`oliva-why-meal w-full rounded-md bg-[#556B2F] ${heights[i]}`}
                style={{ opacity: 0.2 + i * 0.12 }}
              />
              <span className="text-[11px] font-medium text-[#53433e]">{day}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-[#53433e]/80">
          Una rutina, sin decidir cada día desde cero
        </p>
      </div>
    </div>
  );
}
