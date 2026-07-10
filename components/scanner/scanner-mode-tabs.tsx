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
    <div
      className={cn(
        "mx-auto flex max-w-md gap-1 rounded-full border border-[#E4ECE1] bg-[#F1F5F0] p-1",
        className
      )}
    >
      {MODES.map((item) => {
        const isActive = mode === item.id;
        const Icon = item.icon;
        const isInstagram = item.id === "instagram";

        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60",
              isActive && isInstagram
                ? "border border-[#f9a8d4]/50 bg-gradient-to-r from-[#fdf2f8] to-[#fce7f3] py-2 px-5 font-semibold text-[#9d174d] shadow-sm"
                : isActive
                  ? "bg-[#4C6B3F] py-2 px-5 text-white shadow-sm"
                  : isInstagram
                    ? "bg-transparent py-2 px-5 text-[#be185d]/55 hover:text-[#9d174d]"
                    : "bg-transparent py-2 px-5 text-stone-500 hover:text-[#4C6B3F]"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
