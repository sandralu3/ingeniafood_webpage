"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Instagram,
  Loader2,
  Pencil,
  Save,
  Search,
  Sparkles,
  Square
} from "lucide-react";
import { RecipeCatalogThumbnail } from "@/components/recipes/recipe-catalog-thumbnail";
import { useSandraAdminGate } from "@/hooks/use-sandra-admin-gate";
import type { AdminSandraRecipeListItem } from "@/lib/admin/sandra-recipes-admin";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import {
  ASSIGNABLE_RECIPE_DIETS,
  assignableRecipeDietLabel,
  type AssignableRecipeDiet
} from "@/lib/recipes/recipe-diet-tags";
import { cn } from "@/lib/utils";

function mealTypeLabel(mealType: string | null): string | null {
  if (!mealType) return null;
  const map: Record<string, string> = {
    desayuno: "Desayuno",
    almuerzo: "Almuerzo",
    cena: "Cena",
    postre: "Postre",
    snack: "Snack"
  };
  return map[mealType.toLowerCase()] ?? mealType;
}

function dietsEqual(a: AssignableRecipeDiet[], b: AssignableRecipeDiet[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((item) => setB.has(item));
}

function SandraRecipeAdminCard({
  recipe,
  onUpdated
}: {
  recipe: AdminSandraRecipeListItem;
  onUpdated: (next: AdminSandraRecipeListItem) => void;
}) {
  const [draftDiets, setDraftDiets] = useState<AssignableRecipeDiet[]>(recipe.diets);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDraftDiets(recipe.diets);
  }, [recipe.diets, recipe.id]);

  const isDirty = !dietsEqual(draftDiets, recipe.diets);

  const toggleDiet = (diet: AssignableRecipeDiet) => {
    setDraftDiets((current) =>
      current.includes(diet) ? current.filter((item) => item !== diet) : [...current, diet]
    );
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (isSaving || !isDirty) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/sandra-recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diets: draftDiets })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        recipe?: AdminSandraRecipeListItem;
        error?: string;
        message?: string;
      };

      if (!response.ok || !payload.recipe) {
        setError(payload.error || "No pudimos guardar las dietas.");
        return;
      }

      onUpdated(payload.recipe);
      setDraftDiets(payload.recipe.diets);
      setSuccess(payload.message || "Dietas actualizadas.");
      window.setTimeout(() => setSuccess(null), 2200);
    } catch {
      setError("No pudimos guardar las dietas.");
    } finally {
      setIsSaving(false);
    }
  };

  const mealLabel = mealTypeLabel(recipe.meal_type);

  return (
    <article className="rounded-2xl border border-stone-100 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-50">
          <RecipeCatalogThumbnail title={recipe.title} imageUrl={recipe.image_url} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-sm font-semibold text-stone-800">{recipe.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {mealLabel ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                {mealLabel}
              </span>
            ) : null}
            {recipe.es_instagram ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                <Instagram className="h-3 w-3" />
                Instagram
              </span>
            ) : null}
            {recipe.has_macros ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Con macros
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Sin macros
              </span>
            )}
            {recipe.has_diet_assignment ? (
              recipe.diets.length === 0 ? (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                  Sin restricciones
                </span>
              ) : null
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Sin dieta
              </span>
            )}
          </div>
        </div>

        <Link
          href={`${APP_ROUTES.guardadas}/${recipe.id}`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#4C6B3F]/20 bg-[#F0F4ED] px-3 text-xs font-semibold text-[#4C6B3F] transition hover:bg-[#dce7c3]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>
      </div>

      <div className="mt-3 border-t border-stone-100 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#556B2F]">
          Tipos de dieta
        </p>
        <p className="mt-0.5 text-[11px] text-stone-400">
          Puedes marcar varias. Si no marcas ninguna, queda como sin restricciones.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ASSIGNABLE_RECIPE_DIETS.map((diet) => {
            const active = draftDiets.includes(diet.id);
            return (
              <button
                key={diet.id}
                type="button"
                disabled={isSaving}
                onClick={() => toggleDiet(diet.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  active
                    ? "border-[#4C6B3F] bg-[#4C6B3F] text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-[#4C6B3F]/40 hover:bg-[#F0F4ED]",
                  "disabled:opacity-60"
                )}
              >
                {assignableRecipeDietLabel(diet.id)}
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        {success ? <p className="mt-2 text-xs text-[#3e5219]">{success}</p> : null}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || !isDirty}
          className={cn(
            "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Guardando…" : "Guardar dietas"}
        </button>
      </div>
    </article>
  );
}

export function AdminSandraRecipesView() {
  const authState = useSandraAdminGate(APP_ROUTES.adminRecetasSandra);
  const [recipes, setRecipes] = useState<AdminSandraRecipeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterMissingDiet, setFilterMissingDiet] = useState(false);
  const [filterMissingMacros, setFilterMissingMacros] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichStatus, setEnrichStatus] = useState<string | null>(null);
  const [enrichTotals, setEnrichTotals] = useState({ updated: 0, failed: 0 });
  const enrichAbortRef = useRef(false);

  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/sandra-recipes");
      const payload = (await response.json()) as {
        recipes?: AdminSandraRecipeListItem[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar las recetas de Sandra.");
      }
      setRecipes(payload.recipes ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al cargar las recetas."
      );
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState !== "allowed") return;
    void loadRecipes();
  }, [authState, loadRecipes]);

  const pendingEnrichCount = useMemo(
    () =>
      recipes.filter((recipe) => !recipe.has_diet_assignment || !recipe.has_macros).length,
    [recipes]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (filterMissingDiet && recipe.has_diet_assignment) return false;
      if (filterMissingMacros && recipe.has_macros) return false;
      if (!needle) return true;
      return recipe.title.toLowerCase().includes(needle);
    });
  }, [recipes, query, filterMissingDiet, filterMissingMacros]);

  const withoutDietCount = recipes.filter((recipe) => !recipe.has_diet_assignment).length;
  const withoutMacrosCount = recipes.filter((recipe) => !recipe.has_macros).length;

  const stopEnrichment = () => {
    enrichAbortRef.current = true;
  };

  const runEnrichment = async () => {
    if (isEnriching || pendingEnrichCount === 0) return;
    enrichAbortRef.current = false;
    setIsEnriching(true);
    setErrorMessage(null);
    setEnrichTotals({ updated: 0, failed: 0 });
    setEnrichStatus("Iniciando lotes con IA…");

    const excludeIds: string[] = [];
    let totalUpdated = 0;
    let totalFailed = 0;

    try {
      while (!enrichAbortRef.current) {
        const response = await fetch("/api/admin/sandra-recipes/enrich-missing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 4, excludeIds })
        });
        const payload = (await response.json().catch(() => ({}))) as {
          processed?: number;
          updated?: number;
          remaining?: number;
          failed?: Array<{ id: string; title: string; error: string }>;
          recipes?: AdminSandraRecipeListItem[];
          error?: string;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "No pudimos enriquecer las recetas.");
        }

        const batchUpdated = payload.updated ?? 0;
        const batchFailed = payload.failed ?? [];
        totalUpdated += batchUpdated;
        totalFailed += batchFailed.length;
        setEnrichTotals({ updated: totalUpdated, failed: totalFailed });

        for (const failed of batchFailed) {
          if (!excludeIds.includes(failed.id)) excludeIds.push(failed.id);
        }

        if (payload.recipes && payload.recipes.length > 0) {
          setRecipes((current) => {
            const byId = new Map(payload.recipes!.map((item) => [item.id, item]));
            return current.map((item) => byId.get(item.id) ?? item);
          });
        }

        const remaining = payload.remaining ?? 0;
        const processed = payload.processed ?? 0;
        setEnrichStatus(
          remaining > 0
            ? `Procesando… ${totalUpdated} actualizadas, ${totalFailed} con error, ${remaining} pendientes.`
            : payload.message || "Listo."
        );

        if (processed === 0 || remaining === 0) break;
        if (batchUpdated === 0 && batchFailed.length === 0) break;
      }

      if (enrichAbortRef.current) {
        setEnrichStatus(
          `Detenido. ${totalUpdated} actualizadas, ${totalFailed} con error. Recarga si hace falta.`
        );
      } else {
        setEnrichStatus(
          `Completado. ${totalUpdated} actualizadas${totalFailed > 0 ? `, ${totalFailed} con error` : ""}.`
        );
        await loadRecipes();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al enriquecer las recetas."
      );
      setEnrichStatus(null);
    } finally {
      setIsEnriching(false);
      enrichAbortRef.current = false;
    }
  };

  if (authState === "loading") {
    return (
      <section className="flex min-h-[40vh] items-center justify-center px-4 py-10">
        <p className="inline-flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Comprobando acceso…
        </p>
      </section>
    );
  }

  if (authState === "denied") {
    return (
      <section className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-lg font-semibold text-stone-900">Acceso restringido</h1>
        <p className="mt-2 text-sm text-stone-500">
          Esta sección solo está disponible para la administradora de IngeniaFood.
        </p>
        <Link
          href={APP_ROUTES.hoy}
          className="mt-5 inline-flex rounded-full bg-[#4C6B3F] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Volver a Hoy
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-lg space-y-4 px-4 py-6 pb-24">
      <div>
        <Link
          href={APP_ROUTES.admin}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-[#4C6B3F]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Administración
        </Link>
      </div>

      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4C6B3F]/80">
          Admin · IngeniaFood
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-stone-900">
          <BookOpen className="h-5 w-5 text-[#4C6B3F]" strokeWidth={1.75} />
          Recetas de Sandra
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Asigna dietas a mano o completa en masa con IA las que aún no tienen dieta o macros. Usa
          «Editar» para la ficha completa.
        </p>
        <p className="mt-1 text-xs text-stone-400">
          {recipes.length} recetas
          {withoutDietCount > 0 ? ` · ${withoutDietCount} sin dieta` : ""}
          {withoutMacrosCount > 0 ? ` · ${withoutMacrosCount} sin macros` : ""}
        </p>
      </header>

      <div className="rounded-2xl border border-[#4C6B3F]/15 bg-[#F0F4ED]/50 p-3">
        <p className="text-xs leading-relaxed text-stone-600">
          La IA solo rellena huecos (no pisa dietas ni macros ya guardados). Procesa por lotes de 4.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isEnriching || pendingEnrichCount === 0 || isLoading}
            onClick={() => void runEnrichment()}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#556B2F] px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {isEnriching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isEnriching
              ? "Calculando…"
              : pendingEnrichCount > 0
                ? `Completar ${pendingEnrichCount} con IA`
                : "Nada pendiente"}
          </button>
          {isEnriching ? (
            <button
              type="button"
              onClick={stopEnrichment}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-600"
            >
              <Square className="h-3.5 w-3.5" />
              Detener
            </button>
          ) : null}
        </div>
        {enrichStatus ? (
          <p className="mt-2 text-[11px] text-[#3e5219]">
            {enrichStatus}
            {enrichTotals.updated > 0 || enrichTotals.failed > 0
              ? ` (${enrichTotals.updated} ok / ${enrichTotals.failed} error)`
              : ""}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título…"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-800 outline-none focus:border-[#4C6B3F] focus:ring-1 focus:ring-[#4C6B3F]/30"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterMissingDiet((current) => !current)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              filterMissingDiet
                ? "border-amber-600 bg-amber-50 text-amber-900"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            )}
          >
            Solo sin dieta
          </button>
          <button
            type="button"
            onClick={() => setFilterMissingMacros((current) => !current)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              filterMissingMacros
                ? "border-amber-600 bg-amber-50 text-amber-900"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            )}
          >
            Solo sin macros
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#4C6B3F]" />
          Cargando recetas de Sandra…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-stone-700">
            {recipes.length === 0
              ? "No hay recetas de Sandra todavía."
              : "Ninguna receta coincide con el filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((recipe) => (
            <SandraRecipeAdminCard
              key={recipe.id}
              recipe={recipe}
              onUpdated={(next) => {
                setRecipes((current) =>
                  current.map((item) => (item.id === next.id ? next : item))
                );
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
