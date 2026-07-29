"use client";

import { useTranslations } from "next-intl";
import {
  RECIPE_OPTION_DEFAULTS,
  type RecipeOption,
  type RecipeOptionVariant
} from "@/lib/recipes/recipe-options";
import { cn } from "@/lib/utils";

type Props = {
  options: RecipeOption[];
  selectedIndex: number;
  isPremium: boolean;
  onSelect: (index: number) => void;
  onLockedSelect?: () => void;
};

function badgeKeyForVariant(variant: RecipeOptionVariant) {
  return RECIPE_OPTION_DEFAULTS[variant].badgeKey;
}

export function RecipeOptionsSelector({
  options,
  selectedIndex,
  isPremium,
  onSelect,
  onLockedSelect
}: Props) {
  const t = useTranslations("Scanner");

  if (options.length <= 1) return null;

  return (
    <div
      className="flex flex-row gap-3 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label={t("recipeOptionsLabel")}
    >
      {options.map((option, index) => {
        const locked = !isPremium && index > 0;
        const selected = selectedIndex === index && !locked;
        const badge = t(badgeKeyForVariant(option.variant));

        return (
          <button
            key={`${option.variant}-${option.titulo}-${index}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={locked}
            onClick={() => {
              if (locked) {
                onLockedSelect?.();
                return;
              }
              onSelect(index);
            }}
            className={cn(
              "relative w-[7.75rem] shrink-0 rounded-2xl border px-2.5 py-2.5 text-left transition",
              selected
                ? "border-2 border-lime-600 bg-lime-50/50 shadow-sm"
                : "border border-stone-200/80 bg-white/90 shadow-sm shadow-stone-100/40 hover:border-stone-300",
              locked && "opacity-80"
            )}
          >
            {locked ? (
              <span
                className="absolute right-1.5 top-1.5 text-[11px] leading-none"
                aria-hidden
              >
                👑
              </span>
            ) : null}
            <div className="flex items-start gap-1.5">
              <span className="text-lg leading-none" aria-hidden>
                {option.emoji || RECIPE_OPTION_DEFAULTS[option.variant].emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-stone-800">
                  {option.nombre_corto || option.titulo}
                </p>
                <p className="mt-1 text-[10px] font-medium tabular-nums text-stone-500">
                  {option.tiempo_preparacion}
                </p>
                <span
                  className={cn(
                    "mt-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    option.variant === "quick"
                      ? "bg-amber-50 text-amber-800"
                      : option.variant === "light"
                        ? "bg-sky-50 text-sky-800"
                        : "bg-[#F0F4ED] text-[#3e5219]"
                  )}
                >
                  {badge}
                </span>
              </div>
            </div>
            {locked ? (
              <p className="mt-1.5 text-[9px] font-medium leading-snug text-stone-500">
                {t("recipeOptionPremiumHint")}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
