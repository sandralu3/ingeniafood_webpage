/**
 * Colored illustrations for Tu cocina — vivid flat palette
 * (orange / yellow / coral / green) to match food & chart icons.
 * Idle micro-motion classes: oliva-illust-* (driven by change.css).
 */

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
      <rect
        x="18"
        y="10"
        width="40"
        height="48"
        rx="5"
        fill="#ffb347"
        stroke="#f09a2a"
        strokeWidth="1.5"
      />
      <rect
        x="22"
        y="6"
        width="40"
        height="48"
        rx="5"
        fill="#fff8ef"
        stroke="#ffd54f"
        strokeWidth="1.75"
      />
      <path
        d="M30 20h24M30 28h18M30 36h22"
        stroke="#ff7a3d"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        className="oliva-illust-bookmark"
        d="M52 6v22l-6-4-6 4V6"
        fill="#ff3d5a"
        stroke="#e02545"
        strokeWidth="1.5"
        strokeLinejoin="round"
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
      {/* Body */}
      <rect
        x="17"
        y="12"
        width="46"
        height="44"
        rx="8"
        fill="#fff8ef"
        stroke="#ffd54f"
        strokeWidth="1.75"
      />
      {/* Header */}
      <path
        d="M17 20c0-4.4 3.6-8 8-8h30c4.4 0 8 3.6 8 8v4H17v-4z"
        fill="#ff7a3d"
      />
      {/* Rings */}
      <rect x="28" y="6" width="4" height="12" rx="2" fill="#ffd54f" />
      <rect x="48" y="6" width="4" height="12" rx="2" fill="#ffd54f" />
      {/* Day cells — extra space below */}
      <rect x="24" y="29" width="8" height="8" rx="2" fill="#ffb347" />
      <rect
        className="oliva-illust-cal-dot"
        x="36"
        y="29"
        width="8"
        height="8"
        rx="2"
        fill="#ffb347"
      />
      <rect x="48" y="29" width="8" height="8" rx="2" fill="#ffb347" />
      <rect x="24" y="40" width="8" height="8" rx="2" fill="#ffb347" />
      <rect x="36" y="40" width="8" height="8" rx="2" fill="#ffb347" />
      <rect x="48" y="40" width="8" height="8" rx="2" fill="#ffb347" />
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
      <image
        className="oliva-illust-ing oliva-illust-pan"
        href="/images/oliva/frying-pan.png"
        x="14"
        y="12"
        width="40"
        height="40"
        preserveAspectRatio="xMidYMid meet"
      />
      <image
        className="oliva-illust-ing oliva-illust-egg"
        href="/svg/foodfriedegg_122735.svg"
        x="34"
        y="22"
        width="26"
        height="26"
        preserveAspectRatio="xMidYMid meet"
      />
      <image
        className="oliva-illust-ing oliva-illust-broccoli"
        href="/images/oliva/broccoli.png"
        x="44"
        y="6"
        width="24"
        height="24"
        preserveAspectRatio="xMidYMid meet"
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
      <g transform="translate(6, 0)">
        <rect
          x="26"
          y="18"
          width="36"
          height="36"
          rx="5"
          fill="#ffb347"
          stroke="#f09a2a"
          strokeWidth="1.5"
          transform="rotate(6 44 36)"
        />
        <rect
          className="oliva-illust-stack-2"
          x="20"
          y="14"
          width="36"
          height="36"
          rx="5"
          fill="#ff7a3d"
          stroke="#e85f20"
          strokeWidth="1.5"
        />
        <rect
          className="oliva-illust-stack-1"
          x="16"
          y="10"
          width="36"
          height="36"
          rx="5"
          fill="#fff8ef"
          stroke="#ffd54f"
          strokeWidth="1.75"
        />
        <rect x="22" y="16" width="24" height="12" rx="2.5" fill="#ff3d5a" />
        <path
          d="M22 36h20M22 42h14"
          stroke="#ff7a3d"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
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
      <circle cx="40" cy="32" r="22" fill="#ffd54f" fillOpacity="0.35" />
      <circle
        cx="40"
        cy="32"
        r="22"
        stroke="#ffd54f"
        strokeWidth="2"
        strokeOpacity="0.9"
      />
      <circle
        className="oliva-illust-check"
        cx="40"
        cy="32"
        r="16"
        fill="#3dbf5a"
        stroke="#2a9e44"
        strokeWidth="1.75"
      />
      <path
        d="M32 32.5l5.5 5.5 11-12"
        stroke="#fff8ef"
        strokeWidth="2.75"
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
      <image
        className="oliva-illust-bar-chart"
        href="/images/barra-grafica.png"
        x="14"
        y="6"
        width="52"
        height="52"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}
