"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Loader2 } from "lucide-react";
import { RecipeDetailMagazine } from "@/components/recipes/recipe-detail-magazine";
import { RecipeInstagramAdminForm } from "@/components/recipes/recipe-instagram-admin-form";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { handleRemoveFromFavorites } from "@/lib/recipes/remove-from-favorites";
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
    error.message?.includes(`column recipes.${column} does not exist`) === true
  );
}

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const router = useRouter();
  const [recipeId, setRecipeId] = useState<string>("");
  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
            : "No se pudo inicializar Supabase. Revisa tus variables de entorno."
        );
        setIsLoading(false);
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("No encontramos tu sesión activa. Inicia sesión para ver la receta.");
        setIsLoading(false);
        return;
      }

      setIsAdmin(isSandraAdmin(user.email));

      const primaryQuery = await supabase
        .from("recipes")
        .select(
          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,tip_sandra,instagram_url"
        )
        .eq("id", recipeId)
        .eq("user_id", user.id)
        .maybeSingle();

      let recipeData = primaryQuery.data as RecipeRow | null;
      let recipeError = primaryQuery.error;

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

      if (recipeError) {
        setErrorMessage("No pudimos cargar el detalle de la receta. Inténtalo de nuevo.");
        setRecipe(null);
        setIsLoading(false);
        return;
      }

      setRecipe(recipeData);
      setIsFavorite(Boolean(recipeData));
      setIsLoading(false);
    };

    void loadRecipe();
  }, [recipeId]);

  const shareableRecipe = useMemo(
    () => (recipe ? savedRecipeToShareable(recipe) : null),
    [recipe]
  );

  const handleRemoveFavorite = useCallback(async () => {
    if (!recipe || isRemoving || !isFavorite) return;

    setIsRemoving(true);
    setErrorMessage(null);

    const result = await handleRemoveFromFavorites(recipe.id);

    if (result.success) {
      setIsFavorite(false);
      router.push("/app-recetas/recipes");
      return;
    }

    setErrorMessage(result.error);
    setIsRemoving(false);
  }, [isFavorite, isRemoving, recipe, router]);

  return (
    <section className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/app-recetas/recipes"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#4c6633]/80 transition hover:text-[#4c6633]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Volver a Mis Recetas
        </Link>

        {!isLoading && recipe ? (
          <button
            type="button"
            onClick={() => void handleRemoveFavorite()}
            disabled={isRemoving || !isFavorite}
            aria-label={isFavorite ? "Quitar de favoritos" : "Receta no guardada"}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
              isFavorite
                ? "border-[#4c6633]/15 bg-[#4c6633]/5 text-[#4c6633] hover:bg-[#4c6633]/10"
                : "border-stone-200 bg-white text-stone-400",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart
                className={cn("h-4 w-4", isFavorite ? "fill-current" : "")}
                strokeWidth={1.5}
              />
            )}
          </button>
        ) : null}
      </div>

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
          No encontramos esa receta en tu historial.
        </p>
      ) : null}

      {!isLoading && shareableRecipe && recipe ? (
        <article className="animate-detail-enter space-y-5">
          {recipe.instagram_url ? (
            <RecipeInstagramLink url={recipe.instagram_url} />
          ) : null}
          <RecipeDetailMagazine recipe={shareableRecipe} />
          {isAdmin ? (
            <RecipeInstagramAdminForm
              recipeId={recipe.id}
              initialUrl={recipe.instagram_url}
              onUpdated={(url) => setRecipe((current) => (current ? { ...current, instagram_url: url } : current))}
            />
          ) : null}
        </article>
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
