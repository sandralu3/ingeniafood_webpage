"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Props = {
  recipeId: string;
  disabled?: boolean;
  className?: string;
  onPublished?: (payload: { recipeId: string; title: string }) => void;
};

export function PublishSandraRecipeButton({
  recipeId,
  disabled = false,
  className,
  onPublished
}: Props) {
  const t = useTranslations("RecipeDetail");
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    if (isPublishing || disabled) return;
    const confirmed = window.confirm(t("publishSandraConfirm"));
    if (!confirmed) return;

    setIsPublishing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/publish-sandra-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        recipeId?: string;
        title?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(payload.error || t("publishSandraError"));
        return;
      }

      onPublished?.({
        recipeId: payload.recipeId || recipeId,
        title: payload.title || ""
      });
    } catch {
      setError(t("publishSandraError"));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => void handlePublish()}
        disabled={disabled || isPublishing}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#556B2F]/25 bg-[#eef4e6] px-4 py-3 text-sm font-semibold text-[#3f5224] transition",
          "hover:bg-[#e3ecd8] disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {isPublishing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        )}
        {isPublishing ? t("publishSandraPublishing") : t("publishSandra")}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
