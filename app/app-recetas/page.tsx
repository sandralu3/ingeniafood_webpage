"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RecentRecipeCarouselCard } from "@/components/home/recent-recipe-carousel-card";
import { WEEKLY_SANDRA_TIP } from "@/lib/content/weekly-tip";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database } from "@/types/database.types";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"] & {
  tip_sandra?: string | null;
};

const RECENT_RECIPES_LIMIT = 8;

function isMissingTipSandraColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.message?.includes("column recipes.tip_sandra does not exist") === true;
}

function buildCategories(recipe: RecipeRow): string[] {
  return [
    recipe.is_airfryer ? "Airfryer" : null,
    recipe.is_flourless ? "Sin Harinas" : null,
    recipe.is_airfryer === false && recipe.is_flourless === false ? "Saludable" : null
  ].filter((category): category is string => Boolean(category));
}

function resolveUserGreetingName(fullName: string | null, email: string | null): string {
  const trimmed = fullName?.trim();
  if (trimmed) {
    return trimmed.split(/\s+/)[0] ?? trimmed;
  }
  if (email) {
    const localPart = email.split("@")[0] ?? "Chef";
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }
  return "Chef";
}

export default function AppRecetasHomePage() {
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
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
          setUserName("Chef");
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        setUserName(resolveUserGreetingName(profile?.full_name ?? null, user.email ?? null));

        const primaryQuery = await supabase
          .from("recipes")
          .select(
            "id,user_id,title,ingredients,instructions,tip_sandra,image_url,created_at,description,cooking_time,is_airfryer,is_flourless,is_public"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(RECENT_RECIPES_LIMIT);

        let recipesData = primaryQuery.data as RecipeRow[] | null;
        let recipesError = primaryQuery.error;

        if (isMissingTipSandraColumnError(recipesError)) {
          const fallbackQuery = await supabase
            .from("recipes")
            .select(
              "id,user_id,title,ingredients,instructions,image_url,created_at,description,cooking_time,is_airfryer,is_flourless,is_public"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(RECENT_RECIPES_LIMIT);

          recipesError = fallbackQuery.error;
          recipesData =
            (fallbackQuery.data as RecipeRow[] | null)?.map((recipe) => ({
              ...recipe,
              tip_sandra: null
            })) ?? null;
        }

        if (recipesError) {
          console.error("[home-dashboard] Supabase select error:", recipesError);
          setErrorMessage("No pudimos cargar tus recetas recientes.");
          setRecipes([]);
        } else {
          setRecipes(recipesData ?? []);
        }
      } catch (error) {
        console.error("[home-dashboard] Error cargando recetas:", error);
        setErrorMessage("No pudimos cargar tus recetas recientes.");
        setRecipes([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadRecipes();
  }, []);

  const recentRecipes = useMemo(() => recipes.slice(0, RECENT_RECIPES_LIMIT), [recipes]);

  const greetingName = userName || "Chef";

  return (
    <section className="space-y-5 pb-8">
      <h1 className="text-left font-sans text-2xl font-semibold tracking-tight text-stone-800">
        ¡Hola, {greetingName}! 👋
      </h1>

      {/* Hero Banner */}
      <div className="hero-organic-texture relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#556B2F]/18 via-[#dce7c3]/35 to-[#FDFCFB] px-5 py-9 shadow-sm">
        <div className="pointer-events-none absolute -left-6 top-0 h-40 w-40 rounded-full bg-[#556B2F]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-4 -right-4 h-36 w-36 rounded-full bg-brand-green-light/20 blur-2xl" />

        <div className="relative space-y-6 text-center">
          <h2 className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-stone-800">
            ¿Qué cocinamos hoy?
          </h2>

          <p className="mx-auto max-w-xs text-lg leading-relaxed text-stone-800">
            Escanea tu despensa. Descubre recetas saludables e instantáneas sin harinas ni azúcar
            procesado.
          </p>

          <Link
            href="/app-recetas/scanner"
            className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#3e5219] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-[#3e5219]/25 transition hover:bg-[#556B2F] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#556B2F]/40"
          >
            <span aria-hidden>🔍</span>
            Escanear mis ingredientes
          </Link>
        </div>
      </div>

      {/* Carrusel recientes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-0.5">
          <h2 className="text-sm font-semibold tracking-tight text-stone-800">
            Tus Últimas Creaciones
          </h2>
          {recentRecipes.length > 0 ? (
            <Link
              href="/app-recetas/recipes"
              className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-[#556B2F] transition hover:opacity-75"
            >
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {isLoading ? (
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[10.5rem] w-[11.5rem] shrink-0 animate-pulse rounded-2xl bg-stone-100"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="rounded-2xl border border-stone-100 bg-white p-4 text-sm text-stone-600 shadow-sm">
            {errorMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage && recentRecipes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200/80 bg-stone-50/60 px-4 py-8 text-center">
            <p className="text-sm leading-relaxed text-stone-600">
              Aún no tienes recetas guardadas. Escanea tus ingredientes para empezar.
            </p>
            <Link
              href="/app-recetas/scanner"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#556B2F] transition hover:opacity-75"
            >
              Ir al escáner
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}

        {!isLoading && !errorMessage && recentRecipes.length > 0 ? (
          <div className="no-scrollbar -mx-0.5 flex gap-4 overflow-x-auto px-0.5 pb-4">
            {recentRecipes.map((recipe) => (
              <RecentRecipeCarouselCard
                key={recipe.id}
                title={recipe.title}
                categories={buildCategories(recipe)}
                imageUrl={recipe.image_url}
                href={`/app-recetas/recipes/${recipe.id}`}
              />
            ))}
          </div>
        ) : null}
      </section>

      {/* Tip de Sandra */}
      <aside className="rounded-2xl border border-brand-green-light/30 bg-brand-green-light/10 px-5 py-6 shadow-sm">
        <h3 className="font-serif text-base font-semibold text-brand-green-dark">
          💡 El Tip de Sandra
        </h3>
        <p className="mt-4 text-sm leading-7 text-stone-700">{WEEKLY_SANDRA_TIP}</p>
      </aside>
    </section>
  );
}
