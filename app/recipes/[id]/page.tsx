"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { useRouter, useSearchParams } from "next/navigation";

import { ArrowLeft, Bookmark, CalendarPlus, Heart, Loader2, Share2, Trash2 } from "lucide-react";

import { useTranslations } from "next-intl";

import { ExternalMealDetailCard } from "@/components/plan/external-meal-detail-card";

import { RecipeAppliedFiltersBadges } from "@/components/recipes/recipe-applied-filters-badges";

import { RecipeInstagramAdminForm } from "@/components/recipes/recipe-instagram-admin-form";

import { PublishSandraRecipeButton } from "@/components/recipes/publish-sandra-recipe-button";

import { SandraRecipeBadge } from "@/components/recipes/sandra-recipe-badge";

import { SandraRecipeContentEditor } from "@/components/recipes/sandra-recipe-content-editor";

import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";

import { RecipeDetailSkeleton } from "@/components/skeletons/recipe-detail-skeleton";

import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";

import { AddToPlanSheet } from "@/components/scanner/add-to-plan-sheet";

import { RecipeResultHeroCard } from "@/components/scanner/recipe-result-hero-card";

import { RecipeShareCaptureHost } from "@/components/share/recipe-share-capture-host";

import { useShareRecipeImage } from "@/hooks/use-share-recipe-image";

import { usePremium } from "@/hooks/use-premium";

import { isSandraAdmin } from "@/lib/auth/sandra-admin";

import { translateMealType } from "@/lib/i18n/filter-labels";

import {

  EXTERNAL_MEAL_TAG,

  SCANNED_MEAL_TAG,

  resolveExternalMealBadge,

  externalMealBadgeLabel

} from "@/lib/plan/external-meal";

import { deleteSavedRecipe } from "@/lib/recipes/delete-saved-recipe";

import {

  addRecipeFavorite,

  isRecipeFavorite,

  toggleRecipeFavorite

} from "@/lib/recipes/recipe-favorites";

import {

  findSavedSystemRecipeCopyId,

  saveSystemRecipeToLibrary

} from "@/lib/recipes/save-system-recipe";

import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";

import {

  ingredientsJsonToDisplayStrings,

  stringsToStructuredIngredients,

  structuredIngredientsToJson

} from "@/lib/recipes/structured-ingredients";

import { jsonToStepList, savedRecipeToShareable } from "@/lib/share/recipe-share-utils";

import { APP_ROUTES } from "@/lib/navigation/app-routes";

import { completePendingPlanAssignment } from "@/lib/plan/complete-pending-assignment";

import {

  clearPendingPlanAssignment,

  readPendingPlanAssignment,

  type PendingPlanAssignment

} from "@/lib/plan/plan-pending-assignment";

import { formatPendingPlanSlot } from "@/lib/i18n/plan-pending-label";

import { createSupabaseClient } from "@/lib/supabaseClient";

import { cn } from "@/lib/utils";

import type { Database, Json } from "@/types/database.types";

import {

  parseStoredAppliedFilters

} from "@/lib/recipes/save-generated-recipe";

import { parseRecipeMealType } from "@/lib/recipes/premium-recipe-filters";



type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];



function isMissingOptionalColumnError(

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



const RECIPE_DETAIL_COLUMNS =

  "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,es_instagram,is_system_recipe,is_sandra_recipe,created_at,user_id,ingredients,steps,instructions,image_url,reference_image_url,tip_sandra,instagram_url,macros,meal_type,cuisine_style,servings,complexity,meal_type_advisory,tags" as const;



const RECIPE_DETAIL_COLUMNS_LEGACY =

  "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,es_instagram,created_at,user_id,ingredients,steps,instructions,image_url,tip_sandra,instagram_url,macros" as const;



type RecipeDetailPageProps = {

  params: Promise<{ id: string }>;

};



export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {

  const t = useTranslations("RecipeDetail");

  const tScanner = useTranslations("Scanner");

  const tPlan = useTranslations("Plan");

  const router = useRouter();

  const { isPremium, hasGeneratedRealPhoto } = usePremium();

  const [recipeId, setRecipeId] = useState<string>("");

  const [viewerUserId, setViewerUserId] = useState<string | null>(null);

  const [recipe, setRecipe] = useState<RecipeRow | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isFavorite, setIsFavorite] = useState(false);

  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);

  const [savedCopyId, setSavedCopyId] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);

  const [planSuccessMessage, setPlanSuccessMessage] = useState<string | null>(null);

  const [showPremiumDialog, setShowPremiumDialog] = useState(false);

  const [pendingPlanAssignment, setPendingPlanAssignment] =
    useState<PendingPlanAssignment | null>(null);

  const [isAssigningPending, setIsAssigningPending] = useState(false);

  const {

    captureRef,

    captureRecipe,

    shareRecipeImage,

    isGenerating: isSharing,

    errorMessage: shareErrorMessage,

    clearError: clearShareError

  } = useShareRecipeImage();



  useEffect(() => {

    setPendingPlanAssignment(readPendingPlanAssignment());

  }, []);



  useEffect(() => {

    let isMounted = true;



    const run = async () => {

      const resolvedParams = await params;

      if (isMounted) {

        setRecipeId(resolvedParams.id);

      }

    };



    void run();



    return () => {

      isMounted = false;

    };

  }, [params]);



  useEffect(() => {

    if (!recipeId) return;



    const loadRecipe = async () => {

      setIsLoading(true);

      setErrorMessage(null);



      let supabase;

      try {

        supabase = createSupabaseClient();

      } catch (error) {

        setErrorMessage(

          error instanceof Error

            ? error.message

            : t("loadError")

        );

        setIsLoading(false);

        return;

      }



      const {

        data: { user }

      } = await supabase.auth.getUser();



      if (!user) {

        setErrorMessage(t("sessionError"));

        setIsLoading(false);

        return;

      }



      setViewerUserId(user.id);

      setIsAdmin(isSandraAdmin(user.email));



      // Solo por id: RLS permite propia, pública o is_system_recipe (no filtrar por user_id).

      const fetchById = async (columns: string) =>

        supabase.from("recipes").select(columns).eq("id", recipeId).maybeSingle();



      let primaryQuery = await fetchById(RECIPE_DETAIL_COLUMNS);

      let recipeData = primaryQuery.data as RecipeRow | null;

      let recipeError = primaryQuery.error;



      if (

        isMissingOptionalColumnError(recipeError, "is_system_recipe") ||

        isMissingOptionalColumnError(recipeError, "is_sandra_recipe") ||

        isMissingOptionalColumnError(recipeError, "reference_image_url") ||

        isMissingOptionalColumnError(recipeError, "meal_type") ||

        isMissingOptionalColumnError(recipeError, "tags")

      ) {

        const legacyQuery = await fetchById(RECIPE_DETAIL_COLUMNS_LEGACY);

        recipeError = legacyQuery.error;

        recipeData = legacyQuery.data

          ? ({

              ...(legacyQuery.data as unknown as RecipeRow),

              reference_image_url: null,

              meal_type: null,

              cuisine_style: null,

              servings: null,

              complexity: null,

              meal_type_advisory: null,

              tags: null,

              is_system_recipe: false,

              is_sandra_recipe: false

            } as RecipeRow)

          : null;

      }



      if (isMissingOptionalColumnError(recipeError, "tip_sandra")) {

        const fallbackQuery = await fetchById(

          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,instagram_url"

        );

        recipeError = fallbackQuery.error;

        recipeData = fallbackQuery.data

          ? ({

              ...(fallbackQuery.data as unknown as RecipeRow),

              tip_sandra: null

            } as RecipeRow)

          : null;

      }



      if (isMissingOptionalColumnError(recipeError, "instagram_url")) {

        const fallbackQuery = await fetchById(

          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,tip_sandra"

        );

        recipeError = fallbackQuery.error;

        recipeData = fallbackQuery.data

          ? ({

              ...(fallbackQuery.data as unknown as RecipeRow),

              instagram_url: null

            } as RecipeRow)

          : null;

      }



      if (isMissingOptionalColumnError(recipeError, "macros")) {

        const fallbackQuery = await fetchById(

          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,tip_sandra,instagram_url"

        );

        recipeError = fallbackQuery.error;

        recipeData = fallbackQuery.data

          ? ({

              ...(fallbackQuery.data as unknown as RecipeRow),

              macros: null

            } as RecipeRow)

          : null;

      }



      if (recipeError) {

        setErrorMessage(t("loadError"));

        setRecipe(null);

        setIsLoading(false);

        return;

      }



      setRecipe(recipeData);

      if (recipeData) {

        const favorite = await isRecipeFavorite(recipeData.id);

        setIsFavorite(favorite);

        const isSystem =

          "is_system_recipe" in recipeData

            ? Boolean(

                (recipeData as RecipeRow & { is_system_recipe?: boolean }).is_system_recipe

              )

            : false;

        if (isSystem) {

          const copyId = await findSavedSystemRecipeCopyId(recipeData.id);

          setSavedCopyId(copyId);

        } else {

          setSavedCopyId(null);

        }

      } else {

        setIsFavorite(false);

        setSavedCopyId(null);

      }

      setIsLoading(false);

    };



    void loadRecipe();

  }, [recipeId, t]);



  const shareableRecipe = useMemo(

    () => (recipe ? savedRecipeToShareable(recipe) : null),

    [recipe]

  );



  const appliedFilters = useMemo(

    () => (recipe ? parseStoredAppliedFilters(recipe) : null),

    [recipe]

  );



  const externalBadge = useMemo(

    () => (recipe ? resolveExternalMealBadge(recipe.tags) : null),

    [recipe]

  );



  const cookingStepsCount = useMemo(() => {

    if (!recipe || !Array.isArray(recipe.steps)) return 0;

    return recipe.steps.filter(

      (step): step is string => typeof step === "string" && step.trim().length > 0

    ).length;

  }, [recipe]);



  /** Admin con pasos reales: mostrar receta completa (no solo ficha de comida fuera). */

  const showExternalMealLayout = Boolean(

    externalBadge && !(isAdmin && cookingStepsCount >= 2)

  );



  const mealTypeLabel = useMemo(() => {

    const mealType =

      appliedFilters?.mealType ??

      (recipe?.meal_type ? parseRecipeMealType(recipe.meal_type) : null);

    return mealType ? translateMealType(tScanner, mealType) : null;

  }, [appliedFilters?.mealType, recipe?.meal_type, tScanner]);



  const handleToggleFavorite = useCallback(async () => {

    if (!recipe || isTogglingFavorite || isDeleting || isSavingToLibrary) return;



    setIsTogglingFavorite(true);

    setErrorMessage(null);



    const result = await toggleRecipeFavorite(recipe.id, isFavorite);



    if (result.success) {

      setIsFavorite(result.isFavorite);

    } else {

      setErrorMessage(result.error);

    }



    setIsTogglingFavorite(false);

  }, [isDeleting, isFavorite, isSavingToLibrary, isTogglingFavorite, recipe]);



  const handleSaveSystemRecipe = useCallback(async () => {

    if (!recipe || isSavingToLibrary || isDeleting || isTogglingFavorite) return;



    setIsSavingToLibrary(true);

    setErrorMessage(null);

    setPlanSuccessMessage(null);



    const result = await saveSystemRecipeToLibrary(recipe.id);



    if (!result.success) {

      setErrorMessage(result.error);

      setIsSavingToLibrary(false);

      return;

    }



    setSavedCopyId(result.recipeId);



    // También marcar favorito sobre la receta del banco (y la copia si hace falta).

    if (!isFavorite) {

      const fav = await addRecipeFavorite(recipe.id);

      if (fav.success) {

        setIsFavorite(true);

      }

    }



    setPlanSuccessMessage(

      result.alreadySaved ? t("alreadyInLibrary") : t("savedToLibrary")

    );

    setIsSavingToLibrary(false);

  }, [isDeleting, isFavorite, isSavingToLibrary, isTogglingFavorite, recipe, t]);



  const handleDeleteRecipe = useCallback(async () => {

    if (!recipe || isDeleting || isTogglingFavorite || isSharing || isSavingToLibrary) return;



    const confirmed = window.confirm(t("deleteConfirm", { title: recipe.title }));

    if (!confirmed) return;



    setIsDeleting(true);

    setErrorMessage(null);



    const result = await deleteSavedRecipe(recipe.id);



    if (result.success) {

      router.push("/app-recetas/recipes");

      return;

    }



    setErrorMessage(result.error);

    setIsDeleting(false);

  }, [isDeleting, isSavingToLibrary, isSharing, isTogglingFavorite, recipe, router, t]);



  const handleShareRecipe = useCallback(() => {

    if (!recipe || !shareableRecipe || isSharing || isDeleting) return;

    clearShareError();

    setPlanSuccessMessage(null);

    void shareRecipeImage(shareableRecipe, { recipeId: recipe.id });

  }, [

    clearShareError,

    isDeleting,

    isSharing,

    recipe,

    shareRecipeImage,

    shareableRecipe

  ]);



  const persistRecipeId = useCallback(async () => recipe?.id ?? null, [recipe]);



  const handleAssignPendingToPlan = useCallback(async () => {

    if (!recipe || !pendingPlanAssignment || isAssigningPending) return;

    setIsAssigningPending(true);

    setPlanSuccessMessage(null);

    try {

      const supabase = createSupabaseClient();

      const {

        data: { user }

      } = await supabase.auth.getUser();

      if (!user) {

        setPlanSuccessMessage("Inicia sesión para añadir esta receta al plan.");

        return;

      }

      const assignment = await completePendingPlanAssignment(user.id, recipe.id);

      setPendingPlanAssignment(null);

      if (assignment.assigned && assignment.pending) {

        setPlanSuccessMessage(

          tScanner.has("savedAndAssigned")

            ? tScanner("savedAndAssigned", {

                slot: formatPendingPlanSlot(assignment.pending, tPlan, tScanner)

              })

            : `Receta añadida a ${formatPendingPlanSlot(assignment.pending, tPlan, tScanner)}.`

        );

        window.setTimeout(() => {

          router.push(APP_ROUTES.plan);

        }, 700);

        return;

      }

      setPlanSuccessMessage(

        tScanner.has("savedAssignFailed")

          ? tScanner("savedAssignFailed")

          : "No pudimos asignar la receta al plan."

      );

    } catch (error) {

      console.error("[recipe-detail] Error asignando al plan pendiente:", error);

      setPlanSuccessMessage(

        tScanner.has("savedAssignFailed")

          ? tScanner("savedAssignFailed")

          : "No pudimos asignar la receta al plan."

      );

    } finally {

      setIsAssigningPending(false);

    }

  }, [

    isAssigningPending,

    pendingPlanAssignment,

    recipe,

    router,

    tPlan,

    tScanner

  ]);



  const actionsBusy =

    isTogglingFavorite || isDeleting || isSharing || isSavingToLibrary || isAssigningPending;

  const isOwnedRecipe = Boolean(recipe && viewerUserId && recipe.user_id === viewerUserId);

  const isSystemRecipe = Boolean(

    recipe &&

      ("is_system_recipe" in recipe

        ? (recipe as RecipeRow & { is_system_recipe?: boolean }).is_system_recipe

        : false)

  );

  const isSandraRecipe = Boolean(

    recipe &&

      ("is_sandra_recipe" in recipe

        ? (recipe as RecipeRow & { is_sandra_recipe?: boolean }).is_sandra_recipe

        : false)

  );

  const isSavedToLibrary = Boolean(savedCopyId);

  const canPublishAsSandra =

    isAdmin && isOwnedRecipe && Boolean(recipe) && !isSandraRecipe;

  const isPublicInstagramRecipe = Boolean(
    recipe &&
      ("es_instagram" in recipe
        ? (recipe as RecipeRow & { es_instagram?: boolean }).es_instagram
        : false) &&
      recipe.is_public
  );

  const canEditSandraContent =
    isAdmin &&
    Boolean(recipe) &&
    (isOwnedRecipe || isSandraRecipe || isPublicInstagramRecipe);



  const adminEditIngredients = useMemo(

    () => (recipe ? ingredientsJsonToDisplayStrings(recipe.ingredients) : []),

    [recipe]

  );

  const adminEditSteps = useMemo(() => {

    if (!recipe) return [];

    const fromSteps = jsonToStepList(recipe.steps as Json);

    if (fromSteps.length > 0) return fromSteps;

    return (recipe.instructions || "")

      .split(/\n+/)

      .map((line) => line.replace(/^\d+\.\s*/, "").trim())

      .filter(Boolean);

  }, [recipe]);



  const handleSandraContentSaved = useCallback(

    (payload: { ingredients: string[]; steps: string[]; mealType: string }) => {

      setRecipe((current) => {

        if (!current) return current;

        const instructions = payload.steps

          .map((step, index) => `${index + 1}. ${step}`)

          .join("\n");

        const mealMoment = /^(desayuno|cena|snack|almuerzo|postre)$/i;

        const nextTags = normalizeRecipeTags(current.tags)

          .filter((tag) => !mealMoment.test(tag))

          .concat(payload.mealType);

        return {

          ...current,

          ingredients: structuredIngredientsToJson(

            stringsToStructuredIngredients(payload.ingredients)

          ),

          steps: payload.steps,

          instructions,

          meal_type: payload.mealType,

          tags: nextTags

        };

      });

    },

    []

  );



  const handlePublishedAsSandra = useCallback(() => {

    setRecipe((current) => {

      if (!current) return current;

      const cleanedTags = normalizeRecipeTags(current.tags).filter((tag) => {

        const lower = tag.toLowerCase();

        return (

          lower !== EXTERNAL_MEAL_TAG &&

          lower !== SCANNED_MEAL_TAG &&

          lower !== "comida fuera"

        );

      });

      return {

        ...current,

        tags: cleanedTags,

        reference_image_url: null,

        is_system_recipe: true,

        is_sandra_recipe: true,

        is_public: true

      };

    });

    setPlanSuccessMessage(t("publishSandraSuccess"));

  }, [t]);


  const searchParams = useSearchParams();

  const fromParam = (searchParams.get("from") || "").toLowerCase();

  const backNav =

    fromParam === "plan"

      ? { href: "/app-recetas/plan", label: "Volver al plan" }

      : fromParam === "hoy"

        ? { href: "/app-recetas/hoy", label: t.has("backToHoy") ? t("backToHoy") : "Volver a Hoy" }

        : fromParam === "recipes"

          ? { href: "/app-recetas/recipes", label: t("backToRecipes") }

          : externalBadge || isSystemRecipe

            ? { href: "/app-recetas/plan", label: "Volver al plan" }

            : { href: "/app-recetas/recipes", label: t("backToRecipes") };

  const backHref = backNav.href;

  const backLabel = backNav.label;

  const overlayBtnClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white shadow-sm backdrop-blur-sm ring-1 ring-white/25 transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50";

  const recipeHeroChrome =
    !isLoading && recipe && (!showExternalMealLayout || Boolean(recipe.image_url?.trim())) ? (
      <>
        <Link
          href={backHref}
          aria-label={backLabel}
          className={overlayBtnClass}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPlanSuccessMessage(null);
              if (pendingPlanAssignment) {
                void handleAssignPendingToPlan();
                return;
              }
              setIsPlanSheetOpen(true);
            }}
            disabled={actionsBusy}
            aria-label={t("assignToPlanAria")}
            className={overlayBtnClass}
          >
            {isAssigningPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>

          <button
            type="button"
            onClick={handleShareRecipe}
            disabled={actionsBusy}
            aria-label={t("shareAria")}
            className={overlayBtnClass}
          >
            {isSharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>

          {isSystemRecipe ? (
            <button
              type="button"
              onClick={() => void handleSaveSystemRecipe()}
              disabled={actionsBusy || isSavedToLibrary}
              aria-label={isSavedToLibrary ? t("alreadyInLibraryAria") : t("saveToLibraryAria")}
              title={isSavedToLibrary ? t("alreadyInLibrary") : t("saveToLibrary")}
              className={cn(
                overlayBtnClass,
                isSavedToLibrary && "bg-[#556B2F]/85 ring-[#eef4e6]/40"
              )}
            >
              {isSavingToLibrary ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bookmark
                  className={cn("h-4 w-4", isSavedToLibrary ? "fill-current" : "")}
                  strokeWidth={1.5}
                />
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => void handleToggleFavorite()}
            disabled={actionsBusy}
            aria-label={isFavorite ? t("removeFavoriteAria") : t("addFavoriteAria")}
            aria-pressed={isFavorite}
            className={cn(
              overlayBtnClass,
              isFavorite && "bg-[#D07D62]/85 ring-[#D07D62]/30"
            )}
          >
            {isTogglingFavorite ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart
                className={cn("h-4 w-4", isFavorite ? "fill-current" : "")}
                strokeWidth={1.5}
              />
            )}
          </button>

          {isOwnedRecipe && !isSystemRecipe ? (
            <button
              type="button"
              onClick={() => void handleDeleteRecipe()}
              disabled={actionsBusy}
              aria-label={t("deleteAria")}
              className={cn(overlayBtnClass, "hover:bg-red-600/80")}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          ) : null}
        </div>
      </>
    ) : null;

  const showHeroDetail =
    !isLoading &&
    Boolean(
      shareableRecipe &&
        recipe &&
        (!showExternalMealLayout || Boolean(recipe.image_url?.trim()))
    );

  return (
    <section
      className={cn(
        "pb-8",
        showHeroDetail ? "-mx-4 -mt-3 space-y-3" : "space-y-4"
      )}
    >
      <RecipeShareCaptureHost captureRef={captureRef} recipe={captureRecipe} mode="offscreen" />

      {!showHeroDetail ? (
        <div className="flex items-center justify-between gap-3 px-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#4c6633]/80 transition hover:text-[#4c6633]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            {backLabel}
          </Link>
        </div>
      ) : null}

      {!showHeroDetail && planSuccessMessage ? (
        <p className="rounded-xl border border-[#556B2F]/20 bg-[#eef4e6] px-3 py-2 text-xs text-[#3e5219]">
          {planSuccessMessage}
        </p>
      ) : null}

      {!showHeroDetail && shareErrorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {shareErrorMessage}
        </p>
      ) : null}

      {isLoading ? <RecipeDetailSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <p className="rounded-2xl border border-stone-100 bg-white p-5 text-sm text-stone-600 shadow-sm">
          {errorMessage}
        </p>
      ) : null}

      {!isLoading && !errorMessage && !recipe ? (
        <p className="rounded-2xl border border-stone-100 bg-white p-5 text-sm text-stone-600 shadow-sm">
          {t("notFound")}
        </p>
      ) : null}

      {!isLoading && shareableRecipe && recipe && showExternalMealLayout ? (
        <div className={cn("animate-detail-enter", showHeroDetail ? "space-y-3" : "space-y-4")}>
          {recipe.image_url?.trim() ? (
            <RecipeResultHeroCard
              recipe={shareableRecipe}
              pantryIngredients={[]}
              mealTypeAdvisory={recipe.meal_type_advisory || recipe.tip_sandra}
              appliedFilters={appliedFilters}
              heroBadge={externalBadge ? externalMealBadgeLabel(externalBadge) : undefined}
              loggedMeal
              layout="hero"
              heroChrome={recipeHeroChrome}
              isPremium={isPremium}
              hasGeneratedRealPhoto={hasGeneratedRealPhoto}
              onRequestPremium={() => setShowPremiumDialog(true)}
            />
          ) : (
            <ExternalMealDetailCard
              title={recipe.title}
              badge={externalBadge!}
              imageUrl={recipe.image_url}
              calories={shareableRecipe.macronutrientes?.calorias ?? null}
              proteinGrams={shareableRecipe.macronutrientes?.proteinas_g ?? null}
              mealTypeLabel={mealTypeLabel}
              foodLines={ingredientsJsonToDisplayStrings(recipe.ingredients)}
              recommendations={(
                recipe.meal_type_advisory ||
                recipe.tip_sandra ||
                ""
              )
                .split(/\n+/)
                .map((tip) => tip.trim())
                .filter((tip) => tip.length >= 8)}
            />
          )}
          {canEditSandraContent ? (
            <div className={showHeroDetail ? "px-4" : undefined}>
              <SandraRecipeContentEditor
                recipeId={recipe.id}
                initialIngredients={adminEditIngredients}
                initialSteps={adminEditSteps}
                initialMealType={recipe.meal_type}
                disabled={actionsBusy}
                onSaved={handleSandraContentSaved}
              />
            </div>
          ) : null}
          {canPublishAsSandra ? (
            <div className={showHeroDetail ? "px-4" : undefined}>
              <PublishSandraRecipeButton
                recipeId={recipe.id}
                disabled={actionsBusy}
                onPublished={handlePublishedAsSandra}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {showHeroDetail && shareableRecipe && recipe ? (
        <article className="animate-detail-enter space-y-3">
          <RecipeResultHeroCard
            recipe={shareableRecipe}
            pantryIngredients={[]}
            mealTypeAdvisory={recipe.meal_type_advisory}
            appliedFilters={appliedFilters}
            isPremium={isPremium}
            hasGeneratedRealPhoto={hasGeneratedRealPhoto}
            isSandraRecipe={isSandraRecipe}
            onRequestPremium={() => setShowPremiumDialog(true)}
            layout="hero"
            heroChrome={recipeHeroChrome}
            heroMediaOverlay={
              recipe.instagram_url ? (
                <RecipeInstagramLink url={recipe.instagram_url} variant="floating" />
              ) : null
            }
            headerBadges={
              isSandraRecipe || appliedFilters ? (
                <>
                  {isSandraRecipe ? <SandraRecipeBadge /> : null}
                  {appliedFilters ? (
                    <RecipeAppliedFiltersBadges
                      filters={appliedFilters}
                      omit={["mealType", "servings"]}
                    />
                  ) : null}
                </>
              ) : null
            }
          />
          {canEditSandraContent ? (
            <div className="px-4">
              <SandraRecipeContentEditor
                recipeId={recipe.id}
                initialIngredients={adminEditIngredients}
                initialSteps={adminEditSteps}
                initialMealType={recipe.meal_type}
                disabled={actionsBusy}
                onSaved={handleSandraContentSaved}
              />
            </div>
          ) : null}
          {canPublishAsSandra ? (
            <div className="px-4">
              <PublishSandraRecipeButton
                recipeId={recipe.id}
                disabled={actionsBusy}
                onPublished={handlePublishedAsSandra}
              />
            </div>
          ) : null}
          {isAdmin ? (
            <div className="px-4">
              <RecipeInstagramAdminForm
                recipeId={recipe.id}
                initialUrl={recipe.instagram_url}
                onUpdated={(url) =>
                  setRecipe((current) => (current ? { ...current, instagram_url: url } : current))
                }
              />
            </div>
          ) : null}
        </article>
      ) : null}

      {showHeroDetail && pendingPlanAssignment ? (
        <div className="mx-4 rounded-xl border border-[#556B2F]/20 bg-[#F0F4ED]/90 px-3 py-3">
          <p className="text-xs font-semibold text-[#3e5219]">
            {tScanner.has("planningWeekTitle")
              ? tScanner("planningWeekTitle")
              : "Asignar al plan"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            {tScanner.has("planningWeekHint")
              ? tScanner("planningWeekHint", {
                  slot: formatPendingPlanSlot(pendingPlanAssignment, tPlan, tScanner)
                })
              : `Se añadirá a ${formatPendingPlanSlot(pendingPlanAssignment, tPlan, tScanner)}.`}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={actionsBusy}
              onClick={() => void handleAssignPendingToPlan()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#556B2F] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {isAssigningPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              Añadir a este hueco
            </button>
            <button
              type="button"
              disabled={actionsBusy}
              onClick={() => {
                clearPendingPlanAssignment();
                setPendingPlanAssignment(null);
              }}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {showHeroDetail && planSuccessMessage ? (
        <p className="mx-4 rounded-xl border border-[#556B2F]/20 bg-[#eef4e6] px-3 py-2 text-xs text-[#3e5219]">
          {planSuccessMessage}
        </p>
      ) : null}

      {showHeroDetail && shareErrorMessage ? (
        <p className="mx-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {shareErrorMessage}
        </p>
      ) : null}

      {!isLoading && recipe && !showExternalMealLayout ? (
        <AddToPlanSheet
          isOpen={isPlanSheetOpen}
          onClose={() => setIsPlanSheetOpen(false)}
          persistRecipeId={persistRecipeId}
          onSuccess={(message) => {
            setPlanSuccessMessage(message);
            setIsPlanSheetOpen(false);
          }}
        />
      ) : null}

      <PremiumUpgradeDialog
        open={showPremiumDialog}
        onClose={() => setShowPremiumDialog(false)}
        featureLabel={t("realPhotoFeature")}
      />

      <style jsx>{`
        @keyframes detailEnter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-detail-enter {
          animation: detailEnter 280ms ease-out both;
        }
      `}</style>
    </section>
  );
}
