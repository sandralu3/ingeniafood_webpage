"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, UtensilsCrossed } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database } from "@/types/database.types";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"] & {
  tip_sandra?: string | null;
};

function isMissingTipSandraColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.message?.includes("column recipes.tip_sandra does not exist") === true;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function parseIngredients(value: Database["public"]["Tables"]["recipes"]["Row"]["ingredients"]): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  return [];
}

export default function AppRecetasHomePage() {
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeRow | null>(null);

  const loadRecipes = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setRecipes([]);
        setIsLoading(false);
        return;
      }

      const primaryQuery = await supabase
        .from("recipes")
        .select("id,user_id,title,ingredients,instructions,tip_sandra,image_url,created_at,description,cooking_time,is_airfryer,is_flourless,is_public")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      let recipesData = primaryQuery.data as RecipeRow[] | null;
      let recipesError = primaryQuery.error;

      if (isMissingTipSandraColumnError(recipesError)) {
        const fallbackQuery = await supabase
          .from("recipes")
          .select(
            "id,user_id,title,ingredients,instructions,image_url,created_at,description,cooking_time,is_airfryer,is_flourless,is_public"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        recipesError = fallbackQuery.error;
        recipesData = (fallbackQuery.data as RecipeRow[] | null)?.map((recipe) => ({
          ...recipe,
          tip_sandra: null
        })) ?? null;
      }

      if (recipesError) {
        const detailedMessage = recipesError.message?.trim()
          ? `No pudimos cargar tu recetario en este momento. Detalle: ${recipesError.message}`
          : "No pudimos cargar tu recetario en este momento.";
        console.error("[recipes-home] Supabase select error:", recipesError);
        setErrorMessage(detailedMessage);
        setRecipes([]);
      } else {
        setRecipes(recipesData ?? []);
      }
    } catch (error) {
      console.error("[recipes-home] Error cargando recetas:", error);
      const fallbackMessage =
        error instanceof Error && error.message.trim().length
          ? `No pudimos cargar tu recetario en este momento. Detalle: ${error.message}`
          : "No pudimos cargar tu recetario en este momento.";
      setErrorMessage(fallbackMessage);
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRecipes();
  }, []);

  const pageContent = useMemo(() => {
    if (isLoading) {
      return (
        <p className="rounded-2xl border border-[#556B2F]/15 bg-white px-4 py-3 text-sm text-stone-700">
          Cargando tu recetario...
        </p>
      );
    }

    if (errorMessage) {
      return (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      );
    }

    if (!recipes.length) {
      return (
        <p className="rounded-2xl border border-[#556B2F]/15 bg-white px-4 py-3 text-sm text-stone-700">
          Aún no tienes recetas guardadas. ¡Escanea tus ingredientes para empezar!
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {recipes.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            onClick={() => setSelectedRecipe(recipe)}
            className="rounded-2xl border border-[#556B2F]/20 bg-white p-4 text-left shadow-sm transition hover:border-[#556B2F]/35"
          >
            <p className="text-base font-semibold text-[#1F2937]">{recipe.title}</p>
            <p className="mt-1 text-xs text-stone-600">{formatDate(recipe.created_at)}</p>
          </button>
        ))}
      </div>
    );
  }, [errorMessage, isLoading, recipes]);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">Mi recetario</h1>
        <p className="text-sm text-stone-600">
          Tus recetas guardadas, listas para cocinar cuando quieras.
        </p>
      </header>

      {pageContent}

      {selectedRecipe ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/30 px-4 pb-6 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-[#1F2937]">{selectedRecipe.title}</h2>
              <button
                type="button"
                onClick={() => setSelectedRecipe(null)}
                className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600"
              >
                Cerrar
              </button>
            </div>

            <p className="mt-1 text-xs text-stone-500">{formatDate(selectedRecipe.created_at)}</p>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#556B2F]">
                  Ingredientes
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                  {parseIngredients(selectedRecipe.ingredients).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#556B2F]">
                  Instrucciones
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-700">
                  {selectedRecipe.instructions}
                </p>
              </div>
              {selectedRecipe.cooking_time ? (
                <p className="inline-flex items-center gap-1 text-xs text-stone-600">
                  <Clock className="h-3.5 w-3.5 text-[#556B2F]" />
                  {selectedRecipe.cooking_time} min
                </p>
              ) : null}
              {selectedRecipe.tip_sandra ? (
                <div className="rounded-xl border border-[#556B2F]/20 bg-[#F0F4ED] p-3">
                  <p className="text-sm italic font-bold tracking-wide text-[#556B2F]">✨ Tip de Sandra</p>
                  <p className="mt-1 text-sm text-stone-700">{selectedRecipe.tip_sandra}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <a
        href="/app-recetas/scanner"
        className="inline-flex items-center gap-2 rounded-full bg-[#556B2F] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
      >
        <UtensilsCrossed className="h-4 w-4" />
        Escanear ingredientes
      </a>
    </section>
  );
}
