"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalSheetBackButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

/**
 * Botón secundario de “Atrás/Volver” para footers de bottom sheets.
 * Misma presencia visual que el CTA primario (borde, tamaño, icono).
 */
export function ModalSheetBackButton({
  onClick,
  disabled = false,
  label = "Atrás",
  className
}: ModalSheetBackButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-0.5 rounded-2xl border border-stone-200 bg-white px-3.5 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
      {label}
    </button>
  );
}
