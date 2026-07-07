"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardPaste,
  ExternalLink,
  Instagram,
  Loader2,
  ScanLine,
  Sparkles
} from "lucide-react";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import { SANDRA_INSTAGRAM_HANDLE, SANDRA_INSTAGRAM_URL } from "@/lib/content/social-links";
import type { InstagramImportResult } from "@/lib/recipes/import-from-instagram";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

type InstagramImportViewProps = {
  onImport: (url: string) => Promise<void>;
  isImporting: boolean;
  errorMessage?: string | null;
  className?: string;
};

const STEPS = [
  "Abre Instagram y encuentra el reel que te gustó.",
  "Pulsa Compartir → Copiar enlace.",
  "Vuelve aquí y pega el enlace abajo."
] as const;

export function InstagramImportView({
  onImport,
  isImporting,
  errorMessage,
  className
}: InstagramImportViewProps) {
  const [url, setUrl] = useState("");

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setUrl(text.trim());
      }
    } catch {
      // Clipboard API may be blocked; user can paste manually.
    }
  };

  const handleSubmit = () => {
    void onImport(url);
  };

  return (
    <section className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-3xl border border-[#C13584]/15 bg-gradient-to-br from-[#fdf2f8] via-white to-[#fff7ed] p-4 shadow-xl shadow-stone-100/50">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#C13584] shadow-sm">
            <Instagram className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Guardar receta desde Instagram
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Si Sandra ya curó ese reel en la app, importarás la receta completa. Si no, guardamos el
              enlace para que la veas cuando quieras.
            </p>
          </div>
        </div>

        <ol className="mt-4 space-y-2">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-2.5 rounded-2xl border border-white/80 bg-white/70 px-3 py-2 text-xs text-stone-600"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fdf2f8] text-[10px] font-bold text-[#9d174d]">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <a
          href={SANDRA_INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#C13584]/20 bg-white px-4 py-3 text-sm font-semibold text-[#9d174d] transition hover:border-[#C13584]/35 hover:shadow-md"
        >
          <Instagram className="h-4 w-4" />
          Abrir {SANDRA_INSTAGRAM_HANDLE}
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>
      </div>

      <div className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-xl shadow-stone-100/50">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Enlace del reel
          </span>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              disabled={isImporting}
              className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-800 outline-none transition focus:border-[#C13584]/30 focus:ring-2 focus:ring-[#C13584]/10 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handlePaste()}
              disabled={isImporting}
              className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white px-3 text-stone-500 transition hover:bg-stone-50 disabled:opacity-60"
              aria-label="Pegar enlace"
            >
              <ClipboardPaste className="h-4 w-4" />
            </button>
          </div>
        </label>

        {errorMessage ? (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isImporting || !url.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9d174d] to-[#C13584] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#C13584]/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isImporting ? "Importando receta..." : "Guardar en mis recetas"}
        </button>
      </div>
    </section>
  );
}

type InstagramImportSuccessProps = {
  result: InstagramImportResult;
  successMessage?: string | null;
  onScanPantry?: () => void;
  onImportAnother?: () => void;
  className?: string;
};

export function InstagramImportSuccess({
  result,
  successMessage,
  onScanPantry,
  onImportAnother,
  className
}: InstagramImportSuccessProps) {
  const isBookmark = result.kind === "bookmark";
  const isCurated = result.kind === "curated";
  const isExisting = result.kind === "existing";

  return (
    <section className={cn("space-y-4", className)}>
      {successMessage ? (
        <div className="rounded-2xl border border-[#556B2F]/25 bg-[#F0F4ED] px-4 py-3 text-sm font-medium text-[#3e5219]">
          {successMessage}
        </div>
      ) : null}

      <article className="overflow-hidden rounded-3xl border border-neutral-100 bg-white p-4 shadow-xl shadow-stone-100/50">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9d174d]/80">
          {isExisting ? "Ya la tenías guardada" : isCurated ? "Receta de Sandra importada" : "Enlace guardado"}
        </p>
        <h2 className="mt-1 font-serif text-xl font-semibold text-stone-900">{result.title}</h2>

        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          {isExisting
            ? "Esta receta ya estaba en tu biblioteca. Puedes verla o asignarla al plan."
            : isCurated
              ? "Importamos ingredientes, pasos y el enlace al reel de Instagram."
              : "Guardamos el reel en tu biblioteca. Abre Instagram para ver el video o genera una versión con tus ingredientes."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <RecipeInstagramLink url={result.instagramUrl} />
          <Link
            href={`${APP_ROUTES.guardadas}/${result.recipeId}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#556B2F]/20 bg-[#F0F4ED] px-3 py-1.5 text-xs font-semibold text-[#3e5219] transition hover:bg-[#dce7c3]"
          >
            Ver en mis recetas
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isBookmark && onScanPantry ? (
          <button
            type="button"
            onClick={onScanPantry}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#556B2F]/20 bg-white px-4 py-3 text-sm font-semibold text-[#3e5219] transition hover:bg-[#F0F4ED]"
          >
            <ScanLine className="h-4 w-4" />
            Generar receta con escáner
          </button>
        ) : null}

        {onImportAnother ? (
          <button
            type="button"
            onClick={onImportAnother}
            className="mt-2 w-full text-center text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-700 hover:underline"
          >
            Importar otro enlace
          </button>
        ) : null}
      </article>
    </section>
  );
}
