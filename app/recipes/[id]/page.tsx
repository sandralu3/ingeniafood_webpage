"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Heart, Loader2, Share2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ExternalMealDetailCard } from "@/components/plan/external-meal-detail-card";
import { RecipeAppliedFiltersBadges } from "@/components/recipes/recipe-applied-filters-badges";
import { RecipeInstagramAdminForm } from "@/components/recipes/recipe-instagram-admin-form";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import { AddToPlanSheet } from "@/components/scanner/add-to-plan-sheet";
import { RecipeResultHeroCard } from "@/components/scanner/recipe-result-hero-card";
import { RecipeShareCaptureHost } from "@/components/share/recipe-share-capture-host";
import { useShareRecipeImage } from "@/hooks/use-share-recipe-image";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { translateMealType } from "@/lib/i18n/filter-labels";
import { resolveExternalMealBadge } from "@/lib/plan/external-meal";
import { deleteSavedRecipe } from "@/lib/recipes/delete-saved-recipe";
import {
  isRecipeFavorite,
  toggleRecipeFavorite
} from "@/lib/recipes/recipe-favorites";
import { ingredientsJsonToDisplayStrings } from "@/lib/recipes/structured-ingredients";
import {
  parseStoredAppliedFilters
} from "@/lib/recipes/save-generated-recipe";
import { parseRecipeMealType } from "@/lib/recipes/premium-recipe-filters";
import { savedRecipeToShareable } from "@/lib/share/recipe-share-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

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
  "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,es_instagram,created_at,user_id,ingredients,steps,instructions,image_url,reference_image_url,tip_sandra,instagram_url,macros,meal_type,cuisine_style,servings,complexity,meal_type_advisory,tags" as const;

const RECIPE_DETAIL_COLUMNS_LEGACY =
  "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,es_instagram,created_at,user_id,ingredients,steps,instructions,image_url,tip_sandra,instagram_url,macros" as const;

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const t = useTranslations("RecipeDetail");
  const tScanner = useTranslations("Scanner");
  const router = useRouter();
  const [recipeId, setRecipeId] = useState<string>("");
  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [planSuccessMessage, setPlanSuccessMessage] = useState<string | null>(null);
  const {
    captureRef,
    captureRecipe,
    shareRecipeImage,
    isGenerating: isSharing,
    errorMessage: shareErrorMessage,
    clearError: clearShareError
  } = useShareRecipeImage();

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

      setIsAdmin(isSandraAdmin(user.email));

      const primaryQuery = await supabase
        .from("recipes")
        .select(RECIPE_DETAIL_COLUMNS)
        .eq("id", recipeId)
        .eq("user_id", user.id)
        .maybeSingle();

      let recipeData = primaryQuery.data as RecipeRow | null;
      let recipeError = primaryQuery.error;

      if (
        isMissingOptionalColumnError(recipeError, "reference_image_url") ||
        isMissingOptionalColumnError(recipeError, "meal_type") ||
        isMissingOptionalColumnError(recipeError, "tags")
      ) {
        const legacyQuery = await supabase
          .from("recipes")
          .select(RECIPE_DETAIL_COLUMNS_LEGACY)
          .eq("id", recipeId)
          .eq("user_id", user.id)
          .maybeSingle();

        recipeError = legacyQuery.error;
        recipeData = legacyQuery.data
          ? ({
              ...legacyQuery.data,
              reference_image_url: null,
              meal_type: null,
              cuisine_style: null,
              servings: null,
              complexity: null,
              meal_type_advisory: null,
              tags: null
            } as RecipeRow)
          : null;
      }

      if (isMissingOptionalColumnError(recipeError, "tip_sandra")) {
        const fallbackQuery = await supabase
          .from("recipes")
          .select(
            "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,instagram_url"
          )
          .eq("id", recipeId)
          .eq("user_id", user.id)
          .maybeSingle();

        recipeError = fallbackQuery.error;
        recipeData = fallbackQuery.data
          ? ({
              ...fallbackQuery.data,
              tip_sandra: null
            } as RecipeRow)
          : null;
      }

      if (isMissingOptionalColumnError(recipeError, "instagram_url")) {
        const fallbackQuery = await supabase
          .from("recipes")
          .select(
            "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,tip_sandra"
          )
          .eq("id", recipeId)
          .eq("user_id", user.id)
          .maybeSingle();

        recipeError = fallbackQuery.error;
        recipeData = fallbackQuery.data
          ? ({
              ...fallbackQuery.data,
              instagram_url: null
            } as RecipeRow)
          : null;
      }

      if (isMissingOptionalColumnError(recipeError, "macros")) {
        const fallbackQuery = await supabase
          .from("recipes")
          .select(
            "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,tip_sandra,instagram_url"
          )
          .eq("id", recipeId)
          .eq("user_id", user.id)
          .maybeSingle();

        recipeError = fallbackQuery.error;
        recipeData = fallbackQuery.data
          ? ({
              ...fallbackQuery.data,
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
      } else {
        setIsFavorite(false);
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

  const mealTypeLabel = useMemo(() => {
    const mealType =
      appliedFilters?.mealType ??
      (recipe?.meal_type ? parseRecipeMealType(recipe.meal_type) : null);
    return mealType ? translateMealType(tScanner, mealType) : null;
  }, [appliedFilters?.mealType, recipe?.meal_type, tScanner]);

  const handleToggleFavorite = useCallback(async () => {
    if (!recipe || isTogglingFavorite || isDeleting) return;

    setIsTogglingFavorite(true);
    setErrorMessage(null);

    const result = await toggleRecipeFavorite(recipe.id, isFavorite);

    if (result.success) {
      setIsFavorite(result.isFavorite);
    } else {
      setErrorMessage(result.error);
    }

    setIsTogglingFavorite(false);
  }, [isDeleting, isFavorite, isTogglingFavorite, recipe]);

  const handleDeleteRecipe = useCallback(async () => {
    if (!recipe || isDeleting || isTogglingFavorite || isSharing) return;

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
  }, [isDeleting, isSharing, isTogglingFavorite, recipe, router, t]);

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

  const actionsBusy = isTogglingFavorite || isDeleting || isSharing;

  return (
    <section className="space-y-5 pb-8">
      <RecipeShareCaptureHost captureRef={captureRef} recipe={captureRecipe} mode="offscreen" />

      <div className="flex items-center justify-between gap-3">
        <Link
          href={externalBadge ? "/app-recetas/plan" : "/app-recetas/recipes"}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#4c6633]/80 transition hover:text-[#4c6633]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          {externalBadge ? "Volver al plan" : t("backToRecipes")}
        </Link>

        {!isLoading && recipe && !externalBadge ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setPlanSuccessMessage(null);
                setIsPlanSheetOpen(true);
              }}
              disabled={actionsBusy}
              aria-label={t("assignToPlanAria")}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-[#556B2F] transition hover:bg-[#eef4e6]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <CalendarPlus className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={handleShareRecipe}
              disabled={actionsBusy}
              aria-label={t("shareAria")}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:text-[#556B2F]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {isSharing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleToggleFavorite()}
              disabled={actionsBusy}
              aria-label={isFavorite ? t("removeFavoriteAria") : t("addFavoriteAria")}
              aria-pressed={isFavorite}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
                isFavorite
                  ? "border-[#D07D62]/30 bg-[#D07D62]/10 text-[#D07D62] hover:bg-[#D07D62]/15"
                  : "border-stone-200 bg-white text-stone-400 hover:text-[#D07D62]",
                "disabled:cursor-not-allowed disabled:opacity-50"
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

            <button
              type="button"
              onClick={() => void handleDeleteRecipe()}
              disabled={actionsBusy}
              aria-label={t("deleteAria")}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
        ) : null}
      </div>

      {planSuccessMessage ? (
        <p className="rounded-xl border border-[#556B2F]/20 bg-[#eef4e6] px-3 py-2 text-xs text-[#3e5219]">
          {planSuccessMessage}
        </p>
      ) : null}

      {shareErrorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {shareErrorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-3/4 rounded-lg bg-stone-100" />
          <div className="h-32 rounded-2xl bg-stone-100" />
          <div className="h-48 rounded-2xl bg-stone-100" />
        </div>
      ) : null}

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

      {!isLoading && shareableRecipe && recipe && externalBadge ? (
        <div className="animate-detail-enter">
          <ExternalMealDetailCard
            title={recipe.title}
            badge={externalBadge}
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
        </div>
      ) : null}

      {!isLoading && shareableRecipe && recipe && !externalBadge ? (
        <article className="animate-detail-enter space-y-4">
          {recipe.instagram_url ? (
            <RecipeInstagramLink url={recipe.instagram_url} />
          ) : null}
          {appliedFilters ? (
            <div className="flex flex-wrap gap-1.5 px-0.5">
              <RecipeAppliedFiltersBadges
                filters={appliedFilters}
                omit={["mealType", "servings"]}
              />
            </div>
          ) : null}
          <RecipeResultHeroCard
            recipe={shareableRecipe}
            pantryIngredients={[]}
            mealTypeAdvisory={recipe.meal_type_advisory}
            appliedFilters={appliedFilters}
          />
          {isAdmin ? (
            <RecipeInstagramAdminForm
              recipeId={recipe.id}
              initialUrl={recipe.instagram_url}
              onUpdated={(url) => setRecipe((current) => (current ? { ...current, instagram_url: url } : current))}
            />
          ) : null}
        </article>
      ) : null}

      {!isLoading && recipe && !externalBadge ? (
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
