"use client";

import { Plus } from "lucide-react";
import type { MealType } from "@/lib/plan/constants";
import { cn } from "@/lib/utils";

type EmptyMealSlotProps = {
  mealType: MealType;
  onAdd: () => void;
  /** panel = fila horizontal; slot = tarjeta vertical en carrusel */
  variant?: "panel" | "slot";
  className?: string;
};

export function EmptyMealSlot({
  mealType,
  onAdd,
  variant = "panel",
  className
}: EmptyMealSlotProps) {
  const label = "Elegir receta";

  if (variant === "slot") {
    return (
      <button
        type="button"
        onClick={onAdd}
        aria-label={`${label} de ${mealType}`}
        className={cn(
          "flex min-h-[8.5rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300/90 bg-stone-50/60 px-3 py-4 text-center text-xs font-medium text-stone-500 transition hover:border-[#556B2F]/35 hover:bg-amber-50/40 hover:text-[#3e5219] sm:text-sm",
          className
        )}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-500">
          <Plus className="h-4 w-4" strokeWidth={2} />
        </span>
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`${label} de ${mealType}`}
      className={cn(
        "group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-dashed border-amber-200/60 bg-amber-50/30 p-5",
        "text-amber-800/80 transition-all duration-300 hover:border-amber-300/70 hover:bg-amber-50/50 active:scale-[0.99]",
        className
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100/80 text-amber-800/70 transition group-hover:bg-amber-200/80 group-hover:text-amber-900">
        <Plus className="h-4 w-4" strokeWidth={2.25} />
      </span>
    </button>
  );
}
