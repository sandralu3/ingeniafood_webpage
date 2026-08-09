"use client";

import { useEffect, useState } from "react";
import { Instagram, Loader2, Trash2 } from "lucide-react";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import { normalizeInstagramUrl } from "@/lib/recipes/instagram-url";
import { cn } from "@/lib/utils";

type RecipeInstagramAdminFormProps = {
  recipeId: string;
  initialUrl?: string | null;
  onUpdated?: (url: string | null) => void;
  className?: string;
};

export function RecipeInstagramAdminForm({
  recipeId,
  initialUrl = null,
  onUpdated,
  className
}: RecipeInstagramAdminFormProps) {
  const [value, setValue] = useState(initialUrl ?? "");
  const [savedUrl, setSavedUrl] = useState<string | null>(initialUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialUrl ?? "");
    setSavedUrl(initialUrl);
  }, [initialUrl]);

  const handleSave = async (rawValue?: string) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const input = rawValue ?? value;
    const normalized = input.trim() ? normalizeInstagramUrl(input) : null;

    if (input.trim() && !normalized) {
      setErrorMessage("Introduce una URL de Instagram válida o un @usuario.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/update-recipe-instagram-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, instagramUrl: normalized })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        instagramUrl?: string | null;
      };

      if (!response.ok) {
        setErrorMessage(payload.error ?? "No pudimos guardar el enlace.");
        return;
      }

      const saved = payload.instagramUrl ?? normalized;
      setSavedUrl(saved);
      setValue(saved ?? "");
      setSuccessMessage(
        payload.message ?? (saved ? "Enlace de Instagram guardado." : "Enlace eliminado.")
      );
      onUpdated?.(saved);
      window.setTimeout(() => setSuccessMessage(null), 2500);
    } catch (error) {
      console.error("[recipe-instagram-admin] Error inesperado:", error);
      setErrorMessage("Ocurrió un error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setValue("");
    void handleSave("");
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-[#C13584]/15 bg-gradient-to-br from-[#fdf2f8] to-white px-4 py-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#C13584] shadow-sm">
          <Instagram className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9d174d]/80">
            Admin · Instagram
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-stone-900">
            Vincular reel de Instagram
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Pega el enlace del reel o publicación. Los usuarios verán «Ver en Instagram» en el plan.
          </p>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-medium text-stone-600">URL o @usuario</span>
        <input
          type="url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://www.instagram.com/reel/... o @healthysnacks_svn"
          disabled={isSaving}
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none transition focus:border-[#C13584]/35 focus:ring-2 focus:ring-[#C13584]/10 disabled:opacity-60"
        />
      </label>

      {errorMessage ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p role="status" className="mt-2 text-xs font-medium text-[#556B2F]">
          {successMessage}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#9d174d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#831843] disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Guardar enlace
        </button>

        {savedUrl ? (
          <>
            <RecipeInstagramLink url={savedUrl} />
            <button
              type="button"
              onClick={handleClear}
              disabled={isSaving}
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-2 text-xs font-medium text-stone-500 transition hover:bg-stone-50 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Quitar
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
