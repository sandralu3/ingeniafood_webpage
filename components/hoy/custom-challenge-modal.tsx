"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";

type CustomChallengeModalMode = "create" | "edit";

type CustomChallengeModalProps = {
  open: boolean;
  mode?: CustomChallengeModalMode;
  initialTitulo?: string;
  isSaving: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (titulo: string) => void;
};

export function CustomChallengeModal({
  open,
  mode = "create",
  initialTitulo = "",
  isSaving,
  errorMessage,
  onClose,
  onSubmit
}: CustomChallengeModalProps) {
  const t = useTranslations("Retos");
  const tCommon = useTranslations("Common");
  const [titulo, setTitulo] = useState("");
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!open) {
      setTitulo("");
      return;
    }

    setTitulo(initialTitulo);
  }, [open, initialTitulo]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = titulo.trim();
    if (!value || isSaving) return;
    onSubmit(value);
  };

  const subtitle = isEditMode
    ? t.has("modalEditSubtitlePremium")
      ? t("modalEditSubtitlePremium")
      : t("modalEditSubtitle")
    : t.has("modalCreateSubtitlePremium")
      ? t("modalCreateSubtitlePremium")
      : t("modalCreateSubtitle");

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-challenge-title"
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-neutral-100 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="shrink-0 px-5 pt-0 pb-0">
          <SwipeToCloseHandle onClose={onClose} disabled={isSaving} />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700/80">
              {isEditMode ? t("modalEditEyebrow") : t("modalCreateEyebrow")}
            </p>
            <h2 id="custom-challenge-title" className="mt-1 font-serif text-xl font-semibold text-stone-900">
              {isEditMode ? t("modalEditTitle") : t("modalCreateTitle")}
            </h2>
            <p className="mt-1 text-xs text-stone-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
            aria-label={tCommon("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {errorMessage ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500">
              {t("modalLabel")}
            </span>
            <input
              type="text"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder={t("modalPlaceholder")}
              maxLength={80}
              autoFocus
              disabled={isSaving}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-[#556B2F]/30 focus:ring-2 focus:ring-[#556B2F]/10 disabled:opacity-60"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-2xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSaving || !titulo.trim()}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition",
                "bg-gradient-to-r from-[#556B2F] to-[#6b8a3e] hover:from-[#4a5f28] hover:to-[#5f7a36] disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("modalSaving")}
                </>
              ) : isEditMode ? (
                <>
                  <Pencil className="h-4 w-4" />
                  {t("modalSaveChanges")}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {t("modalCreate")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
