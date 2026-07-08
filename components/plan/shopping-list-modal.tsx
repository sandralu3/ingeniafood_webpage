"use client";

import { Loader2, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import type { ShoppingListItem } from "@/lib/plan/shopping-list";
import { formatShoppingListText } from "@/lib/plan/shopping-list";
import { cn } from "@/lib/utils";

type ShoppingListModalProps = {
  open: boolean;
  title: string;
  items: ShoppingListItem[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
};

export function ShoppingListModal({
  open,
  title,
  items,
  isLoading = false,
  errorMessage,
  onClose
}: ShoppingListModalProps) {
  const [isCopying, setIsCopying] = useState(false);

  const text = useMemo(() => formatShoppingListText(items), [items]);

  const handleCopy = async () => {
    if (isCopying || !text.trim()) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // On algunos entornos clipboard puede fallar; no rompemos el flujo.
    } finally {
      setIsCopying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700/80">
              Plan semanal
            </p>
            <h2 className="mt-1 truncate font-serif text-xl font-semibold text-stone-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {errorMessage ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-stone-100 bg-stone-50/70 px-4 py-4 text-sm text-stone-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando lista de compra...
            </div>
          ) : null}

          {!isLoading ? (
            <div className="max-h-[50vh] overflow-auto rounded-2xl border border-stone-100 bg-stone-50/50 px-4 py-3">
              {items.length ? (
                <ul className="space-y-2 text-sm text-stone-700">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3">
                      <span className="min-w-0 pr-2 font-medium text-stone-800">{item.name}</span>
                      <div className="shrink-0 text-right">
                        {item.quantityLabel ? (
                          <span className="block text-xs font-semibold text-[#3e5219]">
                            {item.quantityLabel}
                          </span>
                        ) : null}
                        {!item.quantityLabel && item.usedInRecipes > 1 ? (
                          <span
                            className={cn(
                              "mt-0.5 block rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-stone-500"
                            )}
                          >
                            en {item.usedInRecipes} comidas
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-600">
                  No hay recetas asignadas en tu plan semanal.
                </p>
              )}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={isLoading || !items.length || isCopying}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4c6633] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3e5219] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            {isCopying ? "Copiando..." : "Copiar lista"}
          </button>
        </div>
      </div>
    </div>
  );
}

