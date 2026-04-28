"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecipeCard } from "@/components/recipes/RecipeCard";
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

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("Todas");
  const [mostrarTodas, setMostrarTodas] = useState(false);

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
          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,instructions,image_url,tip_sandra"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      let recipesData = primaryQuery.data as RecipeRow[] | null;
      let recipesError = primaryQuery.error;

      if (isMissingTipSandraColumnError(recipesError)) {
        const fallbackQuery = await supabase
          .from("recipes")
          .select(
            "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,instructions,image_url"
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
        <p className="rounded-2xl border border-brand-green-light/25 bg-white/70 p-4 text-sm text-brand-green-dark/80">
          Cargando recetas saludables...
        </p>
      );
    }

    if (errorMessage) {
      return (
        <p className="rounded-2xl border border-brand-green-light/35 bg-white/80 p-4 text-sm font-medium text-brand-green-dark">
          {errorMessage}
        </p>
      );
    }

    if (recipes.length === 0) {
      return (
        <p className="rounded-2xl border border-brand-green-light/25 bg-white/70 p-4 text-sm text-brand-green-dark/80">
          Aun no hay recetas publicas en la base de datos.
        </p>
      );
    }

    if (filteredRecipes.length === 0) {
      return (
        <p className="rounded-2xl border border-brand-green-light/25 bg-white/70 p-4 text-sm text-brand-green-dark/80">
          Sandra no encontro esa receta en tu historial. !Prueba con otro ingrediente!
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
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                onMouseEnter={() => router.prefetch(`/recipes/${recipe.id}`)}
                onFocus={() => router.prefetch(`/recipes/${recipe.id}`)}
                className={`
                  block cursor-pointer rounded-2xl transition-transform duration-200
                  hover:scale-[1.02] active:scale-[0.995] focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-[#4A6044]/25
                  ${mostrarTodas && index >= 5 ? "animate-fade-in-down" : ""}
                `}
                style={
                  mostrarTodas && index >= 5
                    ? { animationDelay: `${Math.min(index - 5, 8) * 45}ms` }
                    : undefined
                }
              >
                <RecipeCard
                  title={recipe.title}
                  categories={categories}
                  createdAt={new Date(recipe.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  })}
                />
              </Link>
            );
          })}
        </div>

        {filteredRecipes.length > 5 ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setMostrarTodas((previous) => !previous)}
              className="inline-flex items-center justify-center rounded-full bg-transparent px-6 py-3 text-sm font-semibold text-[#4A6044] transition-all duration-200 hover:bg-[#4A6044]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6044]/20"
            >
              {mostrarTodas ? "Ver menos" : `Ver todas mis recetas (${recipes.length})`}
            </button>
          </div>
        ) : null}
      </div>
    );
  }, [errorMessage, filteredRecipes, isLoading, mostrarTodas, recipes.length, visibleRecipes]);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold italic tracking-tight text-[#667a60]">
          Mis Recetas ({recipes.length})
        </h1>
        <p className="text-sm text-brand-green-dark/75">
          Explora tu historial y encuentra recetas por categoria o ingrediente.
        </p>
      </header>

      <div className="max-h-[68vh] overflow-y-auto pr-1">
        <div className="sticky top-0 z-20 -mx-1 space-y-4 bg-brand-cream/95 px-1 pb-3 pt-1 backdrop-blur-sm">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-green-dark/45"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar en mis recetas..."
              className="w-full rounded-full border border-brand-green-light/35 bg-white/90 py-2.5 pl-11 pr-4 text-sm text-brand-green-dark placeholder:text-brand-green-dark/50 transition-colors duration-200 focus:border-[#4A6044]/40 focus:outline-none focus:ring-2 focus:ring-[#4A6044]/20"
            />
          </label>

          <div className="flex flex-wrap gap-2 pb-1">
            {FILTER_CHIPS.map((chip) => {
              const isActive = chip === activeFilter;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setActiveFilter(chip)}
                  className={
                    isActive
                      ? "whitespace-nowrap rounded-full bg-[#4A6044] px-4 py-1.5 text-xs font-semibold text-white transition-all duration-200 shadow-sm"
                      : "whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-brand-green-dark/80 transition-all duration-200 hover:border-[#4A6044]/30 hover:bg-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6044]/20"
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
