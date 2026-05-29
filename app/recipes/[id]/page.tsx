"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecipeDetailMagazine } from "@/components/recipes/recipe-detail-magazine";
import { savedRecipeToShareable } from "@/lib/share/recipe-share-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database } from "@/types/database.types";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

function isMissingTipSandraColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.message?.includes("column recipes.tip_sandra does not exist") === true;
}

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const [recipeId, setRecipeId] = useState<string>("");
  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      const primaryQuery = await supabase
        .from("recipes")
        .select(
          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,tip_sandra"
        )
        .eq("id", recipeId)
        .eq("user_id", user.id)
        .maybeSingle();

      let recipeData = primaryQuery.data as RecipeRow | null;
      let recipeError = primaryQuery.error;

      if (isMissingTipSandraColumnError(recipeError)) {
        const fallbackQuery = await supabase
          .from("recipes")
          .select(
            "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url"
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

      if (recipeError) {
        setErrorMessage("No pudimos cargar el detalle de la receta. Inténtalo de nuevo.");
        setRecipe(null);
        setIsLoading(false);
        return;
      }

      setRecipe(recipeData);
      setIsLoading(false);
    };

    void loadRecipe();
  }, [recipeId]);

  const shareableRecipe = useMemo(
    () => (recipe ? savedRecipeToShareable(recipe) : null),
    [recipe]
  );

  return (
    <section className="space-y-5 pb-8">
      <Link
        href="/app-recetas/recipes"
        className="inline-flex items-center gap-2 text-xs font-medium text-[#4c6633]/80 transition hover:text-[#4c6633]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        Volver a Mis Recetas
      </Link>

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
        <article className="animate-detail-enter">
          <RecipeDetailMagazine
            recipe={shareableRecipe}
            showFlourlessTag={recipe.is_flourless}
            showAirfryerTag={recipe.is_airfryer}
          />
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
