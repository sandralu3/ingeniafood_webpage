import { Check, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeekConsistencyDay } from "@/lib/gamification/week-consistency";

export const METRIC_NUMBER_CLASS = "text-2xl font-bold leading-none text-stone-900";
export const METRIC_DENOMINATOR_CLASS = "text-sm font-semibold text-stone-500";

type MiniRingChartProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function MiniRingChart({
  value,
  size = 44,
  strokeWidth = 4,
  className
}: MiniRingChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, value) / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className={cn("-rotate-90", className)}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#f5f5f4"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#d4a574"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}

type MiniSemiArcProps = {
  value: number;
  color: string;
  trackColor?: string;
  label: string;
};

export function MiniSemiArc({ value, color, trackColor = "#f5f5f4", label }: MiniSemiArcProps) {
  const width = 38;
  const height = 22;
  const stroke = 3.5;
  const radius = 14;
  const centerX = width / 2;
  const centerY = height - 2;
  const clamped = Math.min(100, Math.max(0, value));
  const arcLength = Math.PI * radius;
  const offset = arcLength - (clamped / 100) * arcLength;

  const arcPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={width} height={height} aria-hidden>
        <path
          d={arcPath}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="text-[9px] font-medium leading-none text-stone-500">{label}</span>
    </div>
  );
}

type ConsistencyDotsProps = {
  days: WeekConsistencyDay[];
  className?: string;
};

export function ConsistencyDots({ days, className }: ConsistencyDotsProps) {
  return (
    <div className={cn("flex items-center justify-between gap-0.5", className)}>
      {days.map((day) => (
        <div key={day.isoDate} className="flex flex-col items-center gap-px">
          <span
            className={cn(
              "flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[7px] font-bold transition-colors",
              day.inCurrentStreak
                ? "border-orange-300 bg-orange-100 text-orange-700"
                : day.active
                  ? "border-stone-300 bg-stone-100 text-stone-500"
                  : "border-stone-200 bg-stone-50 text-stone-300",
              day.isToday && day.inCurrentStreak && "ring-1 ring-orange-200/80 ring-offset-0"
            )}
            aria-label={`${day.label}${
              day.inCurrentStreak
                ? " en racha"
                : day.active
                  ? " activo sin racha"
                  : " pendiente"
            }`}
          >
            {day.active ? <Check className="h-2 w-2" strokeWidth={3} /> : null}
          </span>
          <span className="text-[7px] font-medium leading-none text-stone-400">{day.label}</span>
        </div>
      ))}
    </div>
  );
}

type MiniSparklineProps = {
  values: number[];
  className?: string;
};

export function MiniSparkline({ values, className }: MiniSparklineProps) {
  if (values.length === 0) return null;

  const max = Math.max(...values, 1);
  const width = 56;
  const height = 18;
  const step = width / Math.max(values.length - 1, 1);

  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="#d4a574"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StreakBadge({
  days,
  activeDaysThisWeek,
  daysLabel,
  activeThisWeekLabel,
  compact = false
}: {
  days: number;
  activeDaysThisWeek?: number;
  daysLabel: string;
  activeThisWeekLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "space-y-0.5" : "space-y-1")}>
      <div className="flex items-baseline gap-1">
        <Flame
          className={cn("shrink-0 text-orange-500", compact ? "h-3 w-3" : "h-3.5 w-3.5")}
        />
        <span className={cn(METRIC_NUMBER_CLASS, compact && "text-xl")}>{days}</span>
        <span
          className={cn(
            "font-medium text-stone-500",
            compact ? "text-[9px] leading-tight" : "text-[10px]"
          )}
        >
          {daysLabel}
        </span>
      </div>
      {typeof activeDaysThisWeek === "number" &&
      activeDaysThisWeek > days &&
      activeThisWeekLabel ? (
        <p className="text-[9px] text-stone-400">{activeThisWeekLabel}</p>
      ) : null}
    </div>
  );
}

type StreakCardBodyProps = {
  days: number;
  activeDaysThisWeek: number;
  daysLabel: string;
  weekDays: WeekConsistencyDay[];
  motivation: string;
  weekProgressLabel: string;
};

/** Contenido denso de la tarjeta Racha: número + motivación + progreso semanal + dots. */
export function StreakCardBody({
  days,
  activeDaysThisWeek,
  daysLabel,
  weekDays,
  motivation,
  weekProgressLabel
}: StreakCardBodyProps) {
  const weekGoal = 7;
  const progressPct = Math.min(100, Math.round((activeDaysThisWeek / weekGoal) * 100));

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5">
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-1">
          <Flame className="h-3.5 w-3.5 shrink-0 text-orange-500" />
          <span className="text-xl font-bold leading-none text-stone-900">{days}</span>
          <span className="text-[9px] font-medium leading-tight text-stone-500">{daysLabel}</span>
        </div>

        <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-stone-700">
          {motivation}
        </p>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="inline-flex items-center rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-semibold text-orange-800 ring-1 ring-orange-100">
              {weekProgressLabel}
            </span>
            <span className="text-[8px] font-semibold tabular-nums text-stone-400">
              {activeDaysThisWeek}/{weekGoal}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-300 to-orange-500 transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
              aria-hidden
            />
          </div>
        </div>
      </div>

      <ConsistencyDots days={weekDays} />
    </div>
  );
}
