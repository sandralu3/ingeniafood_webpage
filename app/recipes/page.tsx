"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipesFilterSheet } from "@/components/recipes/recipes-filter-sheet";
import {
  RecipesLibrarySkeleton,
  RecipesSectionGridSkeleton
} from "@/components/skeletons/recipes-library-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
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
  clearRecipesScrollState,
  findAppScrollParent,
  getAppScrollRoot,
  parseRecipesLibraryTab,
  peekRecipesScrollState,
  recipeCardDomId,
  restoreRecipesScrollToCard,
  saveRecipesScrollState
} from "@/lib/recipes/recipes-scroll-restore";
import {
  countActiveSavedRecipeFilters,
  DEFAULT_SAVED_RECIPES_FILTER_STATE,
  filterSavedRecipes,
  getRecipeCardLabel,
  isRestrictiveDietFilter,
  normalizeSearchText,
  summarizeSavedRecipeFilters,
  type SavedRecipeExtraFilter,
  type SavedRecipeMealFilter,
  type SavedRecipesFilterState
} from "@/lib/recipes/saved-recipes-filter";
import { preferredDietLabel } from "@/lib/nutrition/preferred-diet";
import { fetchUserNutritionGoals } from "@/lib/nutrition/nutrition-profile";
import {
  externalMealBadgeLabel,
  isExternalMeal,
  resolveExternalMealBadge
} from "@/lib/plan/external-meal";
import { isScannerDraftRecipe, SCANNER_DRAFT_DESCRIPTION } from "@/lib/recipes/scanner-draft";
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

const CAROUSEL_PREVIEW = 4;

/** Columnas ligeras para el listado (sin blobs de ingredientes/pasos). */
const RECIPE_LIST_SELECT =
  "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,image_url,reference_image_url,instagram_url,meal_type,tags,macros,is_system_recipe,is_sandra_recipe";

const RECIPE_LIST_SELECT_FALLBACK =
  "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,image_url";

const RECIPE_SHARE_SELECT =
  "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,reference_image_url,tip_sandra,instagram_url,meal_type,tags,macros,is_system_recipe,is_sandra_recipe,meal_type_advisory";

function notScannerDraftFilter() {
  return `description.is.null,description.neq.${SCANNER_DRAFT_DESCRIPTION}`;
}

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
  const [filters, setFilters] = useState<SavedRecipesFilterState>(
    DEFAULT_SAVED_RECIPES_FILTER_STATE
  );
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [preferredDietLoaded, setPreferredDietLoaded] = useState(false);
  const [browseSection, setBrowseSection] = useState<LibraryTab | null>(() =>
    parseRecipesLibraryTab(
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : null
    )
  );
  const [pendingPlanAssignment, setPendingPlanAssignment] =
    useState<PendingPlanAssignment | null>(null);
  const [deletingRecipeId, setDeletingRecipeId] = useState<string | null>(null);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [enrichPending, setEnrichPending] = useState(0);
  const [isEnrichingMine, setIsEnrichingMine] = useState(false);
  const [enrichMineMessage, setEnrichMineMessage] = useState<string | null>(null);
  const [recipesReloadKey, setRecipesReloadKey] = useState(0);
  const pageRootRef = useRef<HTMLDivElement | null>(null);
  const didRestoreScrollRef = useRef(false);
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
    const tab = parseRecipesLibraryTab(searchParams.get("tab"));
    setBrowseSection(tab);
  }, [searchParams]);

  useEffect(() => {
    didRestoreScrollRef.current = false;
  }, [browseSection]);

  const rememberRecipeScroll = useCallback(
    (recipeId: string) => {
      const scrollParent =
        getAppScrollRoot() ?? findAppScrollParent(pageRootRef.current);
      saveRecipesScrollState({
        tab: browseSection,
        recipeId,
        scrollTop: scrollParent?.scrollTop ?? 0
      });
    },
    [browseSection]
  );

  const openSection = useCallback(
    (section: LibraryTab) => {
      setBrowseSection(section);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", section);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const closeSection = useCallback(() => {
    setBrowseSection(null);
    setSearchTerm("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    const query = params.toString();
    router.replace(query ? `?${query}` : "?", { scroll: false });
  }, [router, searchParams]);

  const runEnrichMine = useCallback(async () => {
    if (isEnrichingMine || enrichPending === 0) return;
    setIsEnrichingMine(true);
    setEnrichMineMessage(null);
    setActionMessage(null);

    try {
      let remaining = enrichPending;
      let totalUpdated = 0;

      while (remaining > 0) {
        const response = await fetch("/api/recipes/enrich-mine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 40 })
        });
        const payload = (await response.json().catch(() => ({}))) as {
          updated?: number;
          remaining?: number;
          processed?: number;
          error?: string;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? t("enrichMineError"));
        }

        const batchUpdated = payload.updated ?? 0;
        totalUpdated += batchUpdated;
        remaining = payload.remaining ?? 0;
        setEnrichPending(remaining);

        if (remaining > 0) {
          setEnrichMineMessage(
            t("enrichMineProgress", {
              updated: totalUpdated,
              remaining
            })
          );
        } else {
          setEnrichMineMessage(t("enrichMineDone", { count: totalUpdated }));
        }

        // Evita bucles si un lote no avanza (p. ej. error de escritura).
        if ((payload.processed ?? 0) === 0 || (batchUpdated === 0 && remaining > 0)) {
          break;
        }
      }

      setRecipesReloadKey((key) => key + 1);
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : t("enrichMineError")
      );
      setEnrichMineMessage(null);
    } finally {
      setIsEnrichingMine(false);
    }
  }, [enrichPending, isEnrichingMine, t]);

  const handleShareRecipe = useCallback(
    async (recipe: RecipeRow) => {
      clearShareError();
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from("recipes")
          .select(RECIPE_SHARE_SELECT)
          .eq("id", recipe.id)
          .maybeSingle();

        const fullRecipe = (!error && data ? (data as RecipeRow) : recipe);
        const shareable = savedRecipeToShareable({
          ...fullRecipe,
          ingredients: fullRecipe.ingredients ?? null,
          steps: fullRecipe.steps ?? null,
          instructions: fullRecipe.instructions ?? ""
        });
        void shareRecipeImage(shareable, { recipeId: recipe.id });
      } catch (error) {
        console.error("[recipes] share load:", error);
        const shareable = savedRecipeToShareable(recipe);
        void shareRecipeImage(shareable, { recipeId: recipe.id });
      }
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
        data: { session }
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        setErrorMessage("No encontramos tu sesion activa. Inicia sesion para ver tus recetas.");
        setRecipes([]);
        setSandraRecipes([]);
        setViewerUserId(null);
        setIsLoading(false);
        return;
      }

      setViewerUserId(user.id);

      const draftFilter = notScannerDraftFilter();

      const [primaryQuery, sandraQuery, favoritesResult] = await Promise.all([
        supabase
          .from("recipes")
          .select(RECIPE_LIST_SELECT)
          .eq("user_id", user.id)
          .or(draftFilter)
          .order("created_at", { ascending: false }),
        supabase
          .from("recipes")
          .select(RECIPE_LIST_SELECT)
          .eq("is_sandra_recipe", true)
          .or(draftFilter)
          .order("created_at", { ascending: false }),
        fetchFavoriteRecipeIds(user.id)
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
      setSandraRecipes(sandraData ?? []);

      let recipesData = primaryQuery.data as RecipeRow[] | null;
      let recipesError = primaryQuery.error;

      if (
        isMissingOptionalRecipesColumnError(recipesError, "reference_image_url") ||
        isMissingOptionalRecipesColumnError(recipesError, "meal_type") ||
        isMissingOptionalRecipesColumnError(recipesError, "tags") ||
        isMissingOptionalRecipesColumnError(recipesError, "is_system_recipe") ||
        isMissingOptionalRecipesColumnError(recipesError, "is_sandra_recipe") ||
        isMissingOptionalRecipesColumnError(recipesError, "macros") ||
        isMissingOptionalRecipesColumnError(recipesError, "instagram_url")
      ) {
        const fallbackQuery = await supabase
          .from("recipes")
          .select(RECIPE_LIST_SELECT_FALLBACK)
          .eq("user_id", user.id)
          .or(draftFilter)
          .order("created_at", { ascending: false });

        recipesError = fallbackQuery.error;
        recipesData = (fallbackQuery.data as RecipeRow[] | null)?.map((recipe) => ({
          ...recipe,
          tip_sandra: null,
          reference_image_url: null,
          meal_type: null,
          tags: null,
          macros: null,
          instagram_url: null,
          ingredients: null,
          steps: null,
          instructions: "",
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

      const owned = recipesData ?? [];
      const ownedIds = new Set(owned.map((recipe) => recipe.id));
      const missingFavoriteIds = Array.from(favoriteIdSet).filter((id) => !ownedIds.has(id));

      let merged = owned;
      if (missingFavoriteIds.length > 0) {
        const favoritedQuery = await supabase
          .from("recipes")
          .select(RECIPE_LIST_SELECT)
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
            .select(RECIPE_LIST_SELECT_FALLBACK)
            .in("id", missingFavoriteIds);
          if (!fallbackFavorites.error && fallbackFavorites.data) {
            const extras = (fallbackFavorites.data as RecipeRow[]).map((recipe) => ({
              ...recipe,
              tip_sandra: null,
              reference_image_url: null,
              meal_type: null,
              tags: null,
              macros: null,
              instagram_url: null,
              ingredients: null,
              steps: null,
              instructions: "",
              is_system_recipe: false,
              is_sandra_recipe: false
            }));
            merged = [
              ...owned,
              ...extras.filter((recipe) => !isScannerDraftRecipe(recipe))
            ];
          }
        }
      }

      setRecipes(merged);
      setIsLoading(false);

      // Banner opcional: no compite con el primer pintado de tarjetas.
      const scheduleEnrich =
        typeof window !== "undefined" && "requestIdleCallback" in window
          ? (cb: () => void) =>
              window.requestIdleCallback(() => cb(), { timeout: 2500 })
          : (cb: () => void) => window.setTimeout(cb, 600);

      scheduleEnrich(() => {
        void (async () => {
          try {
            const enrichResponse = await fetch("/api/recipes/enrich-mine");
            const enrichPayload = (await enrichResponse.json().catch(() => ({}))) as {
              pending?: number;
            };
            if (enrichResponse.ok) {
              const pending = enrichPayload.pending ?? 0;
              setEnrichPending(pending);
              if (pending === 0) {
                setEnrichMineMessage(null);
              }
            }
          } catch {
            // silencioso: el banner es opcional
          }
        })();
      });
    };

    void loadRecipes();
  }, [recipesReloadKey]);

  const filteredRecipes = useMemo(
    () =>
      filterSavedRecipes(recipes, {
        searchTerm,
        mealFilter: filters.mealFilter,
        extraFilter: filters.extraFilter,
        dietFilter: filters.dietFilter
      }),
    [filters, recipes, searchTerm]
  );

  const filteredSandraRecipes = useMemo(
    () =>
      filterSavedRecipes(sandraRecipes, {
        searchTerm,
        mealFilter: filters.mealFilter,
        extraFilter: filters.extraFilter,
        dietFilter: filters.dietFilter
      }),
    [filters, sandraRecipes, searchTerm]
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

  const libraryCount = useMemo(() => {
    const ids = new Set(recipes.map((recipe) => recipe.id));
    let count = recipes.length;
    for (const recipe of sandraRecipes) {
      if (!ids.has(recipe.id)) count += 1;
    }
    return count;
  }, [recipes, sandraRecipes]);

  const isSearchActive = normalizeSearchText(searchTerm).length > 0;
  const activeFilterCount = countActiveSavedRecipeFilters(filters);
  const isCategoryFilterActive = activeFilterCount > 0;
  const filterSummary = summarizeSavedRecipeFilters(
    filters,
    (meal) => translateSavedFilterChip(t, meal),
    (extra) => translateSavedFilterChip(t, extra),
    (diet) => preferredDietLabel(diet)
  );

  const librarySections = useMemo(
    () =>
      [
        {
          id: "saved" as const,
          label: t("savedSection"),
          recipes: cookableRecipes,
          empty: t("savedSectionEmpty")
        },
        {
          id: "sandra" as const,
          label: t("sandraSection"),
          recipes: filteredSandraRecipes,
          empty: t("sandraSectionEmpty")
        },
        {
          id: "favorites" as const,
          label: t("favoritesSection"),
          recipes: favoriteRecipes,
          empty: t("favoritesEmpty")
        },
        {
          id: "outside" as const,
          label: t("outsideSection"),
          recipes: outsideRecipes,
          empty: t("outsideSectionEmpty")
        }
      ] as const,
    [
      cookableRecipes,
      favoriteRecipes,
      filteredSandraRecipes,
      outsideRecipes,
      t
    ]
  );

  const activeSection = browseSection
    ? librarySections.find((section) => section.id === browseSection) ?? null
    : null;
  const activeRecipes = activeSection?.recipes ?? [];

  useEffect(() => {
    let active = true;
    const loadPreferredDiet = async () => {
      try {
        const supabase = createSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user || !active) return;
        const goals = await fetchUserNutritionGoals(user.id, supabase);
        if (!active || preferredDietLoaded) return;
        if (isRestrictiveDietFilter(goals.preferredDiet)) {
          setFilters((current) => ({
            ...current,
            dietFilter: goals.preferredDiet
          }));
        }
      } catch (error) {
        console.error("[recipes] preferred diet", error);
      } finally {
        if (active) setPreferredDietLoaded(true);
      }
    };
    void loadPreferredDiet();
    return () => {
      active = false;
    };
  }, [preferredDietLoaded]);

  useLayoutEffect(() => {
    if (isLoading || didRestoreScrollRef.current) return;

    const focusId = searchParams.get("focus")?.trim() || null;
    const saved = peekRecipesScrollState();
    const savedMatchesTab = Boolean(
      saved && (saved.tab ?? null) === (browseSection ?? null)
    );
    const targetId = focusId || (savedMatchesTab ? saved!.recipeId : null);
    if (!targetId && !savedMatchesTab) return;

    // En sección: esperar a que el grid tenga filas.
    if (browseSection && activeRecipes.length === 0 && targetId) return;

    let cancelled = false;
    /** Tras el primer restore OK, no cancelar reintentos por re-renders (enrich, etc.). */
    let committed = false;
    const timeoutIds: number[] = [];
    const deadline = Date.now() + 2200;
    const restoreArgs = {
      recipeId: targetId,
      fallbackScrollTop: savedMatchesTab ? saved!.scrollTop : null
    };

    const finish = () => {
      if (didRestoreScrollRef.current) return;
      didRestoreScrollRef.current = true;
      clearRecipesScrollState();
      if (focusId) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("focus");
        const query = params.toString();
        router.replace(query ? `?${query}` : "?", { scroll: false });
      }
    };

    const reapplyThenFinish = () => {
      committed = true;
      restoreRecipesScrollToCard(restoreArgs);
      window.setTimeout(() => {
        restoreRecipesScrollToCard(restoreArgs);
        window.setTimeout(() => {
          restoreRecipesScrollToCard(restoreArgs);
          finish();
        }, 180);
      }, 100);
    };

    const runRestore = () => {
      if (didRestoreScrollRef.current) return;
      if (cancelled && !committed) return;

      const card = targetId
        ? document.getElementById(recipeCardDomId(targetId))
        : null;
      const result = restoreRecipesScrollToCard(restoreArgs);

      if (result.ok && (card || (!targetId && savedMatchesTab))) {
        reapplyThenFinish();
        return;
      }

      if (cancelled && !committed) return;

      if (Date.now() < deadline && (result.needsMoreContent || !result.ok)) {
        timeoutIds.push(window.setTimeout(runRestore, 50));
        return;
      }

      finish();
    };

    runRestore();

    return () => {
      if (committed) return;
      cancelled = true;
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, [activeRecipes.length, browseSection, isLoading, router, searchParams]);

  const renderRecipeCard = useCallback(
    (
      recipe: RecipeRow,
      options?: { variant?: "row" | "tile"; className?: string }
    ) => {
      const originBadge = resolveExternalMealBadge(recipe.tags);
      const cardLabel = translateSavedCardLabel(t, getRecipeCardLabel(recipe));
      const macros = parseMacrosFromJson(recipe.macros);
      const variant = options?.variant ?? "tile";
      const detailQuery = new URLSearchParams({ from: "recipes" });
      if (browseSection) {
        detailQuery.set("tab", browseSection);
      }
      const detailHref = `/app-recetas/recipes/${recipe.id}?${detailQuery.toString()}`;

      return (
        <RecipeCard
          key={recipe.id}
          title={recipe.title}
          recipeId={recipe.id}
          variant={variant}
          className={cn(variant === "tile" ? "mb-0" : undefined, options?.className)}
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
          detailHref={detailHref}
          onPrefetch={() => router.prefetch(detailHref)}
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
      );
    },
    [
      browseSection,
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
      return browseSection ? (
        <RecipesSectionGridSkeleton />
      ) : (
        <RecipesLibrarySkeleton />
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

    if (browseSection && activeSection) {
      if (activeRecipes.length === 0) {
        return (
          <p className="rounded-xl border border-dashed border-stone-200/80 bg-white/70 px-3 py-2.5 text-[11px] text-stone-500">
            {isCategoryFilterActive || isSearchActive
              ? t("noFilterResults")
              : activeSection.empty}
          </p>
        );
      }

      return (
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {activeRecipes.map((recipe) => (
            <div
              key={recipe.id}
              id={recipeCardDomId(recipe.id)}
              className="min-w-0 scroll-mt-24"
              onPointerDown={() => rememberRecipeScroll(recipe.id)}
              onClickCapture={() => rememberRecipeScroll(recipe.id)}
            >
              {renderRecipeCard(recipe, { variant: "tile" })}
            </div>
          ))}
        </div>
      );
    }

    const visibleSections = librarySections.filter(
      (section) =>
        section.recipes.length > 0 ||
        section.id === "saved" ||
        section.id === "sandra"
    );

    if (
      visibleSections.every((section) => section.recipes.length === 0) &&
      (isSearchActive || isCategoryFilterActive)
    ) {
      return (
        <p className="rounded-xl bg-white/90 px-3 py-2 text-xs text-stone-500 shadow-sm">
          {t("noFilterResults")}
        </p>
      );
    }

    return (
      <div className="space-y-4" data-onboarding="recetas-tabs">
        {librarySections.map((section) => {
          if (section.recipes.length === 0) {
            if (section.id !== "saved" && section.id !== "sandra") return null;
            return (
              <section key={section.id} className="space-y-2">
                <div className="flex items-end justify-between gap-2 px-0.5">
                  <h2 className="text-sm font-semibold text-stone-900">{section.label}</h2>
                  <span className="text-[11px] font-bold tabular-nums text-stone-400">0</span>
                </div>
                <p className="rounded-xl border border-dashed border-stone-200/80 bg-white/70 px-3 py-2.5 text-[11px] text-stone-500">
                  {section.empty}
                </p>
              </section>
            );
          }

          const preview = section.recipes.slice(0, CAROUSEL_PREVIEW);
          const hasMore = section.recipes.length > CAROUSEL_PREVIEW;

          return (
            <section key={section.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <h2 className="text-[13px] font-semibold text-stone-900">{section.label}</h2>
                  <span className="text-[10px] font-semibold tabular-nums text-stone-400">
                    {section.recipes.length}
                  </span>
                </div>
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => openSection(section.id)}
                    data-onboarding={`recetas-view-more-${section.id}`}
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[#4C6B3F]/18 bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#4C6B3F] shadow-[0_1px_2px_rgba(76,107,63,0.06)] transition hover:border-[#4C6B3F]/35 hover:bg-[#F7F9F4]"
                  >
                    {t.has("viewSection") ? t("viewSection") : "Ver más"}
                    <ChevronRight className="h-3 w-3 opacity-70" strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openSection(section.id)}
                    data-onboarding={`recetas-view-more-${section.id}`}
                    className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold tracking-wide text-[#556B2F]/80 transition hover:text-[#3e5219]"
                  >
                    {t.has("viewSection") ? t("viewSection") : "Ver todas"}
                    <ChevronRight className="h-3 w-3 opacity-60" strokeWidth={2} />
                  </button>
                )}
              </div>

              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {preview.map((recipe) => (
                  <div
                    key={recipe.id}
                    id={recipeCardDomId(recipe.id)}
                    className="w-[36%] max-w-[9.5rem] shrink-0 scroll-mt-24 sm:w-40"
                    onPointerDown={() => rememberRecipeScroll(recipe.id)}
                    onClickCapture={() => rememberRecipeScroll(recipe.id)}
                  >
                    {renderRecipeCard(recipe, { variant: "tile" })}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }, [
    activeRecipes,
    activeSection,
    browseSection,
    errorMessage,
    isCategoryFilterActive,
    isLoading,
    isSearchActive,
    librarySections,
    openSection,
    rememberRecipeScroll,
    recipes.length,
    renderRecipeCard,
    sandraRecipes.length,
    t
  ]);

  return (
    <div
      ref={pageRootRef}
      className="-mx-4 min-h-full bg-gradient-to-b from-[#FBF8F3] via-amber-50/25 to-sv-surface px-4 pb-6 pt-1"
    >
      <section className="space-y-3">
        <RecipeShareCaptureHost captureRef={captureRef} recipe={captureRecipe} mode="offscreen" />

        <header>
          {browseSection && activeSection ? (
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={closeSection}
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm"
                aria-label={t.has("backToLibraryAria") ? t("backToLibraryAria") : "Volver al recetario"}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <h1 className="font-serif text-xl font-semibold text-stone-900">
                  {activeSection.label}
                </h1>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
                  {t("sectionSubtitle", { count: activeSection.recipes.length })}
                </p>
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-xl font-semibold text-stone-900">
                {t("title")}
              </h1>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
                {isLoading ? (
                  <Skeleton silent className="mt-0.5 h-3 w-40 rounded" />
                ) : (
                  t("subtitle", { count: libraryCount })
                )}
              </p>
            </>
          )}
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

        {browseSection ? (
          <div className="relative z-20 space-y-2.5 pb-1" data-onboarding="recetas-search">
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

              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(true)}
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors",
                  isCategoryFilterActive
                    ? "border-[#4C6B3F]/40 bg-[#F0F4ED] text-[#3e5219]"
                    : "border-stone-200/70 bg-white text-stone-600 hover:bg-stone-50"
                )}
                aria-label={t("filterAria")}
                aria-expanded={isFilterSheetOpen}
                data-onboarding="recetas-filter-types"
              >
                <SlidersHorizontal size={16} strokeWidth={1.75} />
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#556B2F] px-1 text-[9px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        ) : null}

        {browseSection && isCategoryFilterActive && filterSummary ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#556B2F]/15 bg-[#F0F4ED] px-3 py-2">
            <p className="min-w-0 text-[12px] font-semibold text-[#3e5219]">
              {t("filterActiveLabel", { filter: filterSummary })}
              <span className="ml-1.5 font-medium text-[#556B2F]/80">
                · {t("filterActiveCount", { count: activeRecipes.length })}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_SAVED_RECIPES_FILTER_STATE)}
              className="shrink-0 text-[11px] font-semibold text-[#556B2F] underline-offset-2 hover:underline"
            >
              {t("clearFilter")}
            </button>
          </div>
        ) : null}

        {enrichPending > 0 || (isEnrichingMine && enrichMineMessage) ? (
          <div className="rounded-xl border border-[#556B2F]/20 bg-[#F7F9F4] px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-[12px] leading-snug text-[#3e5219]">
                {enrichMineMessage ??
                  t("enrichMineHint", { count: enrichPending })}
              </p>
              {enrichPending > 0 ? (
                <button
                  type="button"
                  onClick={() => void runEnrichMine()}
                  disabled={isEnrichingMine}
                  className="shrink-0 rounded-lg bg-[#556B2F] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
                >
                  {isEnrichingMine ? t("enrichMineRunning") : t("enrichMineCta")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {pageContent}

        <RecipesFilterSheet
          open={isFilterSheetOpen}
          value={filters}
          onClose={() => setIsFilterSheetOpen(false)}
          onApply={(next) => {
            setFilters(next);
            setIsFilterSheetOpen(false);
          }}
          labels={{
            title: t("filterSheetTitle"),
            mealSection: t("filterSheetMeal"),
            dietSection: t("filterSheetDiet"),
            extraSection: t("filterSheetExtra"),
            dietAll: t("filterSheetDietAll"),
            clear: t("filterSheetClear"),
            apply: t("filterSheetApply"),
            closeAria: t("filterSheetClose"),
            mealLabel: (filter: SavedRecipeMealFilter) => translateSavedFilterChip(t, filter),
            extraLabel: (filter: SavedRecipeExtraFilter) => translateSavedFilterChip(t, filter)
          }}
        />

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

      <OnboardingOverlay page="recetas" />
    </div>
  );
}
