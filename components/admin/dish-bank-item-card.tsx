"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { DishImageBankItem } from "@/lib/recipes/dish-image-bank-types";
import { cn } from "@/lib/utils";

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function parseListInput(value: string): string[] {
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type DishBankItemCardProps = {
  item: DishImageBankItem;
  deletingId: string | null;
  onToggleActive: (item: DishImageBankItem) => void;
  onDelete: (itemId: string) => void;
  onSaved: () => void;
  onError: (message: string) => void;
};

function TagChip({
  label,
  onRemove,
  tone = "neutral"
}: {
  label: string;
  onRemove?: () => void;
  tone?: "neutral" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        tone === "accent"
          ? "bg-amber-50 text-amber-900"
          : "bg-stone-100 text-stone-600"
      )}
    >
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 text-stone-400 transition hover:bg-white/80 hover:text-stone-700"
          aria-label={`Quitar ${label}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </span>
  );
}

export function DishBankItemCard({
  item,
  deletingId,
  onToggleActive,
  onDelete,
  onSaved,
  onError
}: DishBankItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [keywords, setKeywords] = useState(item.keywords);
  const [tags, setTags] = useState(item.tags);
  const [newKeywords, setNewKeywords] = useState("");
  const [newTags, setNewTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing) return;
    setKeywords(item.keywords);
    setTags(item.tags);
  }, [item.keywords, item.tags, isEditing]);

  const addKeywords = () => {
    const additions = parseListInput(newKeywords);
    if (!additions.length) return;
    setKeywords((current) => dedupeStrings([...current, ...additions]));
    setNewKeywords("");
  };

  const addTags = () => {
    const additions = parseListInput(newTags);
    if (!additions.length) return;
    setTags((current) => dedupeStrings([...current, ...additions]));
    setNewTags("");
  };

  const handleCancel = () => {
    setKeywords(item.keywords);
    setTags(item.tags);
    setNewKeywords("");
    setNewTags("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("keywords", JSON.stringify(dedupeStrings(keywords)));
      formData.append("tags", JSON.stringify(dedupeStrings(tags)));

      const response = await fetch(`/api/admin/dish-image-bank/${item.id}`, {
        method: "PATCH",
        body: formData
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron guardar las etiquetas.");
      }

      setIsEditing(false);
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Error al guardar etiquetas.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border shadow-sm",
        item.isActive ? "border-stone-100 bg-white" : "border-stone-200 bg-stone-50 opacity-70"
      )}
    >
      <div className="aspect-[4/3] bg-stone-100">
        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
      </div>
      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-sm font-semibold text-stone-900">{item.title}</p>
        <p className="text-[11px] text-stone-500">
          {item.mealTypes.join(", ") || "sin tipo"} · {item.cuisineStyles.join(", ") || "sin estilo"}
        </p>

        {isEditing ? (
          <div className="space-y-3 rounded-xl border border-stone-100 bg-stone-50/80 p-2.5">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Palabras clave
              </p>
              <div className="flex flex-wrap gap-1">
                {keywords.map((keyword) => (
                  <TagChip
                    key={keyword}
                    label={keyword}
                    onRemove={() => setKeywords((current) => current.filter((value) => value !== keyword))}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={newKeywords}
                  onChange={(event) => setNewKeywords(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addKeywords();
                    }
                  }}
                  placeholder="Añadir: tortita, tagliatelle…"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2.5 text-xs text-stone-800 outline-none focus:border-[#4c6633]/35"
                />
                <button
                  type="button"
                  onClick={addKeywords}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600"
                  aria-label="Añadir palabras clave"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Tags</p>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <TagChip
                    key={tag}
                    label={tag}
                    tone="accent"
                    onRemove={() => setTags((current) => current.filter((value) => value !== tag))}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={newTags}
                  onChange={(event) => setNewTags(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTags();
                    }
                  }}
                  placeholder="Añadir: Sin Harinas, Airfryer…"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2.5 text-xs text-stone-800 outline-none focus:border-[#4c6633]/35"
                />
                <button
                  type="button"
                  onClick={addTags}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600"
                  aria-label="Añadir tags"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#4c6633] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Guardar
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded-full border border-stone-200 px-3 py-1.5 text-[11px] font-semibold text-stone-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            {item.keywords.length ? (
              <p className="line-clamp-2 text-[10px] text-stone-400">
                <span className="font-medium text-stone-500">Claves: </span>
                {item.keywords.join(", ")}
              </p>
            ) : null}
            {item.tags.length ? (
              <div className="flex flex-wrap gap-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <TagChip key={tag} label={tag} tone="accent" />
                ))}
                {item.tags.length > 3 ? (
                  <span className="text-[10px] text-stone-400">+{item.tags.length - 3}</span>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1 text-[10px] font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              <Pencil className="h-3 w-3" />
              Etiquetas
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onToggleActive(item)}
            className="rounded-full border border-stone-200 px-2.5 py-1 text-[10px] font-semibold text-stone-600"
          >
            {item.isActive ? "Activa" : "Inactiva"}
          </button>
          <button
            type="button"
            onClick={() => void onDelete(item.id)}
            disabled={deletingId === item.id}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-[10px] font-semibold text-red-700 disabled:opacity-60"
          >
            {deletingId === item.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Eliminar
          </button>
        </div>
      </div>
    </article>
  );
}
