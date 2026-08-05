"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MealType } from "@/lib/plan/constants";
import { assignRecipeToPlan } from "@/lib/plan/plan-service";
import {
  getMondayOfWeek,
  getWeekDayFromDate,
  toISODateString
} from "@/lib/plan/week-utils";
import { parseMacrosFromJson } from "@/lib/recipes/recipe-macros";
import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
import {
  normalizeIngredientsJson,
  structuredIngredientToDisplayString
} from "@/lib/recipes/structured-ingredients";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database, Json } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

type SuggestionRecipeDetailModalProps = {
  open: boolean;
  recipeId: string | null;
  mealType: MealType;
  slotLabel: string;
  userId: string;
  previewTitle?: string | null;
  previewImageUrl?: string | null;
  onClose: () => void;
  onAdded: () => void;
};

const RECIPE_COLUMNS =
  "id,title,cooking_time,ingredients,steps,instructions,image_url,tip_sandra,macros" as const;

export function SuggestionRecipeDetailModal({
  open,
  recipeId,
  mealType,
  slotLabel,
  userId,
  previewTitle,
  previewImageUrl,
  onClose,
  onAdded
}: SuggestionRecipeDetailModalProps) {
  const t = useTranslations("Hoy");
  const tCommon = useTranslations("Common");
  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !recipeId) {
      setRecipe(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createSupabaseClient();
        const { data, error: fetchError } = await supabase
          .from("recipes")
          .select(RECIPE_COLUMNS)
          .eq("id", recipeId)
          .maybeSingle();

        if (cancelled) return;

        if (fetchError || !data) {
          setError(
            t.has("suggestionDetailLoadError")
              ? t("suggestionDetailLoadError")
              : "No pudimos cargar el detalle de la receta."
          );
          setRecipe(null);
          return;
        }

        setRecipe(data as RecipeRow);
      } catch {
        if (!cancelled) {
          setError(
            t.has("suggestionDetailLoadError")
              ? t("suggestionDetailLoadError")
              : "No pudimos cargar el detalle de la receta."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, recipeId, t]);

  const ingredients = useMemo(() => {
    if (!recipe) return [];
    return normalizeIngredientsJson(recipe.ingredients as Json).map(
      structuredIngredientToDisplayString
    );
  }, [recipe]);

  const steps = useMemo(() => {
    if (!recipe) return [];
    if (Array.isArray(recipe.steps) && recipe.steps.length > 0) {
      return normalizeRecipeSteps(
        recipe.steps.map((step) => String(step)).filter(Boolean)
      );
    }
    const fromInstructions = String(recipe.instructions ?? "")
      .split(/\n+/)
      .map((line) => line.replace(/^\d+[\).\-\s]+/, "").trim())
      .filter(Boolean);
    return normalizeRecipeSteps(fromInstructions);
  }, [recipe]);

  const macros = useMemo(
    () => (recipe ? parseMacrosFromJson(recipe.macros as Json) : null),
    [recipe]
  );

  const title = recipe?.title ?? previewTitle ?? "Receta";
  const imageUrl = recipe?.image_url ?? previewImageUrl ?? null;
  const addCta = t.has("suggestionDetailAddCta")
    ? t("suggestionDetailAddCta", { meal: slotLabel })
    : `Añadir a mi ${slotLabel} de hoy`;

  const handleAdd = async () => {
    if (!recipeId || isAdding) return;
    setIsAdding(true);
    setError(null);
    try {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const meal = await assignRecipeToPlan({
        userId,
        diaSemana: getWeekDayFromDate(today),
        tipoComida: mealType,
        recipeId,
        semanaInicioISO: toISODateString(getMondayOfWeek(today))
      });
      if (!meal) {
        setError(
          t.has("emptyMealAddError")
            ? t("emptyMealAddError")
            : "No pudimos añadir la receta al plan."
        );
        return;
      }
      onAdded();
      onClose();
    } catch {
      setError(
        t.has("emptyMealAddError")
          ? t("emptyMealAddError")
          : "No pudimos añadir la receta al plan."
      );
    } finally {
      setIsAdding(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 px-0 backdrop-blur-[2px] sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggestion-recipe-detail-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-neutral-100 bg-white shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative shrink-0">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              className="h-40 w-full object-cover sm:h-48"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-stone-100 to-emerald-50 sm:h-48">
              <span className="text-4xl" aria-hidden>
                🍽️
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-stone-600 shadow-sm transition hover:bg-white"
            aria-label={tCommon("close")}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute left-1/2 top-12 z-20 -translate-x-1/2">
            <SwipeToCloseHandle onClose={onClose} disabled={isAdding} />
          </div>

          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-700 shadow-sm">
            {slotLabel}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          <div>
            <h2
              id="suggestion-recipe-detail-title"
              className="font-serif text-xl font-semibold text-stone-900"
            >
              {title}
            </h2>
            {recipe?.cooking_time ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-500">
                <Clock className="h-3.5 w-3.5" />
                {recipe.cooking_time} min
              </p>
            ) : null}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
              {t.has("suggestionDetailLoading")
                ? t("suggestionDetailLoading")
                : "Cargando detalle…"}
            </div>
          ) : null}

          {!isLoading && macros ? (
            <div className="flex flex-wrap gap-1.5">
              <MacroChip label={`${macros.calorias} kcal`} />
              <MacroChip label={`${macros.proteinas_g}g Prot`} />
              <MacroChip label={`${macros.carbohidratos_g}g Carb`} />
              <MacroChip label={`${macros.grasas_g}g Grasas`} />
            </div>
          ) : null}

          {!isLoading && ingredients.length > 0 ? (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                {t.has("suggestionDetailIngredients")
                  ? t("suggestionDetailIngredients")
                  : "Ingredientes"}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {ingredients.slice(0, 14).map((line) => (
                  <li key={line} className="text-sm leading-snug text-stone-700">
                    · {line}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!isLoading && steps.length > 0 ? (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                {t.has("suggestionDetailSteps")
                  ? t("suggestionDetailSteps")
                  : "Preparación"}
              </h3>
              <ol className="mt-2 space-y-2">
                {steps.slice(0, 10).map((step, index) => (
                  <li key={`${index}-${step.slice(0, 24)}`} className="flex gap-2 text-sm text-stone-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#556B2F]/10 text-[10px] font-bold text-[#3e5219]">
                      {index + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {!isLoading && recipe?.tip_sandra ? (
            <p className="rounded-2xl bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-950">
              {recipe.tip_sandra}
            </p>
          ) : null}

          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
        </div>

        <div className="shrink-0 border-t border-stone-100 px-5 py-4">
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={isAdding || isLoading || !recipeId}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#556B2F] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3e5219] disabled:opacity-60"
            )}
          >
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isAdding
              ? t.has("emptyMealAdding")
                ? t("emptyMealAdding")
                : "Añadiendo…"
              : addCta}
          </button>
        </div>
      </div>
    </div>
  );
}

function MacroChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-700">
      {label}
    </span>
  );
}
