"use client";

import {
  Apple,
  Beef,
  Copy,
  Droplets,
  Flame,
  Loader2,
  type LucideIcon,
  Milk,
  Package,
  ShoppingBasket,
  Snowflake,
  Sprout,
  Trash2,
  Wheat,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  formatShoppingListText,
  groupShoppingListByCategory,
  type ShoppingListItem
} from "@/lib/plan/shopping-list";
import type { ShoppingListCategoryId } from "@/lib/plan/shopping-list-categories";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<ShoppingListCategoryId, LucideIcon> = {
  verduras_frutas: Apple,
  proteinas: Beef,
  lacteos: Milk,
  frios: Snowflake,
  carbohidratos: Wheat,
  grasas: Droplets,
  despensa: Package,
  especias: Flame,
  otros: Sprout
};

type ShoppingListModalProps = {
  open: boolean;
  subtitle?: string;
  items: ShoppingListItem[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onItemsChange?: (items: ShoppingListItem[]) => void;
};

function ShoppingListItemRow({
  item,
  removeAria,
  onRemove,
  isLast
}: {
  item: ShoppingListItem;
  removeAria: string;
  onRemove: () => void;
  isLast: boolean;
}) {
  const hasQty = Boolean(item.quantityLabel?.trim());

  return (
    <li
      className={cn(
        "flex items-center gap-2 px-2.5 py-[5px]",
        !isLast && "border-b border-stone-100/80"
      )}
    >
      {hasQty ? (
        <span
          className="inline-flex min-w-[3.4rem] shrink-0 justify-end rounded-md bg-[#F0F4ED] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-[#3e5219]"
          title={item.quantityLabel!}
        >
          {item.quantityLabel}
        </span>
      ) : (
        <span className="min-w-[3.4rem] shrink-0" aria-hidden />
      )}
      <p className="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight text-stone-800">
        {item.name}
        {item.usedInRecipes > 1 ? (
          <span className="ml-1 text-[10px] font-normal text-stone-400">
            ·{item.usedInRecipes}
          </span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeAria}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-stone-300 transition hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 className="h-2.5 w-2.5" strokeWidth={2.25} />
      </button>
    </li>
  );
}

export function ShoppingListModal({
  open,
  subtitle,
  items,
  isLoading = false,
  errorMessage,
  onClose,
  onItemsChange
}: ShoppingListModalProps) {
  const t = useTranslations("Plan");
  const tCommon = useTranslations("Common");
  const [isCopying, setIsCopying] = useState(false);
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [visibleItems, setVisibleItems] = useState<ShoppingListItem[]>(items);

  useEffect(() => {
    if (open) {
      setVisibleItems(items);
      setCopiedFlash(false);
    }
  }, [items, open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

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
      setCopiedFlash(true);
      window.setTimeout(() => setCopiedFlash(false), 1800);
    } catch {
      // ignore
    } finally {
      setIsCopying(false);
    }
  };

  if (!open) return null;

  const title = t.has("shoppingListTitle")
    ? t("shoppingListTitle")
    : t("shoppingListButton");
  const removeAria = t.has("removeShoppingItemAria")
    ? t("removeShoppingItemAria")
    : "Quitar de la lista";

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/45 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <button
        type="button"
        aria-label={tCommon("close")}
        className="absolute inset-0"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shopping-list-title"
        className="relative z-10 flex max-h-[78vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-stone-100 bg-[#FBF8F3] shadow-2xl sm:rounded-3xl"
      >
        <div className="shrink-0 bg-white/90 px-4 pt-0 pb-0 backdrop-blur-sm">
          <SwipeToCloseHandle onClose={onClose} disabled={isLoading} thresholdPx={70} />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-100/90 bg-white px-4 pb-2.5 pt-0.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F0F4ED] text-[#556B2F] ring-1 ring-[#556B2F]/15">
              <ShoppingBasket className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700/80">
                {subtitle || t("shoppingListEyebrow")}
                {visibleItems.length > 0 ? ` · ${visibleItems.length}` : ""}
              </p>
              <h2
                id="shopping-list-title"
                className="font-serif text-sm font-semibold leading-tight text-stone-900"
              >
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
            aria-label={tCommon("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
          {errorMessage ? (
            <p className="mb-2 shrink-0 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <div className="mb-2 flex shrink-0 items-center gap-2 rounded-xl border border-stone-100 bg-white px-3 py-2.5 text-xs text-stone-600 shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#556B2F]" />
              {t("generatingShoppingList")}
            </div>
          ) : null}

          {!isLoading ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
              {visibleItems.length ? (
                <div className="space-y-2 pb-0.5">
                  {groupedItems.map((group) => {
                    const CategoryIcon = CATEGORY_ICONS[group.category.id] ?? Sprout;
                    return (
                    <section
                      key={group.category.id}
                      className="overflow-hidden rounded-xl border border-stone-100/90 bg-white shadow-sm shadow-stone-200/40"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-stone-100/80 bg-gradient-to-r from-[#F0F4ED]/90 to-white px-2.5 py-1">
                        <h3 className="flex min-w-0 items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[#556B2F]">
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-[#556B2F]/10 text-[#556B2F] ring-1 ring-[#556B2F]/15">
                            <CategoryIcon className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden />
                          </span>
                          <span className="truncate">{t(`categories.${group.category.id}`)}</span>
                        </h3>
                        <span className="rounded-full bg-white px-1.5 py-px text-[9px] font-semibold tabular-nums text-stone-400 ring-1 ring-stone-100">
                          {group.items.length}
                        </span>
                      </div>
                      <ul>
                        {group.items.map((item, index) => (
                          <ShoppingListItemRow
                            key={item.id}
                            item={item}
                            isLast={index === group.items.length - 1}
                            removeAria={`${removeAria}: ${item.name}`}
                            onRemove={() => handleRemoveItem(item.id)}
                          />
                        ))}
                      </ul>
                    </section>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-200 bg-white/80 px-4 py-6 text-center">
                  <ShoppingBasket
                    className="mx-auto mb-2 h-6 w-6 text-stone-300"
                    strokeWidth={1.5}
                  />
                  <p className="text-xs text-stone-500">
                    {items.length
                      ? t.has("shoppingListAllRemoved")
                        ? t("shoppingListAllRemoved")
                        : "Has quitado todos los ingredientes de la lista."
                      : t("emptyShoppingList")}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={isLoading || !visibleItems.length || isCopying}
            className="mt-2 flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#4c6633] px-3 py-2.5 text-xs font-semibold text-white shadow-sm shadow-[#4c6633]/25 transition hover:bg-[#3e5219] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCopying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            {isCopying
              ? t("copying")
              : copiedFlash
                ? t.has("listCopied")
                  ? t("listCopied")
                  : "Lista copiada"
                : t("copyList")}
          </button>
        </div>
      </div>
    </div>
  );
}
