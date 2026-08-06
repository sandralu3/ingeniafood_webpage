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
  /** true cuando ya hay comida principal: el CTA añade un complemento */
  addComplement?: boolean;
  className?: string;
};

export function EmptyMealSlot({
  mealType,
  onAdd,
  variant = "panel",
  isGenerating = false,
  addComplement = false,
  className
}: EmptyMealSlotProps) {
  const t = useTranslations("Plan");
  const label = isGenerating
    ? t.has("generatingAiProposal")
      ? t("generatingAiProposal")
      : "✨ Generando propuesta con IA..."
    : addComplement
      ? t.has("addComplement")
        ? t("addComplement")
        : "Agregar complemento"
      : t("chooseRecipe");
  const mealLabel = t(`meals.${mealType}`);
  const MealIcon = getMealTypeIcon(mealType);
  const accent = getMealTypeSubtleAccent(mealType);
  const ariaLabel = addComplement
    ? t.has("addComplementAria")
      ? t("addComplementAria", { meal: mealLabel })
      : `Agregar complemento a ${mealLabel}`
    : t("chooseRecipeAria", { meal: mealLabel });

  if (variant === "slot") {
    return (
      <button
        type="button"
        onClick={onAdd}
        disabled={isGenerating}
        aria-busy={isGenerating}
        aria-label={ariaLabel}
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
      aria-label={ariaLabel}
      className={cn(
        "group flex w-full items-center text-left transition disabled:cursor-wait disabled:opacity-80",
        addComplement
          ? "gap-1.5 rounded-md border border-dashed border-stone-200/80 bg-transparent px-3 py-1 text-xs hover:border-stone-300/80 hover:bg-stone-50/60"
          : "gap-2 rounded-xl border border-stone-100/90 bg-white p-2.5 shadow-sm shadow-stone-100/20 hover:border-stone-200/70",
        className
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full ring-1",
          addComplement ? "h-5 w-5" : "h-7 w-7",
          accent.iconCircleBg,
          accent.iconRing,
          accent.iconText
        )}
        aria-hidden
      >
        {isGenerating ? (
          <Loader2 className={cn(addComplement ? "h-2.5 w-2.5" : "h-3 w-3", "animate-spin")} strokeWidth={2} />
        ) : (
          <MealIcon className={cn(addComplement ? "h-2.5 w-2.5" : "h-3 w-3")} strokeWidth={2} />
        )}
      </span>

      <span
        className={cn(
          "min-w-0 flex-1 font-medium",
          addComplement ? "text-xs text-stone-500" : "text-xs text-stone-800"
        )}
      >
        {label}
      </span>

      {!isGenerating ? (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border border-[#88ab75] bg-white text-[#556B2F] transition group-hover:bg-olive-50",
            addComplement ? "h-5 w-5" : "h-7 w-7"
          )}
        >
          <Plus className={cn(addComplement ? "h-2.5 w-2.5" : "h-3.5 w-3.5")} strokeWidth={2} />
        </span>
      ) : null}
    </button>
  );
}
