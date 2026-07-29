"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MealType } from "@/lib/plan/constants";
import { getMealTypeIcon, getMealTypeSubtleAccent } from "@/lib/plan/meal-type-accent";
import { cn } from "@/lib/utils";

type EmptyMealSlotProps = {
  mealType: MealType;
  onAdd: () => void;
  /** panel = fila horizontal; slot = tarjeta vertical en carrusel */
  variant?: "panel" | "slot";
  isGenerating?: boolean;
  className?: string;
};

export function EmptyMealSlot({
  mealType,
  onAdd,
  variant = "panel",
  isGenerating = false,
  className
}: EmptyMealSlotProps) {
  const t = useTranslations("Plan");
  const label = isGenerating
    ? t.has("generatingAiProposal")
      ? t("generatingAiProposal")
      : "✨ Generando propuesta con IA..."
    : t("chooseRecipe");
  const mealLabel = t(`meals.${mealType}`);
  const MealIcon = getMealTypeIcon(mealType);
  const accent = getMealTypeSubtleAccent(mealType);

  if (variant === "slot") {
    return (
      <button
        type="button"
        onClick={onAdd}
        disabled={isGenerating}
        aria-busy={isGenerating}
        aria-label={t("chooseRecipeAria", { meal: mealLabel })}
        className={cn(
          "flex min-h-[6.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-stone-100/90 bg-white px-2 py-3 text-center text-[11px] font-medium text-stone-500 shadow-sm shadow-stone-100/20 transition hover:border-stone-200/80 disabled:cursor-wait disabled:opacity-80",
          className
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full ring-1",
            accent.iconCircleBg,
            accent.iconRing,
            accent.iconText
          )}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
          ) : (
            <Plus className="h-3 w-3" strokeWidth={2} />
          )}
        </span>
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={isGenerating}
      aria-busy={isGenerating}
      aria-label={t("chooseRecipeAria", { meal: mealLabel })}
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg border border-stone-100/90 bg-white px-2 py-1.5 text-left shadow-sm shadow-stone-100/20 transition hover:border-stone-200/70 disabled:cursor-wait disabled:opacity-80",
        className
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1",
          accent.iconCircleBg,
          accent.iconRing,
          accent.iconText
        )}
        aria-hidden
      >
        {isGenerating ? (
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
        ) : (
          <MealIcon className="h-3 w-3" strokeWidth={2} />
        )}
      </span>

      <span className="min-w-0 flex-1 text-xs font-medium text-stone-800">{label}</span>

      {!isGenerating ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#88ab75] bg-white text-[#556B2F] transition group-hover:bg-olive-50">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      ) : null}
    </button>
  );
}
