"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeShareCaptureHost } from "@/components/share/recipe-share-capture-host";
import { useShareRecipeImage } from "@/hooks/use-share-recipe-image";
import { savedRecipeToShareable } from "@/lib/share/recipe-share-utils";
import { handleRemoveFromFavorites } from "@/lib/recipes/remove-from-favorites";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
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
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
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
          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,steps,instructions,image_url,tip_sandra,instagram_url"
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
          No encontré ninguna receta con ese nombre o ingrediente en tu biblioteca. ¡Prueba con otra palabra!
        </p>
      );
    }

    return (
      <div className="space-y-0">
        <div className="grid grid-cols-1">
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
                  recipeId={recipe.id}
                  categories={categories}
                  savedAtLabel={formatSavedDate(recipe.created_at)}
                  imageUrl={recipe.image_url}
                  instagramUrl={recipe.instagram_url}
                  isSocialVideo={Boolean(recipe.instagram_url && !recipe.image_url)}
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
              className="inline-flex items-center justify-center rounded-full border border-stone-200/60 bg-white px-6 py-2.5 text-sm font-medium text-[#4C6B3F] shadow-sm transition hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4C6B3F]"
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

  const categoryStats = useMemo(
    () => [
      { label: "Airfryer", count: recipes.filter((recipe) => recipe.is_airfryer).length },
      { label: "Sin harinas", count: recipes.filter((recipe) => recipe.is_flourless).length },
      { label: "Saludables", count: recipes.length }
    ],
    [recipes]
  );

  return (
    <div className="min-h-full bg-[#FAF8F5] pb-8 pt-1">
      <section className="space-y-3">
        <RecipeShareCaptureHost captureRef={captureRef} recipe={captureRecipe} mode="offscreen" />

        <header className="pt-2">
          <h1 className="text-xl font-bold tracking-tight text-stone-800">Recetas guardadas</h1>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">
            {recipes.length} {recipes.length === 1 ? "receta" : "recetas"} en tu libro de cocina
            personal. Filtra por categoría o busca por ingrediente.
          </p>

          <div className="my-2 flex flex-wrap gap-4 text-xs font-medium text-stone-500">
            {categoryStats.map((stat) => (
              <span key={stat.label}>
                • {stat.count} {stat.label}
              </span>
            ))}
          </div>
        </header>

        <div className="relative z-20 bg-[#FAF8F5]/95 pb-2 backdrop-blur-md">
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
                placeholder="Buscar en mis recetas..."
                className="w-full rounded-full border border-stone-200/80 bg-white px-4 py-2.5 pl-11 text-sm text-stone-700 shadow-sm outline-none placeholder:text-stone-400 transition focus:border-[#4C6B3F] focus:ring-1 focus:ring-[#4C6B3F]"
              />
            </label>

            <div className="relative shrink-0" ref={filterMenuRef}>
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/60 bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200/50"
                aria-label="Filtrar recetas"
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
                        {chip}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto pr-0.5">
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
    </div>
  );
}
