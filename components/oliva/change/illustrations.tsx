/**
 * Minimal monocromatic illustrations — IngeniaFood identity.
 * Olive #556B2F as primary; soft opacity layers for depth.
 */

const OLIVE = "#556B2F";
const OLIVE_SOFT = "#556B2F";

type IllustProps = {
  className?: string;
};

export function FavoritesIllustration({ className }: IllustProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Soft page behind */}
      <rect
        x="18"
        y="10"
        width="40"
        height="48"
        rx="4"
        stroke={OLIVE}
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <rect
        x="22"
        y="6"
        width="40"
        height="48"
        rx="4"
        fill="#fbf9f4"
        stroke={OLIVE}
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      {/* Lines */}
      <path
        d="M30 20h24M30 28h18M30 36h22"
        stroke={OLIVE}
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Bookmark */}
      <path
        className="oliva-illust-bookmark"
        d="M52 6v22l-6-4-6 4V6"
        fill={OLIVE}
        fillOpacity="0.15"
        stroke={OLIVE}
        strokeWidth="1.5"
        strokeLinejoin="round"
        style={{ transformBox: "fill-box", transformOrigin: "center top" }}
      />
    </svg>
  );
}

export function CalendarIllustration({ className }: IllustProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="14"
        y="12"
        width="52"
        height="44"
        rx="6"
        stroke={OLIVE}
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      <path
        d="M14 24h52"
        stroke={OLIVE}
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      {/* Binders */}
      <path
        d="M26 8v8M54 8v8"
        stroke={OLIVE}
        strokeOpacity="0.55"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Day dots — one filled as “today” */}
      <circle cx="28" cy="36" r="2.5" fill={OLIVE} fillOpacity="0.2" />
      <circle
        className="oliva-illust-cal-dot"
        cx="40"
        cy="36"
        r="3.5"
        fill={OLIVE}
        fillOpacity="0.7"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <circle cx="52" cy="36" r="2.5" fill={OLIVE} fillOpacity="0.2" />
      <circle cx="28" cy="48" r="2.5" fill={OLIVE} fillOpacity="0.2" />
      <circle cx="40" cy="48" r="2.5" fill={OLIVE} fillOpacity="0.2" />
    </svg>
  );
}

export function PantryIllustration({ className }: IllustProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Tomato */}
      <g
        className="oliva-illust-ing"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <circle
          cx="28"
          cy="36"
          r="12"
          stroke={OLIVE}
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        <path
          d="M28 24c0 0 2-4 0-6"
          stroke={OLIVE}
          strokeOpacity="0.45"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      {/* Avocado half */}
      <ellipse
        className="oliva-illust-ing"
        cx="52"
        cy="38"
        rx="14"
        ry="16"
        stroke={OLIVE}
        strokeOpacity="0.4"
        strokeWidth="1.5"
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          transitionDelay: "40ms"
        }}
      />
      <ellipse
        cx="52"
        cy="38"
        rx="5"
        ry="6"
        fill={OLIVE}
        fillOpacity="0.25"
      />
      {/* Egg */}
      <ellipse
        className="oliva-illust-ing"
        cx="40"
        cy="22"
        rx="8"
        ry="10"
        stroke={OLIVE}
        strokeOpacity="0.5"
        strokeWidth="1.5"
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          transitionDelay: "80ms"
        }}
      />
    </svg>
  );
}

export function RecipesIllustration({ className }: IllustProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="26"
        y="18"
        width="36"
        height="36"
        rx="4"
        stroke={OLIVE}
        strokeOpacity="0.25"
        strokeWidth="1.5"
        transform="rotate(6 44 36)"
      />
      <rect
        className="oliva-illust-stack-2"
        x="20"
        y="14"
        width="36"
        height="36"
        rx="4"
        fill="#fbf9f4"
        stroke={OLIVE}
        strokeOpacity="0.4"
        strokeWidth="1.5"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <rect
        className="oliva-illust-stack-1"
        x="16"
        y="10"
        width="36"
        height="36"
        rx="4"
        fill="#fbf9f4"
        stroke={OLIVE}
        strokeOpacity="0.6"
        strokeWidth="1.5"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      {/* Soft image block */}
      <rect
        x="22"
        y="16"
        width="24"
        height="12"
        rx="2"
        fill={OLIVE}
        fillOpacity="0.12"
      />
      <path
        d="M22 36h20M22 42h14"
        stroke={OLIVE}
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HabitsIllustration({ className }: IllustProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="40"
        cy="32"
        r="22"
        stroke={OLIVE}
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <circle
        className="oliva-illust-check"
        cx="40"
        cy="32"
        r="16"
        fill={OLIVE}
        fillOpacity="0.1"
        stroke={OLIVE}
        strokeOpacity="0.55"
        strokeWidth="1.5"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <path
        d="M32 32.5l5.5 5.5 11-12"
        stroke={OLIVE}
        strokeOpacity="0.75"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProgressIllustration({ className }: IllustProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Axis */}
      <path
        d="M16 50h48"
        stroke={OLIVE}
        strokeOpacity="0.2"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Bars */}
      <rect
        className="oliva-illust-bar"
        x="22"
        y="34"
        width="8"
        height="16"
        rx="2"
        fill={OLIVE_SOFT}
        fillOpacity="0.25"
        style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
      />
      <rect
        className="oliva-illust-bar"
        x="36"
        y="26"
        width="8"
        height="24"
        rx="2"
        fill={OLIVE_SOFT}
        fillOpacity="0.4"
        style={{
          transformBox: "fill-box",
          transformOrigin: "bottom",
          transitionDelay: "40ms"
        }}
      />
      <rect
        className="oliva-illust-bar"
        x="50"
        y="16"
        width="8"
        height="34"
        rx="2"
        fill={OLIVE_SOFT}
        fillOpacity="0.65"
        style={{
          transformBox: "fill-box",
          transformOrigin: "bottom",
          transitionDelay: "80ms"
        }}
      />
      {/* Soft trend line */}
      <path
        d="M26 36c6-6 12-12 20-16 4-2 8-4 12-6"
        stroke={OLIVE}
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
