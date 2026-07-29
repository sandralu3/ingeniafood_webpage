"use client";

import { useTranslations } from "next-intl";
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
      label: t.has("modePantryShort") ? t("modePantryShort") : "📷 Escáner"
    },
    {
      id: "instagram",
      label: t.has("modeInstagramShort") ? t("modeInstagramShort") : "📸 Desde Instagram"
    }
  ];

  return (
    <div className={cn("mb-3 rounded-xl bg-slate-100 p-1", className)}>
      <div className="grid w-full grid-cols-2 gap-0.5">
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
                "rounded-lg px-2 py-2 text-center text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? "bg-white text-slate-800 shadow-sm"
                  : "bg-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
