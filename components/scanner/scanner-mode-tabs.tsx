"use client";

import { ScanLine, Instagram } from "lucide-react";
import { useTranslations } from "next-intl";
import { SCANNER_SECTION_CLASS } from "@/components/scanner/advanced-recipe-filters";
import { cn } from "@/lib/utils";

export type ScannerMode = "pantry" | "instagram";

type ScannerModeTabsProps = {
  mode: ScannerMode;
  onChange: (mode: ScannerMode) => void;
  disabled?: boolean;
  className?: string;
};

export function ScannerModeTabs({ mode, onChange, disabled = false, className }: ScannerModeTabsProps) {
  const t = useTranslations("Scanner");

  const modes: Array<{
    id: ScannerMode;
    label: string;
    icon: typeof ScanLine;
  }> = [
    {
      id: "pantry",
      label: t("modePantry"),
      icon: ScanLine
    },
    {
      id: "instagram",
      label: t("modeInstagram"),
      icon: Instagram
    }
  ];

  return (
    <div className={cn(SCANNER_SECTION_CLASS, "mb-0 p-1.5", className)}>
      <div className="grid w-full grid-cols-2 gap-1.5">
        {modes.map((item) => {
          const isActive = mode === item.id;
          const Icon = item.icon;
          const isInstagram = item.id === "instagram";

          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(item.id)}
              aria-pressed={isActive}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
                isActive && isInstagram
                  ? "bg-gradient-to-r from-[#fdf2f8] to-[#fce7f3] text-[#9d174d] shadow-sm ring-1 ring-[#f9a8d4]/35"
                  : isActive
                    ? "bg-[#4C6B3F] text-white shadow-sm"
                    : "bg-stone-50/80 text-stone-500 hover:bg-stone-100/80 hover:text-stone-700"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
