"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database, Json } from "@/types/database.types";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

function isMissingTipSandraColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.message?.includes("column recipes.tip_sandra does not exist") === true;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function jsonToList(value: Json): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
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
        setErrorMessage("No encontramos tu sesion activa. Inicia sesion para ver la receta.");
        setIsLoading(false);
        return;
      }

      const primaryQuery = await supabase
        .from("recipes")
        .select(
          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,instructions,image_url,tip_sandra"
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
            "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,instructions,image_url"
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
        setErrorMessage("No pudimos cargar el detalle de la receta. Intentalo de nuevo.");
        setRecipe(null);
        setIsLoading(false);
        return;
      }

      setRecipe(recipeData);
      setIsLoading(false);
    };

    void loadRecipe();
  }, [recipeId]);

  const ingredients = useMemo(() => (recipe ? jsonToList(recipe.ingredients) : []), [recipe]);
  const instructions = useMemo(
    () =>
      recipe?.instructions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean) ?? [],
    [recipe]
  );

  return (
    <section className="space-y-4">
      <Link
        href="/app-recetas/recipes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#4A6044] transition-colors hover:text-[#3E5239]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Mis Recetas
      </Link>

      {isLoading ? (
        <p className="rounded-2xl border border-brand-green-light/25 bg-white/70 p-4 text-sm text-brand-green-dark/80">
          Cargando receta...
        </p>
      ) : null}

      {!isLoading && errorMessage ? (
        <p className="rounded-2xl border border-brand-green-light/35 bg-white/80 p-4 text-sm font-medium text-brand-green-dark">
          {errorMessage}
        </p>
      ) : null}

      {!isLoading && !errorMessage && !recipe ? (
        <p className="rounded-2xl border border-brand-green-light/25 bg-white/70 p-4 text-sm text-brand-green-dark/80">
          No encontramos esa receta en tu historial.
        </p>
      ) : null}

      {recipe ? (
        <article className="animate-detail-enter space-y-5 rounded-2xl bg-white p-5 shadow-sm">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold text-brand-green-dark">{recipe.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>{formatDate(recipe.created_at)}</span>
              {recipe.cooking_time ? (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-4 w-4 text-[#4A6044]" />
                  {recipe.cooking_time} min
                </span>
              ) : null}
            </div>
          </header>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#4A6044]">Ingredientes</h2>
            {ingredients.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
                {ingredients.map((ingredient) => (
                  <li key={ingredient}>{ingredient}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-600">No hay ingredientes registrados.</p>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#4A6044]">Pasos</h2>
            {instructions.length > 0 ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700">
                {instructions.map((step, index) => (
                  <li key={`${index}-${step}`}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="whitespace-pre-line text-sm text-stone-700">{recipe.instructions}</p>
            )}
          </section>

          {recipe.tip_sandra ? (
            <section className="rounded-xl border border-[#4A6044]/20 bg-[#F0F4ED] p-3.5">
              <h2 className="text-sm font-semibold text-[#4A6044]">Tip de Sandra</h2>
              <p className="mt-1 text-sm text-stone-700">{recipe.tip_sandra}</p>
            </section>
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
          animation: detailEnter 240ms ease-out both;
        }
      `}</style>
    </section>
  );
}
