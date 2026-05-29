"use client";

import { forwardRef, useMemo } from "react";
import { Clock, Leaf, Sparkles } from "lucide-react";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";

/** Canvas fijo 9:16 — debe coincidir con width/height en toPng */
export const SHARE_CARD_WIDTH_PX = 1080;
export const SHARE_CARD_HEIGHT_PX = 1920;

const MAX_INGREDIENTS = 6;

type Props = {
  recipe: ShareableRecipe;
};

function formatTimeLabel(tiempo: string): string {
  const t = tiempo.trim();
  if (/min/i.test(t)) return t;
  const n = t.match(/\d+/);
  return n ? `${n[0]} min` : t;
}

function getStepTypography(stepCount: number): {
  textClass: string;
  listGapClass: string;
  badgeClass: string;
} {
  if (stepCount > 9) {
    return {
      textClass: "text-[0.9rem] leading-snug",
      listGapClass: "space-y-1.5",
      badgeClass: "h-7 w-7 text-xs"
    };
  }
  if (stepCount > 6) {
    return {
      textClass: "text-sm leading-snug",
      listGapClass: "space-y-2",
      badgeClass: "h-7 w-7 text-xs"
    };
  }
  return {
    textClass: "text-base leading-snug",
    listGapClass: "space-y-2.5",
    badgeClass: "h-8 w-8 text-sm"
  };
}

export const RecipeShareCard = forwardRef<HTMLDivElement, Props>(function RecipeShareCard(
  { recipe },
  ref
) {
  const steps = recipe.pasos_ordenados ?? [];
  const stepTypography = getStepTypography(steps.length);

  const { visibleIngredients, hiddenIngredientCount } = useMemo(() => {
    const ingredients = recipe.ingredientes_detallados ?? [];
    return {
      visibleIngredients: ingredients.slice(0, MAX_INGREDIENTS),
      hiddenIngredientCount: Math.max(ingredients.length - MAX_INGREDIENTS, 0)
    };
  }, [recipe.ingredientes_detallados]);

  return (
    <div
      ref={ref}
      className="box-border flex flex-col justify-between overflow-hidden bg-[#fdfcfb] text-[#1a1c1b]"
      style={{
        width: SHARE_CARD_WIDTH_PX,
        height: SHARE_CARD_HEIGHT_PX,
        minWidth: SHARE_CARD_WIDTH_PX,
        minHeight: SHARE_CARD_HEIGHT_PX,
        maxWidth: SHARE_CARD_WIDTH_PX,
        maxHeight: SHARE_CARD_HEIGHT_PX,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
      }}
    >
      <header className="shrink-0 px-14 pt-12 pb-2">
        <div className="flex items-center justify-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#556B2F]/15">
            <Leaf className="h-8 w-8 text-[#556B2F]" strokeWidth={2.2} />
          </div>
          <div className="text-center leading-tight">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#5e684c]">
              Sandra Vergara
            </p>
            <p className="text-[2.1rem] font-bold tracking-tight">
              <span className="text-[#1a1c1b]">Ingenia</span>
              <span className="text-[#556B2F]">Food</span>
            </p>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col justify-between gap-6 px-14 py-6">
        <section className="shrink-0 rounded-[24px] border border-[#556B2F]/20 bg-white px-8 py-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#556B2F]">
            Receta saludable
          </p>
          <h1 className="mt-2 text-[2.35rem] font-bold leading-[1.12] tracking-tight text-[#1a1c1b]">
            {recipe.titulo}
          </h1>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#dce7c3] px-4 py-1.5 text-base font-semibold text-[#3e5219]">
            <Clock className="h-4 w-4 shrink-0" />
            {formatTimeLabel(recipe.tiempo_preparacion)}
          </p>
        </section>

        <section className="shrink-0 rounded-[24px] border border-[#556B2F]/15 bg-white/95 px-8 py-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-[#556B2F]">
            Ingredientes
          </h2>
          <ul className="mt-3 space-y-2">
            {visibleIngredients.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-base leading-snug text-[#1a1c1b]"
              >
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#556B2F]" />
                <span className="whitespace-normal break-words">{item}</span>
              </li>
            ))}
          </ul>
          {hiddenIngredientCount > 0 ? (
            <p className="mt-2 text-sm font-medium text-[#5e684c]">
              + {hiddenIngredientCount} ingredientes más
            </p>
          ) : null}
        </section>

        {steps.length > 0 ? (
          <section className="flex shrink-0 flex-col justify-start rounded-[24px] border border-[#556B2F]/15 bg-[#f0f4ed]/80 px-8 pb-8 pt-5">
            <h2 className="shrink-0 text-sm font-bold uppercase tracking-[0.16em] text-[#556B2F]">
              Preparación
            </h2>
            <ol className={`mt-3 shrink-0 ${stepTypography.listGapClass}`}>
              {steps.map((step, index) => (
                <li key={`${index}-${step}`} className="flex gap-2.5">
                  <span
                    className={`flex shrink-0 items-center justify-center rounded-full border border-[#556B2F]/35 font-bold text-[#556B2F] ${stepTypography.badgeClass}`}
                  >
                    {index + 1}
                  </span>
                  <p
                    className={`whitespace-normal break-words pt-0.5 text-[#1a1c1b] ${stepTypography.textClass}`}
                  >
                    {step.trim()}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {recipe.tip_sandra ? (
          <section className="shrink-0 rounded-xl border border-[#88ab75]/30 bg-[#88ab75]/10 px-6 py-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#556B2F]">
              <Sparkles className="h-4 w-4" />
              El Tip de Sandra
            </p>
            <p className="mt-2 whitespace-normal break-words text-base italic leading-relaxed text-[#4a5d3f]">
              {recipe.tip_sandra}
            </p>
          </section>
        ) : null}
      </main>

      <footer className="shrink-0 border-t border-[#556B2F]/15 bg-[#f0f4ed] px-14 py-8">
        <div className="flex items-center justify-between gap-8">
          <div className="min-w-0">
            <p className="text-[1.5rem] font-bold leading-tight text-[#556B2F]">
              Generado con IngeniaFood
            </p>
            <p className="mt-1.5 text-lg text-[#5e684c]">Tu asistente de cocina saludable</p>
          </div>
          <div className="flex h-[5.5rem] w-[5.5rem] shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-[#556B2F]/30 bg-white p-2 text-center">
            <div className="grid grid-cols-5 gap-0.5">
              {Array.from({ length: 25 }).map((_, index) => (
                <span
                  key={index}
                  className={`h-2 w-2 rounded-[1px] ${
                    [0, 1, 2, 5, 6, 10, 11, 12, 14, 18, 20, 22, 23, 24].includes(index)
                      ? "bg-[#556B2F]"
                      : "bg-transparent"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#556B2F]">
              Scan me
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
});

