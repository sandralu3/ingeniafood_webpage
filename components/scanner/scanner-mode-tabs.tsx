"use client";

import { ScanLine, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScannerMode = "pantry" | "instagram";

type ScannerModeTabsProps = {
  mode: ScannerMode;
  onChange: (mode: ScannerMode) => void;
  disabled?: boolean;
  className?: string;
};

const MODES: Array<{
  id: ScannerMode;
  label: string;
  description: string;
  icon: typeof ScanLine;
}> = [
  {
    id: "pantry",
    label: "Escanear despensa",
    description: "Foto o ingredientes",
    icon: ScanLine
  },
  {
    id: "instagram",
    label: "Desde Instagram",
    description: "Pegar enlace del reel",
    icon: Instagram
  }
];

export function ScannerModeTabs({ mode, onChange, disabled = false, className }: ScannerModeTabsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {MODES.map((item) => {
        const Icon = item.icon;
        const isActive = mode === item.id;

        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
              isActive
                ? item.id === "instagram"
                  ? "border-[#C13584]/25 bg-gradient-to-br from-[#fdf2f8] to-white shadow-md shadow-[#C13584]/10"
                  : "border-[#556B2F]/25 bg-[#F0F4ED] shadow-md shadow-[#556B2F]/10"
                : "border-stone-200 bg-white hover:border-stone-300"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl",
                isActive
                  ? item.id === "instagram"
                    ? "bg-white text-[#C13584]"
                    : "bg-white text-[#556B2F]"
                  : "bg-stone-50 text-stone-500"
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="mt-2 text-sm font-semibold text-stone-900">{item.label}</p>
            <p className="mt-0.5 text-[11px] text-stone-500">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}
