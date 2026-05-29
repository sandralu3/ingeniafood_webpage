"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeShareCaptureHost } from "@/components/share/recipe-share-capture-host";
import { useShareRecipeImage } from "@/hooks/use-share-recipe-image";
import { savedRecipeToShareable } from "@/lib/share/recipe-share-utils";
import { handleRemoveFromFavorites } from "@/lib/recipes/remove-from-favorites";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database, Json } from "@/types/database.types";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];
type FilterChip = "Todas" | "Airfryer" | "Desayunos" | "Cenas" | "Sin Harinas";

const FILTER_CHIPS: FilterChip[] = ["Todas", "Airfryer", "Desayunos", "Cenas", "Sin Harinas"];

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function jsonToSearchableText(value: Json): string {
  if (value === null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(jsonToSearchableText).join(" ");
  }
  return Object.values(value)
    .map((entry) => (entry === undefined ? "" : jsonToSearchableText(entry)))
    .join(" ");
}

function matchesQuickFilter(recipe: RecipeRow, quickFilter: FilterChip): boolean {
  if (quickFilter === "Todas") return true;

  const combinedText = normalizeText(
    `${recipe.title} ${recipe.description ?? ""} ${jsonToSearchableText(recipe.ingredients)}`
  );

  if (quickFilter === "Airfryer") return recipe.is_airfryer || combinedText.includes("airfryer");
  if (quickFilter === "Sin Harinas") return recipe.is_flourless || combinedText.includes("sin harinas");
  if (quickFilter === "Desayunos") return combinedText.includes("desayuno");
  if (quickFilter === "Cenas") return combinedText.includes("cena");
  return true;
}

function isMissingTipSandraColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.message?.includes("column recipes.tip_sandra does not exist") === true;
}

function formatSavedDate(isoDate: string): string {
  const formatted = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(isoDate));
  return `Guardado el ${formatted}`;
}

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("Todas");
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
          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,tip_sandra"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      let recipesData = primaryQuery.data as RecipeRow[] | null;
      let recipesError = primaryQuery.error;

      if (isMissingTipSandraColumnError(recipesError)) {
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
          tip_sandra: null
        })) ?? null;
      }

      if (recipesError) {
        setErrorMessage("No pudimos cargar tus recetas ahora. Intentalo de nuevo.");
        setRecipes([]);
        setIsLoading(false);
        return;
      }

      setRecipes(recipesData ?? []);
      setIsLoading(false);
    };

    void loadRecipes();
  }, []);

  const filteredRecipes = useMemo(() => {
    const normalizedSearchTerm = normalizeText(searchTerm);

    return recipes.filter((recipe) => {
      const searchableText = normalizeText(`${recipe.title} ${jsonToSearchableText(recipe.ingredients)}`);
      const matchesSearch =
        normalizedSearchTerm.length === 0 || searchableText.includes(normalizedSearchTerm);
      const matchesFilter = matchesQuickFilter(recipe, activeFilter);
      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, recipes, searchTerm]);

  const isSearchActive = normalizeText(searchTerm).length > 0;
  const visibleRecipes = mostrarTodas || isSearchActive ? filteredRecipes : filteredRecipes.slice(0, 5);

  useEffect(() => {
    if (isSearchActive) {
      setMostrarTodas(true);
    }
  }, [isSearchActive]);

  const pageContent = useMemo(() => {
    if (isLoading) {
      return (
        <p className="rounded-2xl border border-stone-100 bg-white p-5 text-sm text-stone-500 shadow-sm">
          Cargando recetas saludables...
        </p>
      );
    }

    if (errorMessage) {
      return (
        <p className="rounded-2xl border border-stone-100 bg-white p-5 text-sm font-medium text-[#556B2F] shadow-sm">
          {errorMessage}
        </p>
      );
    }

    if (recipes.length === 0) {
      return (
        <p className="rounded-2xl border border-stone-100 bg-white p-5 text-sm text-stone-500 shadow-sm">
          Aún no hay recetas guardadas. Escanea tus ingredientes para empezar.
        </p>
      );
    }

    if (filteredRecipes.length === 0) {
      return (
        <p className="rounded-2xl border border-stone-100 bg-white p-5 text-sm text-stone-500 shadow-sm">
          Sandra no encontró esa receta en tu historial. Prueba con otro ingrediente.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {visibleRecipes.map((recipe, index) => {
            const categories = [
              recipe.is_airfryer ? "Airfryer" : null,
              recipe.is_flourless ? "Sin Harinas" : null,
              recipe.is_airfryer === false && recipe.is_flourless === false ? "Saludable" : null
            ].filter((category): category is string => Boolean(category));

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
                  categories={categories}
                  savedAtLabel={formatSavedDate(recipe.created_at)}
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
              className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-[#4c6633] shadow-sm transition hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6633]/10"
            >
              {mostrarTodas ? "Ver menos" : `Ver todas mis recetas (${recipes.length})`}
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
    visibleRecipes
  ]);

  return (
    <section className="space-y-5">
      <RecipeShareCaptureHost captureRef={captureRef} recipe={captureRecipe} mode="offscreen" />

      <header>
        <h1 className="mb-2 font-serif text-xl font-semibold tracking-tight text-stone-900">
          Mis Recetas ({recipes.length})
        </h1>
        <p className="text-sm leading-loose text-stone-500">
          Explora tu historial y encuentra recetas por categoría o ingrediente.
        </p>
      </header>

      <div className="max-h-[68vh] overflow-y-auto pr-0.5">
        <div className="sticky top-0 z-20 -mx-0.5 space-y-4 bg-[#FAFAFA]/95 px-0.5 pb-3 pt-0.5 backdrop-blur-md">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400/80"
              strokeWidth={1.35}
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar en mis recetas..."
              className="w-full rounded-full border border-stone-200/80 bg-white py-3 pl-11 pr-4 text-sm text-stone-700 placeholder:text-stone-400 transition focus:border-[#4c6633]/30 focus:outline-none focus:ring-2 focus:ring-[#4c6633]/8"
            />
          </label>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
            {FILTER_CHIPS.map((chip) => {
              const isActive = chip === activeFilter;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setActiveFilter(chip)}
                  className={
                    isActive
                      ? "shrink-0 whitespace-nowrap rounded-full bg-[#4c6633] px-4 py-2 text-xs font-medium text-white transition"
                      : "shrink-0 whitespace-nowrap rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6633]/10"
                  }
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

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
  );
}
