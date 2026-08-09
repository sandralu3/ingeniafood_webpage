"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { parseMacrosFromJson } from "@/lib/recipes/recipe-macros";
import {
  filterSavedRecipes,
  getRecipeCardLabel,
  normalizeSearchText,
  SAVED_RECIPE_FILTERS,
  type SavedRecipeFilter
} from "@/lib/recipes/saved-recipes-filter";
import {
  externalMealBadgeLabel,
  isExternalMeal,
  resolveExternalMealBadge
} from "@/lib/plan/external-meal";
import { isScannerDraftRecipe } from "@/lib/recipes/scanner-draft";
import {
  translateSavedCardLabel,
  translateSavedFilterChip
} from "@/lib/i18n/filter-labels";
import { formatPendingPlanSlot } from "@/lib/i18n/plan-pending-label";
import {
  clearPendingPlanAssignment,
  readPendingPlanAssignment,
  type PendingPlanAssignment
} from "@/lib/plan/plan-pending-assignment";
import { parseAppLocale, toBcp47Locale } from "@/i18n/config";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];
type LibraryTab = "saved" | "sandra" | "favorites" | "outside";

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

function isSandraRecipeRow(recipe: RecipeRow): boolean {
  return Boolean(
    (recipe as RecipeRow & { is_sandra_recipe?: boolean }).is_sandra_recipe
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
  const tScanner = useTranslations("Scanner");
  const tPlan = useTranslations("Plan");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [sandraRecipes, setSandraRecipes] = useState<RecipeRow[]>([]);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<SavedRecipeFilter>("Todas");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [activeTab, setActiveTab] = useState<LibraryTab>("saved");
  const [pendingPlanAssignment, setPendingPlanAssignment] =
    useState<PendingPlanAssignment | null>(null);
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

  useEffect(() => {
    setPendingPlanAssignment(readPendingPlanAssignment());
  }, []);

  useEffect(() => {
    const tab = (searchParams.get("tab") || "").toLowerCase();
    if (tab === "sandra" || tab === "favorites" || tab === "outside" || tab === "saved") {
      setActiveTab(tab as LibraryTab);
    }
  }, [searchParams]);

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
        // Si solo estaba en la lista por favorito (banco sistema), quítala al desmarcar.
        if (!result.isFavorite) {
          setRecipes((previous) =>
            previous.filter((recipe) => {
              if (recipe.id !== recipeId) return true;
              return Boolean(viewerUserId && recipe.user_id === viewerUserId);
            })
          );
        }
      } else {
        setActionMessage(result.error);
      }

      setTogglingFavoriteId(null);
    },
    [favoriteIds, togglingFavoriteId, viewerUserId]
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
        setSandraRecipes([]);
        setIsLoading(false);
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("No encontramos tu sesion activa. Inicia sesion para ver tus recetas.");
        setRecipes([]);
        setSandraRecipes([]);
        setViewerUserId(null);
        setIsLoading(false);
        return;
      }

      setViewerUserId(user.id);

      const recipeSelect =
        "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,reference_image_url,tip_sandra,instagram_url,meal_type,tags,macros,is_system_recipe,is_sandra_recipe";

      const [primaryQuery, sandraQuery, favoritesResult] = await Promise.all([
        supabase
          .from("recipes")
          .select(recipeSelect)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("recipes")
          .select(recipeSelect)
          .eq("is_sandra_recipe", true)
          .order("created_at", { ascending: false }),
        fetchFavoriteRecipeIds()
      ]);

      let sandraData = sandraQuery.data as RecipeRow[] | null;
      if (sandraQuery.error) {
        if (isMissingOptionalRecipesColumnError(sandraQuery.error, "is_sandra_recipe")) {
          sandraData = [];
        } else {
          console.warn("[recipes] No se pudieron cargar Recetas de Sandra:", sandraQuery.error);
          sandraData = [];
        }
      }
      setSandraRecipes(
        (sandraData ?? []).filter((recipe) => !isScannerDraftRecipe(recipe))
      );

      let recipesData = primaryQuery.data as RecipeRow[] | null;
      let recipesError = primaryQuery.error;

      if (
        isMissingOptionalRecipesColumnError(recipesError, "tip_sandra") ||
        isMissingOptionalRecipesColumnError(recipesError, "reference_image_url") ||
        isMissingOptionalRecipesColumnError(recipesError, "meal_type") ||
        isMissingOptionalRecipesColumnError(recipesError, "tags") ||
        isMissingOptionalRecipesColumnError(recipesError, "is_system_recipe") ||
        isMissingOptionalRecipesColumnError(recipesError, "is_sandra_recipe") ||
        isMissingOptionalRecipesColumnError(recipesError, "macros")
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
          tags: null,
          macros: null,
          is_system_recipe: false,
          is_sandra_recipe: false
        })) ?? null;
      }

      if (recipesError) {
        setErrorMessage("No pudimos cargar tus recetas ahora. Intentalo de nuevo.");
        setRecipes([]);
        setIsLoading(false);
        return;
      }

      const favoriteIdSet = favoritesResult.success
        ? favoritesResult.ids
        : new Set<string>();
      setFavoriteIds(favoriteIdSet);

      const owned = (recipesData ?? []).filter((recipe) => !isScannerDraftRecipe(recipe));
      const ownedIds = new Set(owned.map((recipe) => recipe.id));
      const missingFavoriteIds = Array.from(favoriteIdSet).filter((id) => !ownedIds.has(id));

      let merged = owned;
      if (missingFavoriteIds.length > 0) {
        const favoritedQuery = await supabase
          .from("recipes")
          .select(recipeSelect)
          .in("id", missingFavoriteIds);

        if (!favoritedQuery.error && favoritedQuery.data) {
          const extras = (favoritedQuery.data as RecipeRow[]).filter(
            (recipe) => !isScannerDraftRecipe(recipe)
          );
          merged = [...owned, ...extras];
        } else if (
          isMissingOptionalRecipesColumnError(favoritedQuery.error, "is_system_recipe") ||
          isMissingOptionalRecipesColumnError(favoritedQuery.error, "is_sandra_recipe") ||
          isMissingOptionalRecipesColumnError(favoritedQuery.error, "tags")
        ) {
          const fallbackFavorites = await supabase
            .from("recipes")
            .select(
              "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url"
            )
            .in("id", missingFavoriteIds);
          if (!fallbackFavorites.error && fallbackFavorites.data) {
            const extras = (fallbackFavorites.data as RecipeRow[]).map((recipe) => ({
              ...recipe,
              tip_sandra: null,
              reference_image_url: null,
              meal_type: null,
              tags: null,
              macros: null,
              is_system_recipe: false,
              is_sandra_recipe: false
            }));
            merged = [...owned, ...extras];
          }
        }
      }

      setRecipes(merged);
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

  const filteredSandraRecipes = useMemo(
    () =>
      filterSavedRecipes(sandraRecipes, {
        searchTerm,
        categoryFilter: activeFilter
      }),
    [activeFilter, sandraRecipes, searchTerm]
  );

  const ownedFilteredRecipes = useMemo(
    () =>
      viewerUserId
        ? filteredRecipes.filter((recipe) => recipe.user_id === viewerUserId)
        : filteredRecipes,
    [filteredRecipes, viewerUserId]
  );

  const cookableRecipes = useMemo(
    () =>
      ownedFilteredRecipes.filter(
        (recipe) => !isExternalMeal(recipe.tags) && !isSandraRecipeRow(recipe)
      ),
    [ownedFilteredRecipes]
  );

  const outsideRecipes = useMemo(
    () => ownedFilteredRecipes.filter((recipe) => isExternalMeal(recipe.tags)),
    [ownedFilteredRecipes]
  );

  const favoriteRecipes = useMemo(() => {
    const byId = new Map<string, RecipeRow>();
    for (const recipe of filteredRecipes) {
      if (favoriteIds.has(recipe.id)) byId.set(recipe.id, recipe);
    }
    for (const recipe of filteredSandraRecipes) {
      if (favoriteIds.has(recipe.id)) byId.set(recipe.id, recipe);
    }
    return Array.from(byId.values());
  }, [favoriteIds, filteredRecipes, filteredSandraRecipes]);

  const otherSavedRecipes = useMemo(
    () => cookableRecipes.filter((recipe) => !favoriteIds.has(recipe.id)),
    [cookableRecipes, favoriteIds]
  );

  const libraryCount = useMemo(() => {
    const ids = new Set(recipes.map((recipe) => recipe.id));
    let count = recipes.length;
    for (const recipe of sandraRecipes) {
      if (!ids.has(recipe.id)) count += 1;
    }
    return count;
  }, [recipes, sandraRecipes]);

  const isSearchActive = normalizeSearchText(searchTerm).length > 0;
  const isCategoryFilterActive = activeFilter !== "Todas";
  const shouldShowAllResults = mostrarTodas || isSearchActive || isCategoryFilterActive;

  const activeRecipes =
    activeTab === "favorites"
      ? favoriteRecipes
      : activeTab === "outside"
        ? outsideRecipes
        : activeTab === "sandra"
          ? filteredSandraRecipes
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
      const originBadge = resolveExternalMealBadge(recipe.tags);
      const cardLabel = originBadge
        ? null
        : translateSavedCardLabel(t, getRecipeCardLabel(recipe));
      const macros = parseMacrosFromJson(recipe.macros);
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
            originBadge={originBadge}
            originBadgeLabel={
              originBadge ? externalMealBadgeLabel(originBadge) : null
            }
            savedAtLabel={formatSavedDate(recipe.created_at, locale, (date) =>
              t("savedOn", { date })
            )}
            imageUrl={recipe.image_url}
            referenceImageUrl={recipe.reference_image_url}
            instagramUrl={recipe.instagram_url}
            cookingTimeMinutes={
              typeof recipe.cooking_time === "number" && recipe.cooking_time > 0
                ? recipe.cooking_time
                : null
            }
            macros={macros}
            isSocialVideo={Boolean(
              recipe.instagram_url && !recipe.image_url && !recipe.reference_image_url
            )}
            isSandraRecipe={Boolean(
              (recipe as RecipeRow & { is_sandra_recipe?: boolean }).is_sandra_recipe
            )}
            detailHref={`/app-recetas/recipes/${recipe.id}?from=recipes`}
            onPrefetch={() =>
              router.prefetch(`/app-recetas/recipes/${recipe.id}?from=recipes`)
            }
            isFavorite={favoriteIds.has(recipe.id)}
            onToggleFavorite={() => void handleToggleFavorite(recipe.id)}
            isTogglingFavorite={togglingFavoriteId === recipe.id}
            isFavoriteDisabled={Boolean(
              togglingFavoriteId && togglingFavoriteId !== recipe.id
            )}
            onShare={() => handleShareRecipe(recipe)}
            isSharing={sharingRecipeId === recipe.id}
            isShareDisabled={Boolean(sharingRecipeId && sharingRecipeId !== recipe.id)}
            onDelete={
              viewerUserId && recipe.user_id === viewerUserId
                ? () => void handleDeleteRecipe(recipe.id, recipe.title)
                : undefined
            }
            isDeleting={deletingRecipeId === recipe.id}
            isDeleteDisabled={Boolean(deletingRecipeId && deletingRecipeId !== recipe.id)}
            favoriteAriaLabel={
              favoriteIds.has(recipe.id) ? t("removeFavoriteAria") : t("addFavoriteAria")
            }
            deleteAriaLabel={t("deleteAria")}
            shareAriaLabel={t("shareAria")}
            editAriaLabel={t.has("editAria") ? t("editAria") : "Ver o editar receta"}
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
      togglingFavoriteId,
      viewerUserId
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

    if (recipes.length === 0 && sandraRecipes.length === 0) {
      return (
        <p className="rounded-xl bg-white/90 px-3 py-2 text-xs text-stone-500 shadow-sm">
          {t("empty")}
        </p>
      );
    }

    if (filteredRecipes.length === 0 && filteredSandraRecipes.length === 0) {
      return (
        <p className="rounded-xl bg-white/90 px-3 py-2 text-xs text-stone-500 shadow-sm">
          No encontré ninguna receta con ese nombre o ingrediente en tu biblioteca. ¡Prueba con otra palabra!
        </p>
      );
    }

    const emptyMessage =
      isCategoryFilterActive
        ? t("noFilterResults", {
            filter: translateSavedFilterChip(t, activeFilter)
          })
        : activeTab === "favorites"
          ? t("favoritesEmpty")
          : activeTab === "outside"
            ? t("outsideSectionEmpty")
            : activeTab === "sandra"
              ? t("sandraSectionEmpty")
              : t("savedSectionEmpty");

    return (
      <div className="space-y-3">
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
    activeFilter,
    isCategoryFilterActive,
    errorMessage,
    filteredRecipes.length,
    filteredSandraRecipes.length,
    isLoading,
    mostrarTodas,
    recipes.length,
    sandraRecipes.length,
    renderRecipeCard,
    shouldShowAllResults,
    t,
    visibleRecipes
  ]);

  const showLibraryChrome =
    !isLoading &&
    !errorMessage &&
    (recipes.length > 0 || sandraRecipes.length > 0) &&
    (filteredRecipes.length > 0 || filteredSandraRecipes.length > 0);

  const libraryTabs = (
    <div
      className="grid grid-cols-4 gap-1 sm:gap-1.5"
      role="tablist"
      aria-label={t("libraryTabsAria")}
    >
      {(
        [
          {
            id: "saved" as const,
            label: t("savedSection"),
            count: otherSavedRecipes.length,
            inactiveClass: "text-stone-700"
          },
          {
            id: "sandra" as const,
            label: t("sandraSection"),
            count: filteredSandraRecipes.length,
            inactiveClass: "text-stone-700"
          },
          {
            id: "favorites" as const,
            label: t("favoritesSection"),
            count: favoriteRecipes.length,
            inactiveClass: "text-stone-700"
          },
          {
            id: "outside" as const,
            label: t("outsideSection"),
            count: outsideRecipes.length,
            inactiveClass: "text-orange-800/80"
          }
        ] as const
      ).map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              setActiveTab(tab.id);
              setMostrarTodas(false);
            }}
            className={cn(
              "inline-flex min-w-0 items-center justify-center gap-1 rounded-full px-1.5 py-2 text-[11px] font-semibold transition sm:gap-1.5 sm:px-3 sm:text-xs",
              isActive
                ? "bg-[#E4ECDC] text-[#3e5219] ring-1 ring-[#88ab75]/35 shadow-sm shadow-stone-200/40"
                : cn(
                    "bg-white text-stone-700 ring-1 ring-stone-200/80 hover:bg-stone-50",
                    tab.inactiveClass
                  )
            )}
          >
            <span className="truncate">{tab.label}</span>
            <span
              className={cn(
                "shrink-0 text-[10px] font-bold tabular-nums sm:text-[11px]",
                isActive ? "text-[#9A7B2F]" : "text-stone-400"
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="-mx-4 min-h-full bg-gradient-to-b from-[#FBF8F3] via-amber-50/25 to-sv-surface px-4 pb-6 pt-1">
      <section className="space-y-3">
        <RecipeShareCaptureHost captureRef={captureRef} recipe={captureRecipe} mode="offscreen" />

        <header>
          <h1 className="font-serif text-xl font-semibold text-stone-900">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
            {t("subtitle", { count: libraryCount })}
          </p>
        </header>

        {pendingPlanAssignment ? (
          <div className="rounded-2xl border border-[#556B2F]/20 bg-[#F0F4ED]/90 px-4 py-3">
            <p className="text-sm font-semibold text-[#3e5219]">
              {tScanner.has("planningWeekTitle")
                ? tScanner("planningWeekTitle")
                : "Elige una receta para el plan"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              {tScanner.has("planningWeekHint")
                ? tScanner("planningWeekHint", {
                    slot: formatPendingPlanSlot(pendingPlanAssignment, tPlan, tScanner)
                  })
                : `Abre una receta y añádela a ${formatPendingPlanSlot(pendingPlanAssignment, tPlan, tScanner)}.`}
            </p>
            <button
              type="button"
              onClick={() => {
                clearPendingPlanAssignment();
                setPendingPlanAssignment(null);
              }}
              className="mt-2 text-xs font-medium text-stone-500 underline-offset-2 hover:underline"
            >
              Cancelar asignación
            </button>
          </div>
        ) : null}

        <div className="relative z-20 space-y-2.5 pb-1">
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
                className="w-full rounded-full border border-[#E8DFD2]/80 bg-gradient-to-r from-[#FBF6EE] via-white to-[#F7F1E6] px-4 py-2.5 pl-11 text-sm text-stone-700 shadow-sm outline-none placeholder:text-stone-400 transition focus:border-[#4C6B3F]/50 focus:ring-1 focus:ring-[#4C6B3F]/30"
              />
            </label>

            <div className="relative shrink-0" ref={filterMenuRef}>
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/70 bg-white text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
                aria-label={t("filterAria")}
                aria-expanded={isFilterMenuOpen}
              >
                <SlidersHorizontal size={16} strokeWidth={1.75} />
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

          {showLibraryChrome ? libraryTabs : null}
        </div>

        {isCategoryFilterActive ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#556B2F]/15 bg-[#F0F4ED] px-3 py-2">
            <p className="min-w-0 text-[12px] font-semibold text-[#3e5219]">
              {t("filterActiveLabel", {
                filter: translateSavedFilterChip(t, activeFilter)
              })}
              <span className="ml-1.5 font-medium text-[#556B2F]/80">
                · {t("filterActiveCount", { count: activeRecipes.length })}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setActiveFilter("Todas")}
              className="shrink-0 text-[11px] font-semibold text-[#556B2F] underline-offset-2 hover:underline"
            >
              {t("clearFilter")}
            </button>
          </div>
        ) : null}

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
