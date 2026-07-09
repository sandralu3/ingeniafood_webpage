"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Instagram, Loader2, Plus } from "lucide-react";
import { RecipeCatalogThumbnail } from "@/components/recipes/recipe-catalog-thumbnail";
import { MEAL_TYPES, type MealType } from "@/lib/plan/constants";
import { assignRecipeToPlan } from "@/lib/plan/plan-service";
import { getTodayWeekDay } from "@/lib/plan/week-utils";
import {
  fetchInstagramCatalogRecipes,
  findUserCatalogRecipeCopy,
  saveCatalogRecipeToLibrary,
  type InstagramCatalogRecipe
} from "@/lib/recipes/instagram-catalog";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type InstagramCuratedCatalogProps = {
  className?: string;
};

export function InstagramCuratedCatalog({ className }: InstagramCuratedCatalogProps) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<InstagramCatalogRecipe[]>([]);
  const [userCopyIds, setUserCopyIds] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [planPickerRecipeId, setPlanPickerRecipeId] = useState<string | null>(null);
  const [assigningMealType, setAssigningMealType] = useState<MealType | null>(null);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const catalog = await fetchInstagramCatalogRecipes(supabase);
      setRecipes(catalog);

      if (!user) {
        setUserCopyIds({});
        return;
      }

      const copies: Record<string, string> = {};
      await Promise.all(
        catalog.map(async (recipe) => {
          const copyId = await findUserCatalogRecipeCopy(supabase, user.id, recipe);
          if (copyId) {
            copies[recipe.id] = copyId;
          }
        })
      );
      setUserCopyIds(copies);
    } catch (error) {
      console.error("[instagram-curated-catalog] Error cargando catálogo:", error);
      setErrorMessage("No pudimos cargar el catálogo de Instagram.");
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const handleSaveFavorite = async (
    recipe: InstagramCatalogRecipe
  ): Promise<string | null> => {
    if (savingRecipeId) return userCopyIds[recipe.id] ?? null;

    const existingCopyId = userCopyIds[recipe.id];
    if (existingCopyId) {
      setStatusMessage(`"${recipe.title}" ya estaba en tus recetas.`);
      return existingCopyId;
    }

    setSavingRecipeId(recipe.id);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("Inicia sesión para guardar recetas en tu biblioteca.");
        return null;
      }

      const outcome = await saveCatalogRecipeToLibrary({
        supabase,
        userId: user.id,
        curatedRecipeId: recipe.id
      });

      if ("error" in outcome) {
        setErrorMessage(outcome.error);
        return null;
      }

      setUserCopyIds((current) => ({ ...current, [recipe.id]: outcome.recipeId }));
      setStatusMessage(
        outcome.alreadySaved
          ? `"${recipe.title}" ya estaba en tus recetas.`
          : `"${recipe.title}" guardada en tu biblioteca.`
      );
      return outcome.recipeId;
    } catch (error) {
      console.error("[instagram-curated-catalog] Error guardando favorito:", error);
      setErrorMessage("No pudimos guardar la receta.");
      return null;
    } finally {
      setSavingRecipeId(null);
    }
  };

  const handleOpenRecipe = async (recipe: InstagramCatalogRecipe) => {
    const recipeId = userCopyIds[recipe.id] ?? (await handleSaveFavorite(recipe));
    if (recipeId) {
      router.push(`${APP_ROUTES.guardadas}/${recipeId}`);
    }
  };

  const handleAssignToPlan = async (recipe: InstagramCatalogRecipe, mealType: MealType) => {
    if (savingRecipeId || assigningMealType) return;

    setAssigningMealType(mealType);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("Inicia sesión para añadir recetas al plan semanal.");
        return;
      }

      const saved = await saveCatalogRecipeToLibrary({
        supabase,
        userId: user.id,
        curatedRecipeId: recipe.id
      });

      if ("error" in saved) {
        setErrorMessage(saved.error);
        return;
      }

      setUserCopyIds((current) => ({ ...current, [recipe.id]: saved.recipeId }));

      const assigned = await assignRecipeToPlan({
        userId: user.id,
        diaSemana: getTodayWeekDay(),
        tipoComida: mealType,
        recipeId: saved.recipeId
      });

      if (!assigned) {
        setErrorMessage("Guardamos la receta, pero no pudimos asignarla al plan.");
        return;
      }

      setPlanPickerRecipeId(null);
      setStatusMessage(`"${recipe.title}" asignada al ${mealType.toLowerCase()} de hoy.`);
      window.setTimeout(() => {
        router.push(APP_ROUTES.plan);
      }, 700);
    } catch (error) {
      console.error("[instagram-curated-catalog] Error asignando al plan:", error);
      setErrorMessage("No pudimos añadir la receta al plan.");
    } finally {
      setAssigningMealType(null);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("mt-4 flex items-center justify-center gap-1.5 py-10 text-xs text-stone-500", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4C6B3F]" />
        Cargando catálogo de Instagram...
      </div>
    );
  }

  return (
    <section className={cn("mt-4 space-y-2.5", className)}>
      <div className="flex items-start gap-2 rounded-xl border border-[#C13584]/15 bg-gradient-to-br from-[#fdf2f8] via-white to-[#F0F4ED] p-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#C13584] shadow-sm">
          <Instagram className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight text-stone-900">
            Catálogo IngeniaFood
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
            Explora nuestras ideas saludables favoritas. Guárdalas en tu biblioteca o añádelas
            directamente a tu plan semanal.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {statusMessage ? (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {statusMessage}
        </p>
      ) : null}

      {recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white px-3 py-6 text-center">
          <p className="text-xs font-medium text-stone-700">Aún no hay recetas en el catálogo.</p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Sandra publicará aquí las recetas importadas desde Instagram.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {recipes.map((recipe) => {
            const isSaved = Boolean(userCopyIds[recipe.id]);
            const isSaving = savingRecipeId === recipe.id;
            const showPlanPicker = planPickerRecipeId === recipe.id;

            return (
              <article
                key={recipe.id}
                className="overflow-hidden rounded-xl border border-stone-100 bg-white shadow-sm transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => void handleOpenRecipe(recipe)}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-[3/2] overflow-hidden bg-stone-50">
                    <RecipeCatalogThumbnail
                      title={recipe.title}
                      imageUrl={recipe.image_url}
                      isAirfryer={recipe.is_airfryer}
                      isFlourless={recipe.is_flourless}
                      className="[&_svg]:h-5 [&_svg]:w-5"
                    />
                  </div>
                </button>

                <div className="space-y-1.5 p-2">
                  <button
                    type="button"
                    onClick={() => void handleOpenRecipe(recipe)}
                    className="w-full text-left"
                  >
                    <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-stone-800">
                      {recipe.title}
                    </h3>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleSaveFavorite(recipe)}
                      disabled={isSaving || Boolean(assigningMealType)}
                      aria-label={isSaved ? "Receta guardada en favoritos" : "Guardar en favoritos"}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full border transition",
                        isSaved
                          ? "border-rose-200 bg-rose-50 text-rose-600"
                          : "border-stone-200 bg-stone-50 text-stone-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600",
                        "disabled:cursor-not-allowed disabled:opacity-60"
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Heart className={cn("h-3.5 w-3.5", isSaved && "fill-current")} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPlanPickerRecipeId((current) => (current === recipe.id ? null : recipe.id))
                      }
                      disabled={isSaving || Boolean(assigningMealType)}
                      aria-label="Añadir al plan semanal"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#4C6B3F]/20 bg-[#F0F4ED] text-[#4C6B3F] transition hover:bg-[#dce7c3] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>

                  {showPlanPicker ? (
                    <div className="space-y-1.5 rounded-lg border border-stone-100 bg-stone-50/80 p-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-stone-500">
                        Añadir hoy
                      </p>
                      <div className="grid grid-cols-1 gap-1">
                        {MEAL_TYPES.map((mealType) => (
                          <button
                            key={mealType}
                            type="button"
                            onClick={() => void handleAssignToPlan(recipe, mealType)}
                            disabled={Boolean(assigningMealType)}
                            className="rounded-md bg-white px-2 py-1.5 text-[11px] font-semibold text-stone-700 transition hover:bg-[#F0F4ED] disabled:opacity-60"
                          >
                            {assigningMealType === mealType ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Añadiendo...
                              </span>
                            ) : (
                              mealType
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
