"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ImagePlus,
  Loader2,
  UploadCloud
} from "lucide-react";
import {
  DishBankFilters,
  type DishBankActiveFilter
} from "@/components/admin/dish-bank-filters";
import { DishBankItemCard } from "@/components/admin/dish-bank-item-card";
import { filterDishBankItems } from "@/lib/admin/filter-dish-bank-items";
import type { DishImageBankItem } from "@/lib/recipes/dish-image-bank-types";
import {
  RECIPE_CUISINE_STYLES,
  RECIPE_MEAL_TYPES,
  type RecipeCuisineStyle,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { useSandraAdminGate } from "@/hooks/use-sandra-admin-gate";
import { cn } from "@/lib/utils";

function joinList(values: string[]): string {
  return values.join(", ");
}

function parseListInput(value: string): string[] {
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const PAGE_SIZE = 24;

export default function BancoImagenesAdminPage() {
  const authState = useSandraAdminGate("/admin/banco-imagenes");
  const [items, setItems] = useState<DishImageBankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSeedingBundled, setIsSeedingBundled] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mealTypes, setMealTypes] = useState<string[]>(["almuerzo"]);
  const [cuisineStyles, setCuisineStyles] = useState<string[]>(["estandar"]);
  const [keywords, setKeywords] = useState("");
  const [tags, setTags] = useState("");
  const [showAddForm, setShowAddForm] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMealTypes, setFilterMealTypes] = useState<RecipeMealType[]>([]);
  const [filterCuisineStyles, setFilterCuisineStyles] = useState<RecipeCuisineStyle[]>([]);
  const [activeFilter, setActiveFilter] = useState<DishBankActiveFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const imagePreviewUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  const filteredItems = useMemo(
    () =>
      filterDishBankItems(items, {
        searchQuery,
        mealTypes: filterMealTypes,
        cuisineStyles: filterCuisineStyles,
        activeFilter
      }),
    [items, searchQuery, filterMealTypes, filterCuisineStyles, activeFilter]
  );

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, filterMealTypes, filterCuisineStyles, activeFilter]);

  useEffect(() => {
    if (items.length > 12) {
      setShowAddForm(false);
    }
  }, [items.length]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/dish-image-bank");
      const payload = (await response.json()) as {
        items?: DishImageBankItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar el banco.");
      }

      setItems(payload.items ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al cargar el banco.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState !== "allowed") return;
    void loadItems();
  }, [authState, loadItems]);

  const resetForm = () => {
    setTitle("");
    setImageFile(null);
    setMealTypes(["almuerzo"]);
    setCuisineStyles(["estandar"]);
    setKeywords("");
    setTags("");
  };

  const toggleValue = (current: string[], value: string) =>
    current.includes(value) ? current.filter((item) => item !== value) : [...current, value];

  const clearFilters = () => {
    setSearchQuery("");
    setFilterMealTypes([]);
    setFilterCuisineStyles([]);
    setActiveFilter("all");
  };

  const handleCreate = async () => {
    if (!title.trim() || !imageFile) {
      setErrorMessage("Indica título e imagen para añadir al banco.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("image", imageFile);
      formData.append("mealTypes", JSON.stringify(mealTypes));
      formData.append("cuisineStyles", JSON.stringify(cuisineStyles));
      formData.append("keywords", joinList(parseListInput(keywords)));
      formData.append("tags", joinList(parseListInput(tags)));

      const response = await fetch("/api/admin/dish-image-bank", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo guardar la imagen.");
      }

      setSuccessMessage("Imagen añadida al banco.");
      resetForm();
      await loadItems();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedBundled = async () => {
    setIsSeedingBundled(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("action", "seed_bundled");

      const response = await fetch("/api/admin/dish-image-bank", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo poblar el banco automático.");
      }

      setSuccessMessage(payload.message ?? "Catálogo automático importado.");
      await loadItems();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al poblar el banco.");
    } finally {
      setIsSeedingBundled(false);
    }
  };

  const handleImportCatalog = async () => {
    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("action", "import_catalog");

      const response = await fetch("/api/admin/dish-image-bank", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo importar el catálogo.");
      }

      setSuccessMessage(payload.message ?? "Catálogo importado.");
      await loadItems();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al importar.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggleActive = async (item: DishImageBankItem) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("isActive", String(!item.isActive));

      const response = await fetch(`/api/admin/dish-image-bank/${item.id}`, {
        method: "PATCH",
        body: formData
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo actualizar.");
      }

      await loadItems();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al actualizar.");
    }
  };

  const handleDelete = async (itemId: string) => {
    setDeletingId(itemId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/dish-image-bank/${itemId}`, {
        method: "DELETE"
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar.");
      }

      setSuccessMessage("Imagen eliminada del banco.");
      await loadItems();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al eliminar.");
    } finally {
      setDeletingId(null);
    }
  };

  if (authState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-4">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando acceso...
        </div>
      </main>
    );
  }

  if (authState === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-4">
        <section className="max-w-md rounded-3xl border border-stone-100 bg-white p-6 text-center shadow-sm">
          <h1 className="font-serif text-xl font-semibold text-stone-900">Acceso restringido</h1>
          <Link
            href={APP_ROUTES.hoy}
            className="mt-5 inline-flex rounded-full bg-[#4c6633] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Volver a la app
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF9F6] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <Link
            href={APP_ROUTES.perfil}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-[#4c6633]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al perfil
          </Link>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800/75">
            Admin · IngeniaFood
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-stone-900 sm:text-3xl">
            Banco de imágenes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
            Sube y etiqueta fotos de platos. Premium mostrará la imagen más parecida según tipo,
            estilo, ingredientes y tags. Ya hay un catálogo automático de ~777 fotos listo para usar.
          </p>
        </header>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-[#dce7c3] bg-[#f4f7ed] px-4 py-3 text-sm text-[#3e5219]">
            {successMessage}
          </p>
        ) : null}

        <section className="rounded-3xl border border-stone-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          >
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-900">Añadir imagen</h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Sube una foto manualmente o importa el catálogo automático.
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-stone-400 transition",
                showAddForm ? "rotate-180" : ""
              )}
            />
          </button>

          {showAddForm ? (
            <div className="space-y-4 border-t border-stone-100 px-5 pb-5 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSeedBundled()}
                  disabled={isSeedingBundled || isImporting}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
                >
                  {isSeedingBundled ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="h-3.5 w-3.5" />
                  )}
                  Poblar ~777 fotos automáticas
                </button>
                <button
                  type="button"
                  onClick={() => void handleImportCatalog()}
                  disabled={isImporting || isSeedingBundled}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#4c6633]/20 bg-[#F0F4ED] px-3.5 py-2 text-xs font-semibold text-[#4c6633] transition hover:bg-[#e6eee0] disabled:opacity-60"
                >
                  {isImporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="h-3.5 w-3.5" />
                  )}
                  Importar catálogo Instagram
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 text-center text-xs text-stone-500 transition hover:border-[#4c6633]/30 hover:bg-[#F0F4ED]/40">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Vista previa" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-[#4c6633]" />
                  Subir foto
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <div className="space-y-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título del plato (ej. Pasta al pomodoro)"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none focus:border-[#4c6633]/35 focus:ring-2 focus:ring-[#4c6633]/10"
              />

              <div>
                <p className="mb-1.5 text-xs font-semibold text-stone-500">Tipo de comida</p>
                <div className="flex flex-wrap gap-1.5">
                  {RECIPE_MEAL_TYPES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMealTypes((current) => toggleValue(current, option.id))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                        mealTypes.includes(option.id)
                          ? "border-[#4c6633]/30 bg-[#F0F4ED] text-[#3e5219]"
                          : "border-stone-200 bg-white text-stone-500"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-stone-500">Estilo</p>
                <div className="flex flex-wrap gap-1.5">
                  {RECIPE_CUISINE_STYLES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setCuisineStyles((current) => toggleValue(current, option.id))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                        cuisineStyles.includes(option.id)
                          ? "border-[#4c6633]/30 bg-[#F0F4ED] text-[#3e5219]"
                          : "border-stone-200 bg-white text-stone-500"
                      )}
                    >
                      {option.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-stone-500">
                  Palabras clave para matching (español e inglés)
                </span>
                <input
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  placeholder="pasta, tomate, desayuno, breakfast, pancake, tortita…"
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none focus:border-[#4c6633]/35 focus:ring-2 focus:ring-[#4c6633]/10"
                />
              </label>

              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Tags: Sin Harinas, Apto para Airfryer, Alto en Proteína"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none focus:border-[#4c6633]/35 focus:ring-2 focus:ring-[#4c6633]/10"
              />

              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-[#4c6633] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#556B2F] disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar en el banco
              </button>
            </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="font-serif text-lg font-semibold text-stone-900">Imágenes registradas</h2>
          </div>

          <DishBankFilters
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            mealTypes={filterMealTypes}
            onMealTypesChange={setFilterMealTypes}
            cuisineStyles={filterCuisineStyles}
            onCuisineStylesChange={setFilterCuisineStyles}
            activeFilter={activeFilter}
            onActiveFilterChange={setActiveFilter}
            totalCount={items.length}
            filteredCount={filteredItems.length}
            onClearFilters={clearFilters}
          />

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando banco...
            </div>
          ) : items.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-stone-500">
              Aún no hay imágenes. Importa el catálogo Instagram o sube la primera foto.
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-stone-500">
              Ninguna imagen coincide con los filtros. Prueba otra búsqueda o limpia los filtros.
            </p>
          ) : (
            <>
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleItems.map((item) => (
                  <DishBankItemCard
                    key={item.id}
                    item={item}
                    deletingId={deletingId}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                    onSaved={() => {
                      setSuccessMessage("Etiquetas actualizadas.");
                      void loadItems();
                    }}
                    onError={setErrorMessage}
                  />
                ))}
              </div>
              {visibleCount < filteredItems.length ? (
                <div className="border-t border-stone-100 px-5 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                    className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                  >
                    Cargar más ({filteredItems.length - visibleCount} restantes)
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
