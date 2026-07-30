"use client";

import { Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  RECIPE_OPTION_DEFAULTS,
  type RecipeOption
} from "@/lib/recipes/recipe-options";
import { cn } from "@/lib/utils";

type Props = {
  options: RecipeOption[];
  selectedIndex: number;
  isPremium: boolean;
  onSelect: (index: number) => void;
  onLockedSelect?: () => void;
};

export function RecipeOptionsSelector({
  options,
  selectedIndex,
  isPremium,
  onSelect,
  onLockedSelect
}: Props) {
  const t = useTranslations("Scanner");

  if (options.length <= 1) return null;

  const cols =
    options.length === 2
      ? "grid-cols-2"
      : options.length >= 3
        ? "grid-cols-3"
        : "grid-cols-1";

  return (
    <div
      className={cn("mb-1 grid gap-1 rounded-2xl bg-slate-100/80 p-1", cols)}
      role="tablist"
      aria-label={t("recipeOptionsLabel")}
    >
      {options.map((option, index) => {
        const locked = !isPremium && index > 0;
        const selected = selectedIndex === index && !locked;
        const defaults = RECIPE_OPTION_DEFAULTS[option.variant];
        const label = t(defaults.badgeKey);
        const emoji = option.emoji || defaults.emoji;

        return (
          <button
            key={`${option.variant}-${option.titulo}-${index}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={locked}
            title={option.titulo}
            onClick={() => {
              if (locked) {
                onLockedSelect?.();
                return;
              }
              onSelect(index);
            }}
            className={cn(
              "flex w-full items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] transition-all",
              selected && "bg-white font-bold text-[#4D6638] shadow-sm",
              !selected &&
                !locked &&
                "bg-transparent font-medium text-slate-500 hover:text-slate-700",
              locked &&
                "bg-transparent font-medium text-amber-800 hover:bg-amber-100/40"
            )}
          >
            {locked ? (
              <Crown
                className="h-2.5 w-2.5 shrink-0 text-amber-700"
                strokeWidth={2.25}
                aria-hidden
              />
            ) : (
              <span className="shrink-0 text-[11px] leading-none" aria-hidden>
                {emoji}
              </span>
            )}
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
