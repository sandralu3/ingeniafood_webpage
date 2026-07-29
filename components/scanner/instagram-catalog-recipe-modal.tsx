"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Instagram, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import { parseMacrosFromJson } from "@/lib/recipes/recipe-macros";
import { normalizeRecipeSteps } from "@/lib/recipes/sentence-case";
import {
  normalizeIngredientsJson,
  structuredIngredientToDisplayString
} from "@/lib/recipes/structured-ingredients";
import type { InstagramCatalogRecipe } from "@/lib/recipes/instagram-catalog";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database, Json } from "@/types/database.types";
import { cn } from "@/lib/utils";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

type Props = {
  open: boolean;
  recipe: InstagramCatalogRecipe | null;
  onClose: () => void;
  onAddToPlan: (recipe: InstagramCatalogRecipe) => void;
};

const DETAIL_COLUMNS =
  "id,title,cooking_time,ingredients,steps,instructions,image_url,tip_sandra,macros,instagram_url,is_airfryer,is_flourless" as const;

export function InstagramCatalogRecipeModal({ open, recipe, onClose, onAddToPlan }: Props) {
  const t = useTranslations("Scanner");
  const tCommon = useTranslations("Common");
  const [detail, setDetail] = useState<RecipeRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !recipe) {
      setDetail(null);
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
          .select(DETAIL_COLUMNS)
          .eq("id", recipe.id)
          .maybeSingle();

        if (cancelled) return;

        if (fetchError || !data) {
          setError(
            t.has("catalogDetailLoadError")
              ? t("catalogDetailLoadError")
              : "No pudimos cargar el detalle de la receta."
          );
          setDetail(null);
          return;
        }

        setDetail(data as RecipeRow);
      } catch {
        if (!cancelled) {
          setError(
            t.has("catalogDetailLoadError")
              ? t("catalogDetailLoadError")
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
  }, [open, recipe, t]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const ingredients = useMemo(() => {
    if (!detail) return [];
    return normalizeIngredientsJson(detail.ingredients as Json).map(
      structuredIngredientToDisplayString
    );
  }, [detail]);

  const steps = useMemo(() => {
    if (!detail) return [];
    if (Array.isArray(detail.steps) && detail.steps.length > 0) {
      return normalizeRecipeSteps(detail.steps.map((step) => String(step)).filter(Boolean));
    }
    const fromInstructions = String(detail.instructions ?? "")
      .split(/\n+/)
      .map((line) => line.replace(/^\d+[\).\-\s]+/, "").trim())
      .filter(Boolean);
    return normalizeRecipeSteps(fromInstructions);
  }, [detail]);

  const macros = useMemo(
    () => (detail ? parseMacrosFromJson(detail.macros as Json) : null),
    [detail]
  );

  if (!open || !recipe) return null;

  const title = detail?.title ?? recipe.title;
  const imageUrl = detail?.image_url ?? recipe.image_url ?? null;
  const cookingTime = detail?.cooking_time ?? recipe.cooking_time;
  const instagramUrl = detail?.instagram_url ?? recipe.instagram_url;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 px-0 backdrop-blur-[2px] sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instagram-catalog-recipe-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-slate-100 bg-white shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative shrink-0">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={title} className="h-44 w-full object-cover sm:h-52" />
          ) : (
            <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-stone-100 to-rose-50 sm:h-52">
              <span className="text-4xl" aria-hidden>
                🍽️
              </span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-stone-600 shadow-sm transition hover:bg-white"
            aria-label={tCommon("close")}
          >
            <X className="h-4 w-4" />
          </button>
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md">
            <Instagram className="h-3 w-3" strokeWidth={2} />
            Reel
          </span>
          <div className="absolute inset-x-0 bottom-0 space-y-1 p-4">
            <h2
              id="instagram-catalog-recipe-title"
              className="font-serif text-lg font-semibold leading-snug text-white drop-shadow-sm"
            >
              {title}
            </h2>
            {cookingTime ? (
              <p className="inline-flex items-center gap-1 text-xs text-white/85">
                <Clock className="h-3.5 w-3.5" />
                {cookingTime} min
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#4D6638]" />
              {t.has("catalogDetailLoading") ? t("catalogDetailLoading") : "Cargando detalle…"}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          {!isLoading && macros ? (
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                {macros.calorias} kcal
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                {macros.proteinas_g}g Prot
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                {macros.carbohidratos_g}g Carb
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                {macros.grasas_g}g Grasas
              </span>
            </div>
          ) : null}

          {!isLoading && ingredients.length > 0 ? (
            <section>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Ingredientes
              </h3>
              <ul className="space-y-1.5">
                {ingredients.map((item) => (
                  <li key={item} className="text-xs leading-snug text-slate-700">
                    · {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!isLoading && steps.length > 0 ? (
            <section>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Preparación
              </h3>
              <ol className="space-y-2.5">
                {steps.map((step, index) => (
                  <li key={`${index}-${step.slice(0, 20)}`} className="flex gap-2.5">
                    <span className="w-5 shrink-0 font-serif text-sm font-medium text-[#4D6638]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-xs leading-relaxed text-slate-700">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {!isLoading && detail?.tip_sandra ? (
            <p className="rounded-2xl bg-[#F0F4ED]/80 px-3 py-2 text-[11px] leading-relaxed text-[#3e5219]">
              <span className="font-semibold">Tip de Sandra: </span>
              {detail.tip_sandra.replace(/^Tip de Sandra:\s*/i, "")}
            </p>
          ) : null}

          {instagramUrl ? (
            <div className="pt-1">
              <RecipeInstagramLink url={instagramUrl} />
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => {
              onAddToPlan(recipe);
              onClose();
            }}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#4D6638] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#42572f]"
            )}
          >
            {t("addToPlan")}
          </button>
        </div>
      </div>
    </div>
  );
}
