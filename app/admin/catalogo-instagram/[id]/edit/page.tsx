"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import {
  InstagramCatalogRecipeForm,
  InstagramCatalogRecipeFormHeader
} from "@/components/admin/instagram-catalog-recipe-form";
import type { AdminInstagramCatalogDetail } from "@/lib/admin/instagram-catalog-admin";
import type { StructuredInstagramRecipe } from "@/lib/admin/instagram-recipe-extractor";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function EditarCatalogoInstagramPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const recipeId = params.id;

  const [authState, setAuthState] = useState<"loading" | "allowed" | "denied">("loading");
  const [catalogRecipe, setCatalogRecipe] = useState<AdminInstagramCatalogDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const verifyAccessAndLoad = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setAuthState("denied");
        router.replace(`/login?next=/admin/catalogo-instagram/${recipeId}/edit`);
        return;
      }

      if (!isSandraAdmin(user.email)) {
        setAuthState("denied");
        return;
      }

      setAuthState("allowed");

      try {
        const response = await fetch(`/api/admin/instagram-catalog/${recipeId}`);
        const payload = (await response.json()) as {
          recipe?: AdminInstagramCatalogDetail;
          error?: string;
        };

        if (!response.ok || !payload.recipe) {
          throw new Error(payload.error ?? "No pudimos cargar la receta.");
        }

        setCatalogRecipe(payload.recipe);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Error al cargar la receta.");
      } finally {
        setIsLoading(false);
      }
    };

    void verifyAccessAndLoad();

    return () => {
      active = false;
    };
  }, [recipeId, router]);

  const handleSave = async (payload: {
    recipe: StructuredInstagramRecipe;
    instagramUrl: string;
    imageFile: File | null;
  }) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("recipeId", recipeId);
      formData.append("recipe", JSON.stringify(payload.recipe));
      formData.append("instagram_url", payload.instagramUrl);
      if (payload.imageFile) {
        formData.append("image", payload.imageFile);
      }

      const response = await fetch("/api/admin/update-instagram-recipe", {
        method: "PATCH",
        body: formData
      });

      const result = (await response.json()) as {
        message?: string;
        imageUrl?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "No pudimos guardar los cambios.");
      }

      setCatalogRecipe((current) =>
        current
          ? {
              ...current,
              title: payload.recipe.titulo,
              instagram_url: payload.instagramUrl.trim() || null,
              image_url: result.imageUrl ?? current.image_url,
              recipe: payload.recipe
            }
          : current
      );
      setSuccessMessage(result.message ?? "Receta actualizada correctamente.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al guardar la receta.");
    } finally {
      setIsSaving(false);
    }
  };

  if (authState === "loading" || isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-4">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[#4C6B3F]" />
          Cargando receta del catálogo...
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
            href={APP_ROUTES.perfil}
            className="mt-4 inline-flex rounded-full bg-[#4C6B3F] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
          >
            Volver al perfil
          </Link>
        </div>
      </main>
    );
  }

  if (!catalogRecipe) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-4">
        <div className="max-w-md rounded-2xl border border-stone-100 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-stone-900">Receta no encontrada</h1>
          <p className="mt-2 text-sm text-stone-500">
            {errorMessage ?? "No encontramos esta receta en el catálogo de Instagram."}
          </p>
          <Link
            href="/admin/catalogo-instagram"
            className="mt-4 inline-flex rounded-full bg-[#4C6B3F] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
          >
            Volver al catálogo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF9F6] px-4 pb-12 pt-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/admin/catalogo-instagram"
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-[#4c6633]/80 transition hover:text-[#4c6633]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Volver al catálogo
        </Link>

        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4C6B3F]">
            Admin · IngeniaFood
          </p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">{catalogRecipe.title}</h1>
        </header>

        <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <InstagramCatalogRecipeFormHeader />

          {errorMessage ? (
            <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="font-medium">{successMessage}</p>
              </div>
            </div>
          ) : null}

          <InstagramCatalogRecipeForm
            key={catalogRecipe.id}
            initialRecipe={catalogRecipe.recipe}
            initialInstagramUrl={catalogRecipe.instagram_url}
            initialImageUrl={catalogRecipe.image_url}
            isSubmitting={isSaving}
            onSubmit={handleSave}
          />
        </section>
      </div>
    </main>
  );
}
