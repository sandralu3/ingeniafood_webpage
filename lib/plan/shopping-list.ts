import type { Json } from "@/types/database.types";
import {
  categorizeShoppingIngredient,
  compareShoppingListItems,
  groupShoppingListByCategory,
  type ShoppingListCategoryGroup,
  type ShoppingListCategoryId
} from "@/lib/plan/shopping-list-categories";
import {
  pickCanonicalDisplayName,
  resolveCanonicalIngredient,
  splitCompoundIngredientName
} from "@/lib/plan/shopping-list-canonical";
import { formatAggregatedQuantities } from "@/lib/plan/ingredient-parser";
import {
  normalizeIngredientsJson,
  refineStructuredIngredient,
  type StructuredIngredient
} from "@/lib/recipes/structured-ingredients";

export type ShoppingListItem = {
  id: string;
  name: string;
  quantityLabel: string | null;
  usedInRecipes: number;
  category: ShoppingListCategoryId;
};

type IngredientGroup = {
  names: string[];
  amounts: Map<string, number>;
  qualitativeCount: number;
  usedInRecipes: number;
};

function expandShoppingIngredients(item: StructuredIngredient): StructuredIngredient[] {
  const refined = refineStructuredIngredient(item);
  const parts = splitCompoundIngredientName(refined.name);

  if (parts.length === 1) {
    return [refined];
  }

  return parts.map((part) => ({
    ...refined,
    name: part
  }));
}

function addToGroup(group: IngredientGroup, item: StructuredIngredient): void {
  group.names.push(item.name);

  const isQualitativeOnly =
    item.optional ||
    (item.amount === null && !item.unit && /al gusto|opcional|toque|chorrito|pizca|poco/i.test(item.name));

  if (isQualitativeOnly && item.amount === null && !item.unit) {
    group.qualitativeCount += 1;
    return;
  }

  if (item.amount !== null && item.unit) {
    const current = group.amounts.get(item.unit) ?? 0;
    group.amounts.set(item.unit, current + item.amount);
    return;
  }

  if (item.amount !== null && !item.unit) {
    const current = group.amounts.get("ud") ?? 0;
    group.amounts.set("ud", current + item.amount);
    return;
  }

  if (isQualitativeOnly) {
    group.qualitativeCount += 1;
  }
}

export function buildShoppingListItems(params: {
  recipes: Array<{
    ingredients: Json;
  }>;
}): ShoppingListItem[] {
  const groups = new Map<string, IngredientGroup>();

  for (const recipe of params.recipes) {
    const structuredIngredients = normalizeIngredientsJson(recipe.ingredients);
    const keysInRecipe = new Set<string>();

    for (const rawItem of structuredIngredients) {
      for (const item of expandShoppingIngredients(rawItem)) {
        const key = resolveCanonicalIngredient(item.name).key;

        if (!groups.has(key)) {
          groups.set(key, {
            names: [],
            amounts: new Map(),
            qualitativeCount: 0,
            usedInRecipes: 0
          });
        }

        const group = groups.get(key)!;
        addToGroup(group, item);
        keysInRecipe.add(key);
      }
    }

    for (const key of Array.from(keysInRecipe)) {
      groups.get(key)!.usedInRecipes += 1;
    }
  }

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const name = pickCanonicalDisplayName(group.names, key);
      const qualitativeCount = group.amounts.size > 0 ? 0 : group.qualitativeCount;

      return {
        id: key,
        name,
        quantityLabel: formatAggregatedQuantities(group.amounts, qualitativeCount),
        usedInRecipes: group.usedInRecipes,
        category: categorizeShoppingIngredient(name)
      };
    })
    .sort(compareShoppingListItems);
}

export { groupShoppingListByCategory, type ShoppingListCategoryGroup };

export type FormatShoppingListTextOptions = {
  emptyMessage?: string;
  getCategoryLabel?: (categoryId: ShoppingListItem["category"]) => string;
  usedInMealsLabel?: (count: number) => string;
};

export function formatShoppingListText(
  items: ShoppingListItem[],
  options?: FormatShoppingListTextOptions
): string {
  if (!items.length) {
    return options?.emptyMessage ?? "Tu lista de compra está vacía esta semana.";
  }

  const groups = groupShoppingListByCategory(items);

  return groups
    .map((group) => {
      const categoryLabel =
        options?.getCategoryLabel?.(group.category.id) ?? group.category.label;
      const header = `${group.category.emoji} ${categoryLabel.toUpperCase()}`;
      const lines = group.items.map((item) => {
        if (item.quantityLabel) {
          return `  • ${item.name} — ${item.quantityLabel}`;
        }

        if (item.usedInRecipes > 1) {
          const usedLabel =
            options?.usedInMealsLabel?.(item.usedInRecipes) ??
            `en ${item.usedInRecipes} comidas`;
          return `  • ${item.name} (${usedLabel})`;
        }

        return `  • ${item.name}`;
      });

      return [header, ...lines].join("\n");
    })
    .join("\n\n");
}
