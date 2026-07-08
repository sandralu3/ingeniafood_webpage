"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2
} from "lucide-react";
import type { StructuredInstagramRecipe } from "@/lib/admin/instagram-recipe-extractor";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

function EditableStringList({
  label,
  items,
  onChange,
  placeholder
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const addItem = () => {
    onChange([...items, ""]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-stone-700">{label}</label>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-[#4C6B3F]/35 focus:ring-2 focus:ring-[#4C6B3F]/10"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              aria-label={`Eliminar ${label.toLowerCase()}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ImportarRecetaAdminPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "allowed" | "denied">("loading");
  const [rawText, setRawText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<StructuredInstagramRecipe | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [publishedRecipeId, setPublishedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setAuthState("denied");
        router.replace("/login?next=/admin/importar-receta");
        return;
      }

      if (!isSandraAdmin(user.email)) {
        setAuthState("denied");
        return;
      }

      setAuthState("allowed");
    };

    void verifyAccess();

    return () => {
      active = false;
    };
  }, [router]);

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

  const canProcess = useMemo(
    () => rawText.trim().length > 0 && !isProcessing && !isPublishing,
    [rawText, isProcessing, isPublishing]
  );

  const canPublish = useMemo(
    () =>
      Boolean(
        preview &&
          preview.titulo.trim() &&
          preview.ingredientes.some((item) => item.trim()) &&
          preview.preparacion.some((item) => item.trim()) &&
          imageFile &&
          !isProcessing &&
          !isPublishing
      ),
    [preview, imageFile, isProcessing, isPublishing]
  );

  const updatePreviewField = <K extends keyof StructuredInstagramRecipe>(
    field: K,
    value: StructuredInstagramRecipe[K]
  ) => {
    setPreview((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleProcess = async () => {
    if (!canProcess) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPublishedRecipeId(null);

    try {
      const response = await fetch("/api/admin/structure-instagram-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: rawText })
      });

      const payload = (await response.json()) as {
        recipe?: StructuredInstagramRecipe;
        error?: string;
      };

      if (!response.ok || !payload.recipe) {
        throw new Error(payload.error ?? "No pudimos estructurar la receta.");
      }

      setPreview(payload.recipe);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al procesar con Gemini.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!canPublish || !preview || !imageFile) return;

    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const sanitizedRecipe: StructuredInstagramRecipe = {
      titulo: preview.titulo.trim(),
      ingredientes: preview.ingredientes.map((item) => item.trim()).filter(Boolean),
      preparacion: preview.preparacion.map((item) => item.trim()).filter(Boolean),
      tags: preview.tags.map((item) => item.trim()).filter(Boolean)
    };

    try {
      const formData = new FormData();
      formData.append("recipe", JSON.stringify(sanitizedRecipe));
      formData.append("image", imageFile);

      const response = await fetch("/api/admin/publish-recipe", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as {
        recipeId?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.recipeId) {
        throw new Error(payload.error ?? "No pudimos publicar la receta.");
      }

      setPublishedRecipeId(payload.recipeId);
      setSuccessMessage(payload.message ?? "Receta publicada correctamente.");
      setPreview(null);
      setRawText("");
      setImageFile(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al publicar la receta.");
    } finally {
      setIsPublishing(false);
    }
  };

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
            href="/app-recetas"
            className="mt-4 inline-flex rounded-full bg-[#4C6B3F] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
          >
            Volver a la app
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF9F6] px-4 pb-12 pt-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4C6B3F]">
            Admin · IngeniaFood
          </p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">Importar receta desde Instagram</h1>
          <p className="mt-2 text-sm text-stone-500">
            Pega la descripción del post, deja que Gemini estructure la receta y publícala con su
            imagen.
          </p>
        </header>

        <section className="mx-auto mt-8 max-w-2xl rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <label htmlFor="instagram-text" className="mb-2 block text-sm font-semibold text-stone-700">
                Descripción del post de Instagram
              </label>
              <textarea
                id="instagram-text"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                rows={10}
                placeholder="Pega aquí el texto literal del post: ingredientes, pasos, hashtags..."
                disabled={isProcessing || isPublishing}
                className="w-full resize-y rounded-2xl border border-stone-200 bg-stone-50/60 px-4 py-3 text-sm leading-relaxed text-stone-800 outline-none transition focus:border-[#4C6B3F]/35 focus:bg-white focus:ring-2 focus:ring-[#4C6B3F]/10 disabled:opacity-60"
              />
            </div>

            <div>
              <span className="mb-2 block text-sm font-semibold text-stone-700">Imagen de la receta</span>
              <label
                htmlFor="recipe-image"
                className={cn(
                  "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-8 text-center transition",
                  "hover:border-[#4C6B3F]/30 hover:bg-[#F0F4ED]/40",
                  (isProcessing || isPublishing) && "pointer-events-none opacity-60"
                )}
              >
                {imagePreviewUrl ? (
                  <div className="flex w-full flex-col items-center gap-3">
                    <img
                      src={imagePreviewUrl}
                      alt="Vista previa de la imagen seleccionada"
                      className="h-40 w-40 rounded-2xl object-cover shadow-sm ring-1 ring-stone-100"
                    />
                    <p className="text-sm font-medium text-stone-700">{imageFile?.name}</p>
                    <p className="text-xs text-stone-500">Toca para cambiar la imagen</p>
                  </div>
                ) : (
                  <>
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#4C6B3F] shadow-sm">
                      <ImagePlus className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-medium text-stone-700">Selecciona una imagen</p>
                    <p className="mt-1 text-xs text-stone-500">JPEG, PNG, WebP o GIF · máx. 5 MB</p>
                  </>
                )}
                <input
                  id="recipe-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={isProcessing || isPublishing}
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
            </div>

            {errorMessage ? (
              <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">{successMessage}</p>
                    {publishedRecipeId ? (
                      <Link
                        href={`/app-recetas/recipes/${publishedRecipeId}`}
                        className="mt-1 inline-block text-sm font-semibold text-[#4C6B3F] underline-offset-2 hover:underline"
                      >
                        Ver receta publicada
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleProcess()}
              disabled={!canProcess}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4C6B3F] to-[#6b8a3e] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando con Gemini...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Procesar y Estructurar Receta
                </>
              )}
            </button>
          </div>
        </section>

        {preview ? (
          <section className="mx-auto mt-6 max-w-2xl rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#4C6B3F]" />
              <h2 className="text-lg font-semibold text-stone-900">Vista previa editable</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="preview-title" className="mb-2 block text-sm font-semibold text-stone-700">
                  Título
                </label>
                <input
                  id="preview-title"
                  type="text"
                  value={preview.titulo}
                  onChange={(event) => updatePreviewField("titulo", event.target.value)}
                  disabled={isPublishing}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-900 outline-none transition focus:border-[#4C6B3F]/35 focus:ring-2 focus:ring-[#4C6B3F]/10"
                />
              </div>

              <EditableStringList
                label="Ingredientes"
                items={preview.ingredientes}
                onChange={(items) => updatePreviewField("ingredientes", items)}
                placeholder="Ej. 200 g de yogur natural"
              />

              <EditableStringList
                label="Preparación"
                items={preview.preparacion}
                onChange={(items) => updatePreviewField("preparacion", items)}
                placeholder="Ej. Mezcla todos los ingredientes en un bol"
              />

              <EditableStringList
                label="Tags"
                items={preview.tags}
                onChange={(items) => updatePreviewField("tags", items)}
                placeholder="Ej. Sin harinas"
              />

              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={!canPublish}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo imagen y publicando...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Publicar Receta
                  </>
                )}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
