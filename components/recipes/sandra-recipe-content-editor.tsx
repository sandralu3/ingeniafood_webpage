"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Props = {
  recipeId: string;
  initialIngredients: string[];
  initialSteps: string[];
  disabled?: boolean;
  className?: string;
  onSaved?: (payload: { ingredients: string[]; steps: string[] }) => void;
};

function normalizeList(items: string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
}

export function SandraRecipeContentEditor({
  recipeId,
  initialIngredients,
  initialSteps,
  disabled = false,
  className,
  onSaved
}: Props) {
  const t = useTranslations("RecipeDetail");
  const [ingredients, setIngredients] = useState<string[]>(
    initialIngredients.length > 0 ? initialIngredients : [""]
  );
  const [steps, setSteps] = useState<string[]>(
    initialSteps.length > 0 ? initialSteps : [""]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setIngredients(initialIngredients.length > 0 ? initialIngredients : [""]);
    setSteps(initialSteps.length > 0 ? initialSteps : [""]);
  }, [initialIngredients, initialSteps, recipeId]);

  const updateIngredient = (index: number, value: string) => {
    setIngredients((current) => current.map((item, i) => (i === index ? value : item)));
  };

  const updateStep = (index: number, value: string) => {
    setSteps((current) => current.map((item, i) => (i === index ? value : item)));
  };

  const removeIngredient = (index: number) => {
    setIngredients((current) =>
      current.length <= 1 ? [""] : current.filter((_, i) => i !== index)
    );
  };

  const removeStep = (index: number) => {
    setSteps((current) =>
      current.length <= 1 ? [""] : current.filter((_, i) => i !== index)
    );
  };

  const handleSave = async () => {
    if (isSaving || disabled) return;
    const nextIngredients = normalizeList(ingredients);
    const nextSteps = normalizeList(steps);

    if (nextIngredients.length === 0) {
      setError(t("adminEditNeedIngredients"));
      return;
    }
    if (nextSteps.length === 0) {
      setError(t("adminEditNeedSteps"));
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/update-sandra-recipe-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          ingredients: nextIngredients,
          steps: nextSteps
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(payload.error || t("adminEditError"));
        return;
      }

      setIngredients(nextIngredients);
      setSteps(nextSteps);
      setSuccess(payload.message || t("adminEditSuccess"));
      onSaved?.({ ingredients: nextIngredients, steps: nextSteps });
      window.setTimeout(() => setSuccess(null), 2500);
    } catch {
      setError(t("adminEditError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className={cn(
        "space-y-4 rounded-2xl border border-[#556B2F]/20 bg-[#F0F4ED]/50 p-4",
        className
      )}
    >
      <div>
        <h2 className="text-sm font-semibold text-[#3e5219]">{t("adminEditTitle")}</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
          {t("adminEditHint")}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#556B2F]">
            {t("ingredients")}
          </p>
          <button
            type="button"
            disabled={disabled || isSaving}
            onClick={() => setIngredients((current) => [...current, ""])}
            className="inline-flex items-center gap-1 rounded-full border border-[#556B2F]/25 bg-white px-2 py-1 text-[10px] font-semibold text-[#3e5219] transition hover:bg-[#eef4e6] disabled:opacity-50"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            {t("adminEditAddIngredient")}
          </button>
        </div>
        <ul className="space-y-1.5">
          {ingredients.map((item, index) => (
            <li key={`ing-${index}`} className="flex items-start gap-1.5">
              <input
                type="text"
                value={item}
                disabled={disabled || isSaving}
                onChange={(event) => updateIngredient(index, event.target.value)}
                placeholder={t("adminEditIngredientPlaceholder")}
                className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] text-stone-800 outline-none focus:border-[#556B2F] focus:ring-1 focus:ring-[#556B2F]/30 disabled:opacity-60"
              />
              <button
                type="button"
                disabled={disabled || isSaving}
                onClick={() => removeIngredient(index)}
                aria-label={t("adminEditRemoveIngredient")}
                className="mt-0.5 rounded-md p-1.5 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#556B2F]">
            {t("preparation")}
          </p>
          <button
            type="button"
            disabled={disabled || isSaving}
            onClick={() => setSteps((current) => [...current, ""])}
            className="inline-flex items-center gap-1 rounded-full border border-[#556B2F]/25 bg-white px-2 py-1 text-[10px] font-semibold text-[#3e5219] transition hover:bg-[#eef4e6] disabled:opacity-50"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            {t("adminEditAddStep")}
          </button>
        </div>
        <ol className="space-y-1.5">
          {steps.map((item, index) => (
            <li key={`step-${index}`} className="flex items-start gap-1.5">
              <span className="mt-1.5 w-5 shrink-0 text-center text-[10px] font-bold text-[#556B2F]">
                {index + 1}
              </span>
              <textarea
                value={item}
                disabled={disabled || isSaving}
                onChange={(event) => updateStep(index, event.target.value)}
                placeholder={t("adminEditStepPlaceholder")}
                rows={2}
                className="min-w-0 flex-1 resize-y rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] leading-snug text-stone-800 outline-none focus:border-[#556B2F] focus:ring-1 focus:ring-[#556B2F]/30 disabled:opacity-60"
              />
              <button
                type="button"
                disabled={disabled || isSaving}
                onClick={() => removeStep(index)}
                aria-label={t("adminEditRemoveStep")}
                className="mt-0.5 rounded-md p-1.5 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {success ? <p className="text-xs text-[#3e5219]">{success}</p> : null}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={disabled || isSaving}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSaving ? t("adminEditSaving") : t("adminEditSave")}
      </button>
    </section>
  );
}
