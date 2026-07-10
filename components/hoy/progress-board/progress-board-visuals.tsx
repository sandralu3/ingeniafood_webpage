import { Check, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeekConsistencyDay } from "@/lib/gamification/week-consistency";

type MiniRingChartProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function MiniRingChart({
  value,
  size = 52,
  strokeWidth = 5,
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
  const width = 44;
  const height = 26;
  const stroke = 4;
  const radius = 16;
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
    <div className={cn("flex items-center justify-between gap-1", className)}>
      {days.map((day) => (
        <div key={day.isoDate} className="flex flex-col items-center gap-1">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-bold transition-colors",
              day.completed
                ? "border-orange-300 bg-orange-100 text-orange-700"
                : "border-stone-200 bg-stone-50 text-stone-300",
              day.isToday && "ring-2 ring-orange-200/80 ring-offset-1"
            )}
            aria-label={`${day.label}${day.completed ? " completado" : " pendiente"}`}
          >
            {day.completed ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
          </span>
          <span className="text-[8px] font-medium text-stone-400">{day.label}</span>
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
  const height = 24;
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

export function StreakBadge({ days }: { days: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <Flame className="h-4 w-4 shrink-0 text-orange-500" />
      <span className="font-serif text-2xl font-bold leading-none text-stone-900">{days}</span>
      <span className="text-xs font-medium text-stone-500">
        día{days === 1 ? "" : "s"}
      </span>
    </div>
  );
}
