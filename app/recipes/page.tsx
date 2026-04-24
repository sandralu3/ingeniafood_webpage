"use client";

import { useEffect, useMemo, useState } from "react";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Database } from "@/types/database.types";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      const { data, error } = await supabase
        .from("recipes")
        .select(
          "id,title,description,cooking_time,is_airfryer,is_flourless,is_public,created_at,user_id,ingredients,instructions,image_url,tip_sandra"
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        setErrorMessage("No pudimos cargar tus recetas ahora. Intentalo de nuevo.");
        setRecipes([]);
        setIsLoading(false);
        return;
      }

      setRecipes(data ?? []);
      setIsLoading(false);
    };

    void loadRecipes();
  }, []);

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

    return (
      <div className="grid grid-cols-1 gap-4">
        {recipes.map((recipe, index) => {
          const category = recipe.is_airfryer
            ? "Airfryer"
            : recipe.is_flourless
              ? "Sin Harinas"
              : "Saludable";

          return (
            <RecipeCard
              key={recipe.id}
              title={recipe.title}
              category={category}
              time={recipe.cooking_time ? `${recipe.cooking_time} min` : "Tiempo flexible"}
              description={recipe.description ?? "Receta saludable y rapida para tu dia a dia."}
              imageLabel={`Imagen de ${recipe.title}`}
              featured={index === 0}
            />
          );
        })}
      </div>
    );
  }, [errorMessage, isLoading, recipes]);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-brand-green-dark">Mis Recetas</h1>
        <p className="text-sm text-brand-green-dark/75">
          Ultimas 5 recetas publicas desde Supabase.
        </p>
      </header>
      {pageContent}
    </section>
  );
}
