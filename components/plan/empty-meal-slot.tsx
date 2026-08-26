"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MealType } from "@/lib/plan/constants";
import { getMealTypeIcon, getMealTypeSubtleAccent } from "@/lib/plan/meal-type-accent";
import { cn } from "@/lib/utils";

type EmptyMealSlotProps = {
  mealType: MealType;
  onAdd: () => void;
  /** panel = fila; slot = vacío vertical; ghost-tile = mock tamaño tarjeta en carrusel */
  variant?: "panel" | "slot" | "ghost-tile";
  isGenerating?: boolean;
  /** true cuando ya hay comida principal: el CTA añade un complemento */
  addComplement?: boolean;
  /**
   * Solo ghost-tile + addComplement: si false, el mock se ve pero no se puede tocar
   * (p. ej. hueco vacío sin plato principal).
   */
  interactive?: boolean;
  className?: string;
};

export function EmptyMealSlot({
  mealType,
  onAdd,
  variant = "panel",
  isGenerating = false,
  addComplement = false,
  interactive = true,
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

  if (variant === "ghost-tile") {
    const complementLabel = t.has("complementBadge") ? t("complementBadge") : "Complemento";
    const titleText = isGenerating ? label : addComplement ? complementLabel : t("chooseRecipe");
    const canInteract = interactive && !isGenerating;
    const shellClass = cn(
      "flex h-full w-full flex-col overflow-hidden rounded-lg shadow-sm shadow-stone-200/20 transition",
      addComplement
        ? canInteract
          ? "border border-dashed border-stone-300/80 bg-white/55 opacity-85 hover:border-stone-400/70 hover:bg-white/80 hover:opacity-100"
          : "cursor-default border border-dashed border-stone-200/70 bg-stone-50/50 opacity-55"
        : "border border-stone-200/90 bg-white hover:border-stone-300 hover:shadow-md hover:shadow-stone-200/30",
      !canInteract && !addComplement ? "disabled:cursor-wait disabled:opacity-50" : null,
      className
    );

    const media = (
      <span
        className={cn(
          "relative flex aspect-[3/2] w-full shrink-0 items-center justify-center overflow-hidden",
          accent.iconCircleBg
        )}
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-32deg, transparent, transparent 6px, rgba(255,255,255,0.45) 6px, rgba(255,255,255,0.45) 7px)"
          }}
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/50 to-transparent"
        />

        {addComplement ? (
          <span className="pointer-events-none absolute left-1 top-1 z-10 rounded-md bg-white/90 px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-stone-500 shadow-sm ring-1 ring-stone-200/80">
            {complementLabel}
          </span>
        ) : null}

        <span
          className={cn(
            "relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1",
            accent.iconRing,
            accent.iconText,
            canInteract && "transition group-hover:scale-105"
          )}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
          ) : addComplement && canInteract ? (
            <Plus className="h-3 w-3" strokeWidth={2.25} />
          ) : addComplement ? (
            <Plus className="h-3 w-3 opacity-40" strokeWidth={2} />
          ) : (
            <MealIcon className="h-3 w-3" strokeWidth={1.75} />
          )}
        </span>
      </span>
    );

    const body = (
      <span className="flex flex-col gap-0.5 px-1.5 pb-1 pt-1 text-left">
        <span
          className={cn(
            "line-clamp-1 text-[9px] font-bold leading-tight",
            addComplement ? "text-stone-500" : "text-stone-700"
          )}
        >
          {titleText}
        </span>

        {!isGenerating && addComplement ? (
          <span aria-hidden className="mt-0.5 h-1.5 w-[70%] rounded-full bg-stone-200/70" />
        ) : null}

        {!isGenerating && canInteract ? (
          <span className="mt-0.5 flex justify-end">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#88ab75] bg-white text-[#556B2F] transition group-hover:bg-olive-50">
              <Plus className="h-2 w-2" strokeWidth={2.5} />
            </span>
          </span>
        ) : null}
      </span>
    );

    if (!canInteract && addComplement) {
      return (
        <div
          aria-hidden
          className={shellClass}
          title={
            t.has("addComplementNeedsMain")
              ? t("addComplementNeedsMain")
              : "Primero elige la comida principal"
          }
        >
          {media}
          {body}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={onAdd}
        disabled={!canInteract}
        aria-busy={isGenerating}
        aria-label={ariaLabel}
        data-no-dnd="true"
        className={cn("group", shellClass)}
      >
        {media}
        {body}
      </button>
    );
  }

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

  if (addComplement) {
    return (
      <button
        type="button"
        onClick={onAdd}
        disabled={isGenerating}
        aria-busy={isGenerating}
        aria-label={ariaLabel}
        className={cn(
          "group flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-stone-300/80 bg-stone-50/70 px-3 py-2 text-xs font-medium text-stone-500 transition hover:border-stone-400/80 hover:bg-stone-100/80 hover:text-stone-700 disabled:cursor-wait disabled:opacity-80",
          className
        )}
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
        ) : (
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
        )}
        <span>{label}</span>
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
        "group flex w-full items-center gap-2 rounded-xl border border-stone-100/90 bg-white p-2.5 text-left shadow-sm shadow-stone-100/20 transition hover:border-stone-200/70 disabled:cursor-wait disabled:opacity-80",
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
