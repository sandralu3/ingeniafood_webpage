"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DetectedIngredient } from "@/lib/scanner/detected-ingredient";

type IngredientChipProps = {
  ingredient: DetectedIngredient;
  onToggle: (id: string) => void;
  disabled?: boolean;
  className?: string;
  /** pill = etiqueta horizontal; avatar = círculo inmersivo del scanner */
  variant?: "pill" | "avatar";
};

/**
 * Chip interactivo de confirmación de ingredientes (seleccionado / descartado).
 */
export function IngredientChip({
  ingredient,
  onToggle,
  disabled = false,
  className,
  variant = "pill"
}: IngredientChipProps) {
  const selected = ingredient.isSelected;

  if (variant === "avatar") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(ingredient.id)}
        aria-pressed={selected}
        aria-label={
          selected
            ? `${ingredient.name}, seleccionado. Toca para descartar`
            : `${ingredient.name}, descartado. Toca para seleccionar`
        }
        className={cn(
          "flex w-[4.75rem] shrink-0 flex-col items-center gap-0.5 transition",
          disabled && "cursor-not-allowed opacity-60",
          className
        )}
        title={ingredient.name}
      >
        <span
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-sm transition",
            selected
              ? "border-2 border-[#556B2F] bg-white ring-2 ring-[#556B2F]/20"
              : "border-2 border-stone-200 bg-stone-100 opacity-50"
          )}
          aria-hidden
        >
          {ingredient.emoji}
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-white shadow",
              selected ? "bg-[#556B2F]" : "bg-stone-500"
            )}
          >
            {selected ? (
              <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
            ) : (
              <X className="h-2.5 w-2.5" strokeWidth={2.5} />
            )}
          </span>
        </span>
        <span
          className={cn(
            "w-full text-center text-[10px] font-semibold leading-tight [overflow-wrap:anywhere] line-clamp-2",
            selected ? "text-stone-700" : "text-stone-400 line-through"
          )}
        >
          {ingredient.name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(ingredient.id)}
      aria-pressed={selected}
      aria-label={
        selected
          ? `${ingredient.name}, seleccionado. Toca para descartar`
          : `${ingredient.name}, descartado. Toca para seleccionar`
      }
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-left text-[12px] font-semibold transition",
        selected
          ? "border-[#556B2F]/35 bg-white text-[#3e5219] shadow-sm ring-1 ring-[#556B2F]/10"
          : "border-stone-200 bg-stone-100 text-stone-400 line-through opacity-50",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <span className="text-base leading-none" aria-hidden>
        {ingredient.emoji}
      </span>
      <span className="min-w-0 truncate">{ingredient.name}</span>
      <span
        className={cn(
          "ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          selected ? "bg-[#556B2F]/12 text-[#556B2F]" : "bg-stone-200/80 text-stone-500"
        )}
        aria-hidden
      >
        {selected ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <X className="h-3 w-3" strokeWidth={2.5} />}
      </span>
    </button>
  );
}
