"use client";

import { Clock, UtensilsCrossed } from "lucide-react";
import { SandraTipCard } from "@/components/recipes/sandra-tip-card";
import { resolveRecipeTags, isShareExcludedTag } from "@/lib/recipes/recipe-tags";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";
import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
import {
  buildMacroData,
  formatTimeLabel,
  inferDifficulty
} from "@/lib/share/recipe-share-utils";

type Props = {
  recipe: ShareableRecipe;
  showScanBanner?: boolean;
  hideInlineTipOnShare?: boolean;
};

const pillClass =
  "inline-flex shrink-0 items-center rounded-full border border-[#4c6633]/12 bg-[#dce7c3]/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#4c6633]";

export function RecipeDetailMagazine({
  recipe,
  showScanBanner = false,
  hideInlineTipOnShare = false
}: Props) {
  const macroData = buildMacroData(recipe);
  const steps = normalizeRecipeSteps(recipe.pasos_ordenados ?? []);
  const tags = resolveRecipeTags({ tags: recipe.tags });

  return (
    <div className="space-y-6">
      {/* Hero título */}
      <header className="space-y-4">
        {showScanBanner ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
            Receta optimizada a partir de tu escaneo
          </p>
        ) : null}

        <h1 className="font-serif text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-stone-900">
          {recipe.titulo}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              {...(isShareExcludedTag(tag) ? { "data-share-exclude": true } : {})}
              className={pillClass}
            >
              {tag}
            </span>
          ))}
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200/80 bg-white px-3 py-1 text-[11px] font-medium text-stone-600">
            <Clock className="h-3 w-3 text-[#4c6633]" strokeWidth={1.5} />
            {formatTimeLabel(recipe.tiempo_preparacion)}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200/80 bg-white px-3 py-1 text-[11px] font-medium text-stone-600">
            <UtensilsCrossed className="h-3 w-3 text-[#4c6633]" strokeWidth={1.5} />
            {inferDifficulty(steps.length)}
          </span>
        </div>
      </header>

      {/* Macronutrientes */}
      <section className="rounded-2xl bg-white px-5 py-6 shadow-sm">
        <h2 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4c6633]/80">
          Cálculo de Macronutrientes
        </h2>
        <div className="space-y-4">
          {macroData.map((macro) => (
            <div key={macro.label} className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium tracking-wide text-stone-500">
                  {macro.label}
                </span>
                <span className="text-xs font-semibold tabular-nums text-stone-800">
                  {macro.value}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-[#4c6633]/75 transition-all"
                  style={{ width: `${macro.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ingredientes */}
      <section className="rounded-2xl bg-white px-5 py-6 shadow-sm">
        <h2 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4c6633]/80">
          Ingredientes Identificados
        </h2>
        <ul className="space-y-3.5">
          {recipe.ingredientes_detallados.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4c6633]/70" />
              <span className="text-sm leading-relaxed text-stone-700">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Preparación */}
      <section className="rounded-2xl bg-[#FDFCFB] px-6 py-8 shadow-sm">
        <h2 className="mb-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4c6633]/80">
          Instrucciones de Preparación
        </h2>
        <div className="space-y-7">
          {steps.map((step, index) => {
            const num = String(index + 1).padStart(2, "0");
            return (
              <div key={`${num}-${step.slice(0, 24)}`} className="flex gap-4">
                <span className="w-8 shrink-0 font-serif text-xl font-medium leading-none text-[#4c6633]/85">
                  {num}
                </span>
                <p className="flex-1 pt-0.5 text-sm leading-[1.75] text-stone-700 normal-case">
                  {step}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <SandraTipCard tip={recipe.tip_sandra ?? ""} hideOnShareCapture={hideInlineTipOnShare} />
    </div>
  );
}
