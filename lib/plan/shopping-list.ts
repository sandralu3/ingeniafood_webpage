import type { Json } from "@/types/database.types";
import {
  formatAggregatedQuantities,
  normalizeIngredientKey,
  pickDisplayName
} from "@/lib/plan/ingredient-parser";
import {
  normalizeIngredientsJson,
  type StructuredIngredient
} from "@/lib/recipes/structured-ingredients";

export type ShoppingListItem = {
  id: string;
  name: string;
  quantityLabel: string | null;
  usedInRecipes: number;
};

type IngredientGroup = {
  names: string[];
  amounts: Map<string, number>;
  qualitativeCount: number;
  usedInRecipes: number;
};

function addToGroup(group: IngredientGroup, item: StructuredIngredient): void {
  group.names.push(item.name);
  group.usedInRecipes += 1;

  if (item.optional && item.amount === null && !item.unit) {
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

    for (const item of structuredIngredients) {
      const key = normalizeIngredientKey(item.name);
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          names: [item.name],
          amounts: new Map(),
          qualitativeCount: 0,
          usedInRecipes: 0
        });
      }

      addToGroup(groups.get(key)!, item);
    }
  }

  return Array.from(groups.entries())
    .map(([key, group]) => ({
      id: key,
      name: pickDisplayName(group.names),
      quantityLabel: formatAggregatedQuantities(group.amounts, group.qualitativeCount),
      usedInRecipes: group.usedInRecipes
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function formatShoppingListText(items: ShoppingListItem[]): string {
  if (!items.length) return "Tu lista de compra está vacía esta semana.";

  return items
    .map((item) => {
      if (item.quantityLabel) {
        return `• ${item.name} — ${item.quantityLabel}`;
      }

      if (item.usedInRecipes > 1) {
        return `• ${item.name} (en ${item.usedInRecipes} comidas)`;
      }

      return `• ${item.name}`;
    })
    .join("\n");
}
