"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { RecipeCatalogThumbnail } from "@/components/recipes/recipe-catalog-thumbnail";
import type { AdminInstagramCatalogListItem } from "@/lib/admin/instagram-catalog-admin";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { useSandraAdminGate } from "@/hooks/use-sandra-admin-gate";

export default function CatalogoInstagramAdminPage() {
  const authState = useSandraAdminGate("/admin/catalogo-instagram");
  const [recipes, setRecipes] = useState<AdminInstagramCatalogListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/instagram-catalog");
      const payload = (await response.json()) as {
        recipes?: AdminInstagramCatalogListItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar el catálogo.");
      }

      setRecipes(payload.recipes ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al cargar el catálogo.");
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState !== "allowed") return;
    void loadCatalog();
  }, [authState, loadCatalog]);

  if (authState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-4">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[#4C6B3F]" />
          Verificando acceso de administración...
        </div>
      </main>
    );
  }

  if (authState === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-4">
        <div className="max-w-md rounded-2xl border border-stone-100 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-stone-900">Acceso restringido</h1>
          <p className="mt-2 text-sm text-stone-500">
            Este panel solo está disponible para la administradora de IngeniaFood.
          </p>
          <Link
            href={APP_ROUTES.admin}
            className="mt-4 inline-flex rounded-full bg-[#4C6B3F] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
          >
            Volver a Administración
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF9F6] px-4 pb-12 pt-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href={APP_ROUTES.admin}
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-[#4c6633]/80 transition hover:text-[#4c6633]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Volver a Administración
        </Link>

        <header className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4C6B3F]">
            Admin · IngeniaFood
          </p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">Editar catálogo de Instagram</h1>
          <p className="mt-2 text-sm text-stone-500">
            Modifica las recetas publicadas en el catálogo que ven los usuarios en el escáner.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/admin/importar-receta"
            className="inline-flex rounded-full border border-[#4C6B3F]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#4C6B3F] transition hover:bg-[#F0F4ED]"
          >
            Importar nueva receta
          </Link>
        </div>

        {errorMessage ? (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#4C6B3F]" />
            Cargando recetas del catálogo...
          </div>
        ) : recipes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-10 text-center">
            <p className="text-sm font-medium text-stone-700">No hay recetas en el catálogo.</p>
            <p className="mt-1 text-xs text-stone-500">
              Importa una receta desde Instagram para publicarla aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <article
                key={recipe.id}
                className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white p-2.5 shadow-sm"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-50">
                  <RecipeCatalogThumbnail
                    title={recipe.title}
                    imageUrl={recipe.image_url}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-stone-800">{recipe.title}</h2>
                  <p className="mt-0.5 text-[11px] text-stone-400">
                    {new Date(recipe.created_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                </div>

                <Link
                  href={`/admin/catalogo-instagram/${recipe.id}/edit`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#4C6B3F]/20 bg-[#F0F4ED] px-3 text-xs font-semibold text-[#4C6B3F] transition hover:bg-[#dce7c3]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
