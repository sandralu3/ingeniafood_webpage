import type { CSSProperties } from "react";

const CHIPS = [
  { emoji: "🥚", label: "Huevos", delay: "0s" },
  { emoji: "🍅", label: "Tomate", delay: "0.2s" },
  { emoji: "🥑", label: "Aguacate", delay: "0.4s" },
  { emoji: "🧀", label: "Queso", delay: "0.6s" },
  { emoji: "🧀", label: "Mozzarella", delay: "0.8s" }
] as const;

export function IngredientCloud() {
  return (
    <div className="flex min-h-[180px] flex-wrap content-center items-center justify-center gap-2.5 px-2">
      {CHIPS.map((chip) => (
        <span
          key={chip.label}
          className="oliva-process-chip inline-flex items-center gap-1.5 rounded-full border border-[#e4e2dd] bg-white px-3.5 py-2 text-sm font-medium text-[#1b1c19] shadow-[0_8px_20px_-14px_rgba(27,28,25,0.28)]"
          style={{ "--chip-delay": chip.delay } as CSSProperties}
        >
          <span aria-hidden>{chip.emoji}</span>
          {chip.label}
        </span>
      ))}
    </div>
  );
}
