"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeShareCaptureHost } from "@/components/share/recipe-share-capture-host";
import { useShareRecipeImage } from "@/hooks/use-share-recipe-image";
import { savedRecipeToShareable } from "@/lib/share/recipe-share-utils";
import { handleRemoveFromFavorites } from "@/lib/recipes/remove-from-favorites";
import {
  filterSavedRecipes,
  getRecipeCardLabel,
  normalizeSearchText,
  SAVED_RECIPE_FILTERS,
  type SavedRecipeFilter
} from "@/lib/recipes/saved-recipes-filter";
import { isExternalMeal } from "@/lib/plan/external-meal";
import { isScannerDraftRecipe } from "@/lib/recipes/scanner-draft";
import {
  translateSavedCardLabel,
  translateSavedFilterChip
} from "@/lib/i18n/filter-labels";
import { parseAppLocale, toBcp47Locale } from "@/i18n/config";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

const FILTER_CHIPS = SAVED_RECIPE_FILTERS;

function isMissingOptionalRecipesColumnError(
  error: { code?: string; message?: string } | null,
  column: string
): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes(`column recipes.${column} does not exist`) === true ||
    error.message?.includes(column) === true
  );
}

function formatSavedDate(isoDate: string, locale: string, template: (date: string) => string): string {
  const formatted = new Intl.DateTimeFormat(toBcp47Locale(parseAppLocale(locale)), {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(isoDate));
  return template(formatted);
}

export default function RecipesPage() {
  const t = useTranslations("Saved");
  const locale = useLocale();
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<SavedRecipeFilter>("Todas");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [removingRecipeId, setRemovingRecipeId] = useState<string | null>(null);
  const [removeMessage, setRemoveMessage] = useState<string | null>(null);
  const {
    captureRef,
    captureRecipe,
    shareRecipeImage,
    sharingRecipeId,
    errorMessage: shareErrorMessage,
    clearError: clearShareError
  } = useShareRecipeImage();

  const handleShareRecipe = useCallback(
    (recipe: RecipeRow) => {
      clearShareError();
      const shareable = savedRecipeToShareable(recipe);
      void shareRecipeImage(shareable, { recipeId: recipe.id });
    },
    [clearShareError, shareRecipeImage]
  );

  const handleRemoveRecipe = useCallback(
    async (recipeId: string) => {
      if (removingRecipeId) return;

      setRemovingRecipeId(recipeId);
      setRemoveMessage(null);

      const result = await handleRemoveFromFavorites(recipeId);

      if (result.success) {
        setRecipes((previous) => previous.filter((recipe) => recipe.id !== recipeId));
      } else {
        setRemoveMessage(result.error);
      }

      setRemovingRecipeId(null);
    },
    [removingRecipeId]
  );

  useEffect(() => {
    const loadRecipes = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      let supabase;
      try {
        supabase = createSupabaseClient();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo inicializar Supabase. Revisa tus variables de entorno."
        );
        setRecipes([]);
        setIsLoading(false);
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("No encontramos tu sesion activa. Inicia sesion para ver tus recetas.");
        setRecipes([]);
        setIsLoading(false);
        return;
      }

      const primaryQuery = await supabase
        .from("recipes")
        .select(
          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,reference_image_url,tip_sandra,instagram_url,meal_type,tags"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      let recipesData = primaryQuery.data as RecipeRow[] | null;
      let recipesError = primaryQuery.error;

      if (
        isMissingOptionalRecipesColumnError(recipesError, "tip_sandra") ||
        isMissingOptionalRecipesColumnError(recipesError, "reference_image_url") ||
        isMissingOptionalRecipesColumnError(recipesError, "meal_type") ||
        isMissingOptionalRecipesColumnError(recipesError, "tags")
      ) {
        const fallbackQuery = await supabase
          .from("recipes")
          .select(
            "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        recipesError = fallbackQuery.error;
        recipesData = (fallbackQuery.data as RecipeRow[] | null)?.map((recipe) => ({
          ...recipe,
          tip_sandra: null,
          reference_image_url: null,
          meal_type: null,
          tags: null
        })) ?? null;
      }

      if (recipesError) {
        setErrorMessage("No pudimos cargar tus recetas ahora. Intentalo de nuevo.");
        setRecipes([]);
        setIsLoading(false);
        return;
      }

      // Comidas fuera viven en el plan; borradores del escáner no son guardadas reales.
      setRecipes(
        (recipesData ?? []).filter(
          (recipe) => !isExternalMeal(recipe.tags) && !isScannerDraftRecipe(recipe)
        )
      );
      setIsLoading(false);
    };

    void loadRecipes();
  }, []);

  const filteredRecipes = useMemo(
    () =>
      filterSavedRecipes(recipes, {
        searchTerm,
        categoryFilter: activeFilter
      }),
    [activeFilter, recipes, searchTerm]
  );

  const isSearchActive = normalizeSearchText(searchTerm).length > 0;
  const isCategoryFilterActive = activeFilter !== "Todas";
  const shouldShowAllResults = mostrarTodas || isSearchActive || isCategoryFilterActive;
  const visibleRecipes = shouldShowAllResults ? filteredRecipes : filteredRecipes.slice(0, 5);

  useEffect(() => {
    if (isSearchActive || isCategoryFilterActive) {
      setMostrarTodas(true);
    }
  }, [isCategoryFilterActive, isSearchActive]);

  useEffect(() => {
    if (!isFilterMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterMenuOpen]);

  const pageContent = useMemo(() => {
    if (isLoading) {
      return (
        <p className="rounded-xl bg-white/90 px-3 py-2 text-xs text-stone-500 shadow-sm">
          Cargando recetas saludables...
        </p>
      );
    }

    if (errorMessage) {
      return (
        <p className="rounded-xl bg-white/90 px-3 py-2 text-xs font-medium text-[#556B2F] shadow-sm">
          {errorMessage}
        </p>
      );
    }

    if (recipes.length === 0) {
      return (
        <p className="rounded-xl bg-white/90 px-3 py-2 text-xs text-stone-500 shadow-sm">
          {t("empty")}
        </p>
      );
    }

    if (filteredRecipes.length === 0) {
      return (
        <p className="rounded-xl bg-white/90 px-3 py-2 text-xs text-stone-500 shadow-sm">
          No encontré ninguna receta con ese nombre o ingrediente en tu biblioteca. ¡Prueba con otra palabra!
        </p>
      );
    }

    return (
      <div className="space-y-0">
        <div className="grid grid-cols-1">
          {visibleRecipes.map((recipe, index) => {
            const cardLabel = translateSavedCardLabel(t, getRecipeCardLabel(recipe));

            return (
              <div
                key={recipe.id}
                className={mostrarTodas && index >= 5 ? "animate-fade-in-down" : undefined}
                style={
                  mostrarTodas && index >= 5
                    ? { animationDelay: `${Math.min(index - 5, 8) * 45}ms` }
                    : undefined
                }
              >
                <RecipeCard
                  title={recipe.title}
                  recipeId={recipe.id}
                  categoryLabel={cardLabel}
                  savedAtLabel={formatSavedDate(recipe.created_at, locale, (date) =>
                    t("savedOn", { date })
                  )}
                  imageUrl={recipe.image_url}
                  referenceImageUrl={recipe.reference_image_url}
                  instagramUrl={recipe.instagram_url}
                  isSocialVideo={Boolean(
                    recipe.instagram_url && !recipe.image_url && !recipe.reference_image_url
                  )}
                  detailHref={`/app-recetas/recipes/${recipe.id}`}
                  onPrefetch={() => router.prefetch(`/app-recetas/recipes/${recipe.id}`)}
                  onShare={() => handleShareRecipe(recipe)}
                  onRemove={() => void handleRemoveRecipe(recipe.id)}
                  isRemoving={removingRecipeId === recipe.id}
                  isRemoveDisabled={Boolean(removingRecipeId && removingRecipeId !== recipe.id)}
                  isSharing={sharingRecipeId === recipe.id}
                  isShareDisabled={Boolean(sharingRecipeId && sharingRecipeId !== recipe.id)}
                />
              </div>
            );
          })}
        </div>

        {filteredRecipes.length > 5 ? (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setMostrarTodas((previous) => !previous)}
              className="inline-flex items-center justify-center rounded-full border border-stone-200/60 bg-white px-6 py-2.5 text-sm font-medium text-[#4C6B3F] shadow-sm transition hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4C6B3F]"
            >
              {mostrarTodas ? t("viewLess") : t("viewAll", { count: filteredRecipes.length })}
            </button>
          </div>
        ) : null}
      </div>
    );
  }, [
    errorMessage,
    filteredRecipes,
    handleRemoveRecipe,
    handleShareRecipe,
    isLoading,
    mostrarTodas,
    recipes.length,
    sharingRecipeId,
    removingRecipeId,
    locale,
    t,
    visibleRecipes
  ]);

  return (
    <div className="-mx-4 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-2 pt-1">
      <section className="space-y-3">
        <RecipeShareCaptureHost captureRef={captureRef} recipe={captureRecipe} mode="offscreen" />

        <header>
          <h1 className="font-serif text-lg font-semibold text-stone-900">{t("title")}</h1>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
            {t("subtitle", { count: recipes.length })}
          </p>
        </header>

        <div className="relative z-20 pb-1">
          <div className="flex w-full items-center gap-2">
            <label className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-full border border-stone-200/80 bg-white px-4 py-2.5 pl-11 text-sm text-stone-700 shadow-sm outline-none placeholder:text-stone-400 transition focus:border-[#4C6B3F] focus:ring-1 focus:ring-[#4C6B3F]"
              />
            </label>

            <div className="relative shrink-0" ref={filterMenuRef}>
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/60 bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200/50"
                aria-label={t("filterAria")}
                aria-expanded={isFilterMenuOpen}
              >
                <MoreVertical size={18} />
              </button>

              {isFilterMenuOpen ? (
                <div className="absolute right-0 z-50 mt-2 w-48 animate-fade-in overflow-hidden rounded-2xl border border-stone-100 bg-white p-2 shadow-xl">
                  {FILTER_CHIPS.map((chip) => {
                    const isActive = chip === activeFilter;
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setActiveFilter(chip);
                          setIsFilterMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full rounded-xl px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-[#F5EBE6] font-semibold text-[#C06A4F]"
                            : "text-stone-600 hover:bg-stone-50"
                        )}
                      >
                        {translateSavedFilterChip(t, chip)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto pr-0.5">
          {pageContent}
        </div>

      {shareErrorMessage ? (
        <p className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-700">
          {shareErrorMessage}
        </p>
      ) : null}

      {removeMessage ? (
        <p className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-700">
          {removeMessage}
        </p>
      ) : null}

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fadeInDown 260ms ease-out both;
        }
      `}</style>
      </section>
    </div>
  );
}
