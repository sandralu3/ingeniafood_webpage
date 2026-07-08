"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanLine, Search, Sparkles, X } from "lucide-react";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import { RecipeMedia } from "@/components/recipes/recipe-media";
import type { RecipePickerItem } from "@/lib/plan/plan-service";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { savePendingPlanAssignment } from "@/lib/plan/plan-pending-assignment";
import { cn } from "@/lib/utils";

type PlanRecipePickerModalProps = {
  open: boolean;
  dayLabel: string;
  mealType: MealType;
  recipes: RecipePickerItem[];
  isLoading: boolean;
  isAssigning: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSelectRecipe: (recipeId: string) => void;
};

function buildCategories(recipe: RecipePickerItem): string[] {
  return [
    recipe.is_airfryer ? "Airfryer" : null,
    recipe.is_flourless ? "Sin Harinas" : null,
    !recipe.is_airfryer && !recipe.is_flourless ? "Saludable" : null
  ].filter((category): category is string => Boolean(category));
}

export function PlanRecipePickerModal({
  open,
  dayLabel,
  mealType,
  recipes,
  isLoading,
  isAssigning,
  errorMessage,
  onClose,
  onSelectRecipe
}: PlanRecipePickerModalProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
    }
  }, [open]);

  const filteredRecipes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter((recipe) => recipe.title.toLowerCase().includes(query));
  }, [recipes, searchTerm]);

  const goToScannerForPlan = () => {
    savePendingPlanAssignment({ dayLabel: dayLabel as WeekDay, mealType });
    onClose();
    router.push(APP_ROUTES.scanner);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/45 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-picker-title"
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-neutral-100 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700/80">
              {dayLabel} · {mealType}
            </p>
            <h2 id="plan-picker-title" className="mt-1 font-serif text-xl font-semibold text-stone-900">
              Elige una receta
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Selecciona desde tu biblioteca de recetas guardadas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isAssigning}
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-stone-100 px-5 py-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar receta..."
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-3 text-sm text-stone-800 outline-none transition focus:border-[#556B2F]/30 focus:ring-2 focus:ring-[#556B2F]/10"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {errorMessage ? (
            <p role="alert" className="mb-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
              Cargando recetas...
            </div>
          ) : null}

          {!isLoading && filteredRecipes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-200/80 bg-amber-50/40 px-4 py-8 text-center">
              <p className="text-sm font-medium text-stone-700">No hay recetas disponibles.</p>
              <p className="mt-1 text-xs text-stone-500">
                Escanea ingredientes y guarda recetas para asignarlas al plan.
              </p>
            </div>
          ) : null}

          {!isLoading && filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredRecipes.map((recipe) => {
                const categories = buildCategories(recipe);
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    disabled={isAssigning}
                    onClick={() => onSelectRecipe(recipe.id)}
                    className={cn(
                      "overflow-hidden rounded-2xl border border-neutral-100 bg-white text-left shadow-md shadow-stone-100/50 transition",
                      "hover:-translate-y-0.5 hover:border-[#556B2F]/20 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  >
                    <div className="relative">
                      <RecipeMedia
                        imageUrl={recipe.image_url}
                        isSocialVideo={Boolean(recipe.instagram_url && !recipe.image_url)}
                        variant="thumbnail"
                        title={recipe.title}
                        className="!h-28"
                      />
                      {recipe.instagram_url ? (
                        <div className="absolute right-2 top-2">
                          <RecipeInstagramLink url={recipe.instagram_url} variant="icon" />
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-2 p-3">
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900">
                        {recipe.title}
                      </h3>
                      {categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {categories.slice(0, 2).map((category) => (
                            <span
                              key={category}
                              className="rounded-full bg-[#F0F4ED] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#556B2F]"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="border-t border-stone-100 bg-stone-50/80 px-5 py-4">
          <p className="mb-3 text-center text-xs font-medium text-stone-500">
            ¿No encuentras la receta que quieres?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isAssigning}
              onClick={goToScannerForPlan}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[#556B2F]/20 bg-white px-3 py-3 text-xs font-semibold text-[#3e5219] shadow-sm transition",
                "hover:border-[#556B2F]/35 hover:bg-[#F0F4ED] disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              <ScanLine className="h-4 w-4 shrink-0" />
              Escanear despensa
            </button>
            <button
              type="button"
              disabled={isAssigning}
              onClick={goToScannerForPlan}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#556B2F] to-[#6b8a3e] px-3 py-3 text-xs font-semibold text-white shadow-md transition",
                "hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              Crear receta
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-stone-400">
            Al guardar la receta, se asignará al {mealType.toLowerCase()} del {dayLabel}.
          </p>
        </div>

        {isAssigning ? (
          <div className="border-t border-stone-100 px-5 py-3 text-center text-xs font-medium text-[#556B2F]">
            <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
            Asignando receta al plan...
          </div>
        ) : null}
      </div>
    </div>
  );
}
