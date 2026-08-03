"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeShareCaptureHost } from "@/components/share/recipe-share-capture-host";
import { useShareRecipeImage } from "@/hooks/use-share-recipe-image";
import { savedRecipeToShareable } from "@/lib/share/recipe-share-utils";
import { deleteSavedRecipe } from "@/lib/recipes/delete-saved-recipe";
import {
  fetchFavoriteRecipeIds,
  toggleRecipeFavorite
} from "@/lib/recipes/recipe-favorites";
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
type LibraryTab = "saved" | "favorites" | "outside";

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
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<SavedRecipeFilter>("Todas");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [activeTab, setActiveTab] = useState<LibraryTab>("saved");
  const [deletingRecipeId, setDeletingRecipeId] = useState<string | null>(null);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
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

  const handleToggleFavorite = useCallback(
    async (recipeId: string) => {
      if (togglingFavoriteId) return;

      const currentlyFavorite = favoriteIds.has(recipeId);
      setTogglingFavoriteId(recipeId);
      setActionMessage(null);

      const result = await toggleRecipeFavorite(recipeId, currentlyFavorite);

      if (result.success) {
        setFavoriteIds((previous) => {
          const next = new Set(previous);
          if (result.isFavorite) {
            next.add(recipeId);
          } else {
            next.delete(recipeId);
          }
          return next;
        });
      } else {
        setActionMessage(result.error);
      }

      setTogglingFavoriteId(null);
    },
    [favoriteIds, togglingFavoriteId]
  );

  const handleDeleteRecipe = useCallback(
    async (recipeId: string, title: string) => {
      if (deletingRecipeId) return;

      const confirmed = window.confirm(t("deleteConfirm", { title }));
      if (!confirmed) return;

      setDeletingRecipeId(recipeId);
      setActionMessage(null);

      const result = await deleteSavedRecipe(recipeId);

      if (result.success) {
        setRecipes((previous) => previous.filter((recipe) => recipe.id !== recipeId));
        setFavoriteIds((previous) => {
          const next = new Set(previous);
          next.delete(recipeId);
          return next;
        });
      } else {
        setActionMessage(result.error);
      }

      setDeletingRecipeId(null);
    },
    [deletingRecipeId, t]
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

      const [primaryQuery, favoritesResult] = await Promise.all([
        supabase
          .from("recipes")
          .select(
            "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,reference_image_url,tip_sandra,instagram_url,meal_type,tags"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        fetchFavoriteRecipeIds()
      ]);

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

      if (favoritesResult.success) {
        setFavoriteIds(favoritesResult.ids);
      } else {
        setFavoriteIds(new Set());
      }

      // Borradores del escáner no son guardadas reales; comidas fuera sí se listan.
      setRecipes(
        (recipesData ?? []).filter((recipe) => !isScannerDraftRecipe(recipe))
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

  const cookableRecipes = useMemo(
    () => filteredRecipes.filter((recipe) => !isExternalMeal(recipe.tags)),
    [filteredRecipes]
  );

  const outsideRecipes = useMemo(
    () => filteredRecipes.filter((recipe) => isExternalMeal(recipe.tags)),
    [filteredRecipes]
  );

  const favoriteRecipes = useMemo(
    () => filteredRecipes.filter((recipe) => favoriteIds.has(recipe.id)),
    [favoriteIds, filteredRecipes]
  );

  const otherSavedRecipes = useMemo(
    () =>
      cookableRecipes.filter((recipe) => !favoriteIds.has(recipe.id)),
    [cookableRecipes, favoriteIds]
  );

  const isSearchActive = normalizeSearchText(searchTerm).length > 0;
  const isCategoryFilterActive = activeFilter !== "Todas";
  const shouldShowAllResults = mostrarTodas || isSearchActive || isCategoryFilterActive;

  const activeRecipes =
    activeTab === "favorites"
      ? favoriteRecipes
      : activeTab === "outside"
        ? outsideRecipes
        : otherSavedRecipes;
  const visibleRecipes = shouldShowAllResults ? activeRecipes : activeRecipes.slice(0, 5);

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

  const renderRecipeCard = useCallback(
    (recipe: RecipeRow, index: number, animateFromIndex?: number) => {
      const cardLabel = translateSavedCardLabel(t, getRecipeCardLabel(recipe));
      const shouldAnimate =
        animateFromIndex != null && index >= animateFromIndex;

      return (
        <div
          key={recipe.id}
          className={shouldAnimate ? "animate-fade-in-down" : undefined}
          style={
            shouldAnimate
              ? { animationDelay: `${Math.min(index - animateFromIndex, 8) * 45}ms` }
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
            isFavorite={favoriteIds.has(recipe.id)}
            onToggleFavorite={() => void handleToggleFavorite(recipe.id)}
            isTogglingFavorite={togglingFavoriteId === recipe.id}
            isFavoriteDisabled={Boolean(
              togglingFavoriteId && togglingFavoriteId !== recipe.id
            )}
            onShare={() => handleShareRecipe(recipe)}
            isSharing={sharingRecipeId === recipe.id}
            isShareDisabled={Boolean(sharingRecipeId && sharingRecipeId !== recipe.id)}
            onDelete={() => void handleDeleteRecipe(recipe.id, recipe.title)}
            isDeleting={deletingRecipeId === recipe.id}
            isDeleteDisabled={Boolean(deletingRecipeId && deletingRecipeId !== recipe.id)}
            favoriteAriaLabel={
              favoriteIds.has(recipe.id) ? t("removeFavoriteAria") : t("addFavoriteAria")
            }
            deleteAriaLabel={t("deleteAria")}
            shareAriaLabel={t("shareAria")}
          />
        </div>
      );
    },
    [
      deletingRecipeId,
      favoriteIds,
      handleDeleteRecipe,
      handleShareRecipe,
      handleToggleFavorite,
      locale,
      router,
      sharingRecipeId,
      t,
      togglingFavoriteId
    ]
  );

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

    const emptyMessage =
      activeTab === "favorites"
        ? t("favoritesEmpty")
        : activeTab === "outside"
          ? t("outsideSectionEmpty")
          : t("savedSectionEmpty");

    return (
      <div className="space-y-3">
        <div
          className="grid grid-cols-3 gap-1 rounded-xl border border-stone-200/60 bg-white p-1 shadow-sm"
          role="tablist"
          aria-label={t("libraryTabsAria")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "saved"}
            onClick={() => {
              setActiveTab("saved");
              setMostrarTodas(false);
            }}
            className={cn(
              "rounded-lg px-2 py-2 text-center text-[11px] font-semibold transition sm:text-[12px] sm:px-3",
              activeTab === "saved"
                ? "bg-[#F0F4ED] text-[#3e5219]"
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
            )}
          >
            {t("savedSection")}
            <span className="ml-1 text-[10px] font-medium opacity-70">
              {otherSavedRecipes.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "favorites"}
            onClick={() => {
              setActiveTab("favorites");
              setMostrarTodas(false);
            }}
            className={cn(
              "rounded-lg px-2 py-2 text-center text-[11px] font-semibold transition sm:text-[12px] sm:px-3",
              activeTab === "favorites"
                ? "bg-[#F5EBE6] text-[#C06A4F]"
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
            )}
          >
            {t("favoritesSection")}
            <span className="ml-1 text-[10px] font-medium opacity-70">
              {favoriteRecipes.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "outside"}
            onClick={() => {
              setActiveTab("outside");
              setMostrarTodas(false);
            }}
            className={cn(
              "rounded-lg px-2 py-2 text-center text-[11px] font-semibold transition sm:text-[12px] sm:px-3",
              activeTab === "outside"
                ? "bg-amber-50 text-amber-900"
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
            )}
          >
            {t("outsideSection")}
            <span className="ml-1 text-[10px] font-medium opacity-70">
              {outsideRecipes.length}
            </span>
          </button>
        </div>

        {activeRecipes.length > 0 ? (
          <>
            <div className="grid grid-cols-1" role="tabpanel">
              {visibleRecipes.map((recipe, index) =>
                renderRecipeCard(recipe, index, shouldShowAllResults ? 5 : undefined)
              )}
            </div>

            {activeRecipes.length > 5 ? (
              <div className="flex justify-center pb-2 pt-3">
                <button
                  type="button"
                  onClick={() => setMostrarTodas((previous) => !previous)}
                  className="inline-flex w-full max-w-sm items-center justify-center rounded-full border border-[#4C6B3F]/25 bg-[#F0F4ED] px-6 py-3 text-sm font-semibold text-[#3e5219] shadow-sm transition hover:border-[#4C6B3F]/40 hover:bg-[#E4ECDC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C6B3F]/40"
                >
                  {mostrarTodas
                    ? t("viewLess")
                    : t("viewAll", { count: activeRecipes.length })}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-stone-200/80 bg-white/70 px-3 py-2.5 text-[11px] text-stone-500">
            {emptyMessage}
          </p>
        )}
      </div>
    );
  }, [
    activeRecipes,
    activeTab,
    errorMessage,
    favoriteRecipes.length,
    filteredRecipes.length,
    isLoading,
    mostrarTodas,
    otherSavedRecipes.length,
    outsideRecipes.length,
    recipes.length,
    renderRecipeCard,
    shouldShowAllResults,
    t,
    visibleRecipes
  ]);

  return (
    <div className="-mx-4 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-6 pt-1">
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

        {pageContent}

      {shareErrorMessage ? (
        <p className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-700">
          {shareErrorMessage}
        </p>
      ) : null}

      {actionMessage ? (
        <p className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-700">
          {actionMessage}
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
