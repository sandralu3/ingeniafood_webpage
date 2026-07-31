"use client";

import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";
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

  const modes: Array<{ id: ScannerMode; label: string }> = [
    {
      id: "pantry",
      label: t.has("modePantryShort") ? t("modePantryShort") : "Escáner"
    },
    {
      id: "instagram",
      label: t.has("modeInstagramShort") ? t("modeInstagramShort") : "Desde Instagram"
    }
  ];

  return (
    <div className={cn("mb-2 rounded-full bg-white/90 p-0.5 shadow-sm shadow-stone-200/60", className)}>
      <div className="flex w-full gap-1">
        {modes.map((item) => {
          const isActive = mode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(item.id)}
              aria-pressed={isActive}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? "bg-[#3E5A3A] font-bold text-white shadow-sm"
                  : "bg-transparent font-medium text-stone-700 hover:bg-stone-50"
              )}
            >
              <Camera className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
