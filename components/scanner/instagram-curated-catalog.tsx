"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Instagram, Loader2, Plus } from "lucide-react";
import { RecipeCatalogThumbnail } from "@/components/recipes/recipe-catalog-thumbnail";
import { MEAL_TYPES, type MealType } from "@/lib/plan/constants";
import { completePendingPlanAssignment } from "@/lib/plan/complete-pending-assignment";
import { assignRecipeToPlan } from "@/lib/plan/plan-service";
import { type PendingPlanAssignment } from "@/lib/plan/plan-pending-assignment";
import { formatPendingPlanSlot } from "@/lib/i18n/plan-pending-label";
import { getTodayWeekDay } from "@/lib/plan/week-utils";
import { fetchInstagramCatalogFromApi } from "@/lib/recipes/fetch-instagram-catalog-api";
import {
  saveCatalogRecipeToLibrary,
  type InstagramCatalogRecipe
} from "@/lib/recipes/instagram-catalog";
import {
  readInstagramCatalogCache,
  writeInstagramCatalogCache
} from "@/lib/recipes/instagram-catalog-cache";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type InstagramCuratedCatalogProps = {
  className?: string;
  pendingPlanAssignment?: PendingPlanAssignment | null;
  onPendingAssignmentComplete?: () => void;
};

export function InstagramCuratedCatalog({
  className,
  pendingPlanAssignment = null,
  onPendingAssignmentComplete
}: InstagramCuratedCatalogProps) {
  const t = useTranslations("Scanner");
  const tPlan = useTranslations("Plan");
  const router = useRouter();
  const [recipes, setRecipes] = useState<InstagramCatalogRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [planPickerRecipeId, setPlanPickerRecipeId] = useState<string | null>(null);
  const [assigningMealType, setAssigningMealType] = useState<MealType | null>(null);
  const [assigningRecipeId, setAssigningRecipeId] = useState<string | null>(null);

  const pendingAssignmentLabel = pendingPlanAssignment
    ? formatPendingPlanSlot(pendingPlanAssignment, tPlan, t)
    : null;

  const loadCatalog = useCallback(async (options?: { background?: boolean }) => {
    if (!options?.background) {
      const cachedRecipes = readInstagramCatalogCache();
      if (cachedRecipes) {
        setRecipes(cachedRecipes);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }

    setErrorMessage(null);

    try {
      const catalog = await fetchInstagramCatalogFromApi();
      setRecipes(catalog);
      writeInstagramCatalogCache(catalog);
    } catch (error) {
      console.error("[instagram-curated-catalog] Error cargando catálogo:", error);
      if (!readInstagramCatalogCache()) {
        setErrorMessage("No pudimos cargar el catálogo de Instagram.");
        setRecipes([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const togglePlanPicker = (recipeId: string) => {
    if (pendingPlanAssignment) return;
    setPlanPickerRecipeId((current) => (current === recipeId ? null : recipeId));
  };

  const handleAssignToPendingPlan = async (recipe: InstagramCatalogRecipe) => {
    if (!pendingPlanAssignment || assigningRecipeId) return;

    setAssigningRecipeId(recipe.id);
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

      const assignment = await completePendingPlanAssignment(user.id, saved.recipeId);
      onPendingAssignmentComplete?.();

      if (assignment.assigned && assignment.pending) {
        setStatusMessage(
          t("savedAndAssigned", {
            slot: formatPendingPlanSlot(assignment.pending, tPlan, t)
          })
        );
        window.setTimeout(() => {
          router.push(APP_ROUTES.plan);
        }, 700);
        return;
      }

      setErrorMessage(t("savedAssignFailed"));
    } catch (error) {
      console.error("[instagram-curated-catalog] Error asignando al plan pendiente:", error);
      setErrorMessage(t("savedAssignFailed"));
    } finally {
      setAssigningRecipeId(null);
    }
  };

  const handleAssignToPlan = async (recipe: InstagramCatalogRecipe, mealType: MealType) => {
    if (assigningMealType || assigningRecipeId) return;

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

      const assigned = await assignRecipeToPlan({
        userId: user.id,
        diaSemana: getTodayWeekDay(),
        tipoComida: mealType,
        recipeId: saved.recipeId
      });

      if (!assigned) {
        setErrorMessage("No pudimos asignar la receta al plan.");
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

  if (isLoading && recipes.length === 0) {
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
            {pendingAssignmentLabel
              ? `Elige una receta y asígnala al ${pendingAssignmentLabel}.`
              : "Explora nuestras ideas saludables favoritas y añádelas a tu plan semanal."}
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
            const isAssigningPending = assigningRecipeId === recipe.id;
            const showPlanPicker = !pendingPlanAssignment && planPickerRecipeId === recipe.id;
            const isBusy = Boolean(assigningMealType) || isAssigningPending;

            return (
              <article
                key={recipe.id}
                className="overflow-hidden rounded-xl border border-stone-100 bg-white shadow-sm transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => togglePlanPicker(recipe.id)}
                  disabled={Boolean(pendingPlanAssignment) || isBusy}
                  className="block w-full text-left disabled:cursor-default"
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
                    onClick={() => togglePlanPicker(recipe.id)}
                    disabled={Boolean(pendingPlanAssignment) || isBusy}
                    className="w-full text-left disabled:cursor-default"
                  >
                    <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-stone-800">
                      {recipe.title}
                    </h3>
                  </button>

                  {pendingPlanAssignment ? (
                    <button
                      type="button"
                      onClick={() => void handleAssignToPendingPlan(recipe)}
                      disabled={isBusy}
                      aria-label={t("assignToPlanAria", {
                        slot: pendingAssignmentLabel ?? formatPendingPlanSlot(pendingPlanAssignment, tPlan, t)
                      })}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-[#4C6B3F]/25 bg-[#4C6B3F] px-2.5 py-1.5 text-[10px] font-semibold leading-tight text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAssigningPending ? (
                        <>
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                          {t("assigning")}
                        </>
                      ) : (
                        <>{t("assignToPlan")}</>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => togglePlanPicker(recipe.id)}
                      disabled={isBusy}
                      aria-label={t("addToPlanAria")}
                      aria-expanded={showPlanPicker}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-[#4C6B3F]/20 bg-[#F0F4ED] px-2.5 py-1.5 text-[10px] font-semibold leading-tight text-[#4C6B3F] transition hover:bg-[#dce7c3] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus className="h-3 w-3 shrink-0" strokeWidth={2} />
                      {t("addToPlan")}
                    </button>
                  )}

                  {showPlanPicker ? (
                    <div className="space-y-1.5 rounded-lg border border-stone-100 bg-stone-50/80 p-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-stone-500">
                        {t("addToday")}
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
                                {t("assigning")}
                              </span>
                            ) : (
                              tPlan(`meals.${mealType}`)
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
