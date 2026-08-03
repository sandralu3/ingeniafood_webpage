"use client";

import { Loader2, Copy, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  formatShoppingListText,
  groupShoppingListByCategory,
  type ShoppingListItem
} from "@/lib/plan/shopping-list";

type ShoppingListModalProps = {
  open: boolean;
  title: string;
  items: ShoppingListItem[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onItemsChange?: (items: ShoppingListItem[]) => void;
};

function ShoppingListItemRow({
  item,
  usedInMealsLabel,
  removeAria,
  onRemove
}: {
  item: ShoppingListItem;
  usedInMealsLabel: string;
  removeAria: string;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-start justify-between gap-2 rounded-xl bg-white/80 px-3 py-2.5">
      <span className="min-w-0 flex-1 pr-1 text-sm font-medium leading-snug text-stone-800">
        {item.name}
      </span>
      <div className="flex shrink-0 items-start gap-1.5">
        <div className="text-right">
          {item.quantityLabel ? (
            <span className="block text-xs font-semibold text-[#3e5219]">{item.quantityLabel}</span>
          ) : null}
          {!item.quantityLabel && item.usedInRecipes > 1 ? (
            <span className="mt-0.5 block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-500">
              {usedInMealsLabel}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeAria}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>
    </li>
  );
}

export function ShoppingListModal({
  open,
  title,
  items,
  isLoading = false,
  errorMessage,
  onClose,
  onItemsChange
}: ShoppingListModalProps) {
  const t = useTranslations("Plan");
  const tCommon = useTranslations("Common");
  const [isCopying, setIsCopying] = useState(false);
  const [visibleItems, setVisibleItems] = useState<ShoppingListItem[]>(items);

  useEffect(() => {
    if (open) {
      setVisibleItems(items);
    }
  }, [items, open]);

  const text = useMemo(
    () =>
      formatShoppingListText(visibleItems, {
        emptyMessage: t("shoppingListEmptyCopy"),
        getCategoryLabel: (categoryId) => t(`categories.${categoryId}`),
        usedInMealsLabel: (count) => t("usedInMeals", { count })
      }),
    [visibleItems, t]
  );
  const groupedItems = useMemo(
    () => groupShoppingListByCategory(visibleItems),
    [visibleItems]
  );

  const handleRemoveItem = (itemId: string) => {
    const next = visibleItems.filter((item) => item.id !== itemId);
    setVisibleItems(next);
    onItemsChange?.(next);
  };

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

  const removeAria = t.has("removeShoppingItemAria")
    ? t("removeShoppingItemAria")
    : "Quitar de la lista";

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700/80">
              {t("shoppingListEyebrow")}
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
            {tCommon("close")}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
          {errorMessage ? (
            <p className="mb-4 shrink-0 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <div className="mb-4 flex shrink-0 items-center gap-2 rounded-2xl border border-stone-100 bg-stone-50/70 px-4 py-4 text-sm text-stone-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("generatingShoppingList")}
            </div>
          ) : null}

          {!isLoading ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-stone-100 bg-gradient-to-b from-stone-50/80 to-stone-50/40 px-3 py-3 [-webkit-overflow-scrolling:touch]">
              {visibleItems.length ? (
                <div className="space-y-4 pb-1">
                  {groupedItems.map((group) => (
                    <section key={group.category.id}>
                      <div className="mb-2 flex items-center gap-2 px-1">
                        <span aria-hidden className="text-base leading-none">
                          {group.category.emoji}
                        </span>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                          {t(`categories.${group.category.id}`)}
                        </h3>
                        <span className="ml-auto rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-stone-400">
                          {group.items.length}
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {group.items.map((item) => (
                          <ShoppingListItemRow
                            key={item.id}
                            item={item}
                            usedInMealsLabel={t("usedInMeals", { count: item.usedInRecipes })}
                            removeAria={`${removeAria}: ${item.name}`}
                            onRemove={() => handleRemoveItem(item.id)}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="px-2 text-sm text-stone-600">
                  {items.length
                    ? t.has("shoppingListAllRemoved")
                      ? t("shoppingListAllRemoved")
                      : "Has quitado todos los ingredientes de la lista."
                    : t("emptyShoppingList")}
                </p>
              )}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={isLoading || !visibleItems.length || isCopying}
            className="mt-4 flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#4c6633] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3e5219] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            {isCopying ? t("copying") : t("copyList")}
          </button>
        </div>
      </div>
    </div>
  );
}
