"use client";

import {
  Bookmark,
  CheckCircle2,
  Clock,
  UtensilsCrossed
} from "lucide-react";

type GeneratedRecipe = {
  titulo: string;
  tiempo_preparacion: string;
  ingredientes_detallados: string[];
  pasos_ordenados: string[];
};

type Props = {
  recipe: GeneratedRecipe;
  /** Banner cuando la receta se generó con foto de despensa */
  showPhotoBanner?: boolean;
  onSaveFavorites?: () => void;
  onNewSearch?: () => void;
};

function inferDifficulty(pasosCount: number): string {
  if (pasosCount <= 3) return "FÁCIL";
  if (pasosCount <= 5) return "INTERMEDIO";
  return "AVANZADO";
}

function formatTimeLabel(tiempo: string): string {
  const t = tiempo.trim().toUpperCase();
  if (t.includes("MIN")) return t;
  const n = tiempo.match(/\d+/);
  return n ? `${n[0]} MIN` : tiempo;
}

function buildMacroData(recipe: GeneratedRecipe) {
  const ingredientCount = Math.max(recipe.ingredientes_detallados.length, 1);
  const stepCount = Math.max(recipe.pasos_ordenados.length, 1);

  const proteinas = Math.min(18 + ingredientCount * 2, 42);
  const carbs = Math.min(24 + stepCount * 3, 58);
  const grasas = Math.min(10 + ingredientCount, 28);
  const calorias = 220 + proteinas * 4 + carbs * 4 + grasas * 9;

  const maxGram = 60;
  return [
    { label: "Proteínas", value: `${proteinas} g`, progress: Math.round((proteinas / maxGram) * 100) },
    { label: "Carbs", value: `${carbs} g`, progress: Math.round((carbs / maxGram) * 100) },
    { label: "Grasas", value: `${grasas} g`, progress: Math.round((grasas / maxGram) * 100) },
    { label: "Calorías", value: `${calorias} kcal`, progress: Math.min(Math.round((calorias / 520) * 100), 100) }
  ];
}

export function RecipeResultView({
  recipe,
  onSaveFavorites,
  onNewSearch
}: Props) {
  const macroData = buildMacroData(recipe);

  return (
    <article className="bg-[#FAFAFA] pb-28 pt-1 duration-500">
      {onNewSearch ? (
        <div className="mb-2 px-1">
          <button
            type="button"
            onClick={onNewSearch}
            className="text-sm font-semibold text-sv-primary underline decoration-sv-primary/40 underline-offset-4 transition hover:opacity-80"
          >
            ← Nueva búsqueda
          </button>
        </div>
      ) : null}

      <section className="space-y-4 rounded-xl border border-sv-outline-variant/25 bg-white p-4">
        <p className="text-xs font-medium text-sv-primary/80">
          Receta optimizada a partir de tu escaneo
        </p>

        <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight text-sv-on-surface">
          {recipe.titulo}
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
          <span className="rounded-full border border-sv-primary/25 bg-sv-secondary-container/70 px-3 py-1 text-sv-on-secondary-container">
            Sin Harinas
          </span>
          <span className="rounded-full border border-sv-primary/25 bg-sv-secondary-container/70 px-3 py-1 text-sv-on-secondary-container">
            Apto para Airfryer
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-sv-outline-variant/40 px-3 py-1 text-sv-on-surface-variant">
            <Clock className="h-3.5 w-3.5 text-sv-primary" />
            {formatTimeLabel(recipe.tiempo_preparacion)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-sv-outline-variant/40 px-3 py-1 text-sv-on-surface-variant">
            <UtensilsCrossed className="h-3.5 w-3.5 text-sv-primary" />
            {inferDifficulty(recipe.pasos_ordenados.length)}
          </span>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <div className="rounded-xl border border-sv-outline-variant/25 bg-white p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-sv-primary">
            Cálculo de Macronutrientes
          </h3>
          <div className="space-y-2.5">
            {macroData.map((macro) => (
              <div key={macro.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-sv-on-surface-variant">{macro.label}</span>
                  <span className="font-semibold text-sv-on-surface">{macro.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-sv-surface-low">
                  <div
                    className="h-full rounded-full bg-sv-primary transition-all"
                    style={{ width: `${macro.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-sv-outline-variant/25 bg-white p-4">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sv-primary">
            Ingredientes Identificados
          </h3>
          <ul className="space-y-2.5">
            {recipe.ingredientes_detallados.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 border-b border-sv-outline-variant/20 pb-2.5 last:border-0"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sv-primary" />
                <span className="text-sm leading-relaxed text-sv-on-surface">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6 rounded-xl border border-sv-outline-variant/25 bg-white p-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-sv-primary">
            Instrucciones de Preparación
          </h3>
          <div className="space-y-6">
            {recipe.pasos_ordenados.map((step, index) => {
              const num = String(index + 1).padStart(2, "0");
              return (
                <div key={`${num}-${step.slice(0, 24)}`} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sv-outline-variant text-xs font-semibold text-sv-primary">
                    {num}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm leading-relaxed text-sv-on-surface-variant">{step}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onSaveFavorites}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-sv-primary px-5 py-3 text-sm font-semibold tracking-wide text-sv-on-primary shadow-lg shadow-sv-primary/20 transition duration-300 hover:scale-[1.01]"
            >
              <Bookmark className="h-4 w-4 fill-current" />
              Guardar en Favoritos
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
