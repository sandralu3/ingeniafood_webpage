"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Save, Sparkles } from "lucide-react";
import type { StructuredInstagramRecipe } from "@/lib/admin/instagram-recipe-extractor";
import { EditableStringList } from "@/components/admin/editable-string-list";
import { cn } from "@/lib/utils";

type InstagramCatalogRecipeFormProps = {
  initialRecipe: StructuredInstagramRecipe;
  initialInstagramUrl?: string | null;
  initialImageUrl?: string | null;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (payload: {
    recipe: StructuredInstagramRecipe;
    instagramUrl: string;
    imageFile: File | null;
  }) => void | Promise<void>;
};

export function InstagramCatalogRecipeForm({
  initialRecipe,
  initialInstagramUrl = null,
  initialImageUrl = null,
  isSubmitting = false,
  submitLabel = "Guardar cambios",
  onSubmit
}: InstagramCatalogRecipeFormProps) {
  const [recipe, setRecipe] = useState<StructuredInstagramRecipe>(initialRecipe);
  const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setRecipe(initialRecipe);
    setInstagramUrl(initialInstagramUrl ?? "");
    setImageFile(null);
    setImagePreviewUrl(null);
  }, [initialRecipe, initialInstagramUrl]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  const displayImageUrl = imagePreviewUrl ?? initialImageUrl;

  const canSubmit = useMemo(
    () =>
      recipe.titulo.trim().length > 0 &&
      recipe.ingredientes.some((item) => item.trim()) &&
      recipe.preparacion.some((item) => item.trim()) &&
      !isSubmitting,
    [recipe, isSubmitting]
  );

  const updateField = <K extends keyof StructuredInstagramRecipe>(
    field: K,
    value: StructuredInstagramRecipe[K]
  ) => {
    setRecipe((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="catalog-title" className="mb-2 block text-sm font-semibold text-stone-700">
          Título
        </label>
        <input
          id="catalog-title"
          type="text"
          value={recipe.titulo}
          onChange={(event) => updateField("titulo", event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-900 outline-none transition focus:border-[#4C6B3F]/35 focus:ring-2 focus:ring-[#4C6B3F]/10 disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="catalog-instagram-url" className="mb-2 block text-sm font-semibold text-stone-700">
          Enlace de Instagram
        </label>
        <input
          id="catalog-instagram-url"
          type="url"
          value={instagramUrl}
          onChange={(event) => setInstagramUrl(event.target.value)}
          placeholder="https://www.instagram.com/reel/... o @usuario"
          disabled={isSubmitting}
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none transition focus:border-[#4C6B3F]/35 focus:ring-2 focus:ring-[#4C6B3F]/10 disabled:opacity-60"
        />
      </div>

      <div>
        <span className="mb-2 block text-sm font-semibold text-stone-700">Imagen de la receta</span>
        <label
          htmlFor="catalog-recipe-image"
          className={cn(
            "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-6 text-center transition",
            "hover:border-[#4C6B3F]/30 hover:bg-[#F0F4ED]/40",
            isSubmitting && "pointer-events-none opacity-60"
          )}
        >
          {displayImageUrl ? (
            <div className="flex w-full flex-col items-center gap-2">
              <div className="relative h-32 w-32 overflow-hidden rounded-2xl shadow-sm ring-1 ring-stone-100">
                <Image
                  src={displayImageUrl}
                  alt="Vista previa de la imagen de la receta"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <p className="text-xs text-stone-500">
                {imageFile ? imageFile.name : "Toca para cambiar la imagen"}
              </p>
            </div>
          ) : (
            <>
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#4C6B3F] shadow-sm">
                <ImagePlus className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-stone-700">Selecciona una imagen</p>
              <p className="mt-0.5 text-xs text-stone-500">Opcional al editar</p>
            </>
          )}
          <input
            id="catalog-recipe-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isSubmitting}
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      </div>

      <EditableStringList
        label="Ingredientes"
        items={recipe.ingredientes}
        onChange={(items) => updateField("ingredientes", items)}
        placeholder="Ej. 200 g de yogur natural"
      />

      <EditableStringList
        label="Preparación"
        items={recipe.preparacion}
        onChange={(items) => updateField("preparacion", items)}
        placeholder="Ej. Mezcla todos los ingredientes en un bol"
      />

      <EditableStringList
        label="Tags"
        items={recipe.tags}
        onChange={(items) => updateField("tags", items)}
        placeholder="Ej. Sin harinas"
      />

      <button
        type="button"
        onClick={() =>
          void onSubmit({
            recipe: {
              titulo: recipe.titulo.trim(),
              ingredientes: recipe.ingredientes.map((item) => item.trim()).filter(Boolean),
              preparacion: recipe.preparacion.map((item) => item.trim()).filter(Boolean),
              tags: recipe.tags.map((item) => item.trim()).filter(Boolean)
            },
            instagramUrl,
            imageFile
          })
        }
        disabled={!canSubmit}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4C6B3F] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            {submitLabel}
          </>
        )}
      </button>
    </div>
  );
}

export function InstagramCatalogRecipeFormHeader() {
  return (
    <div className="mb-5 flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-[#4C6B3F]" />
      <h2 className="text-lg font-semibold text-stone-900">Editar receta del catálogo</h2>
    </div>
  );
}
