import type { DishImageBankItem } from "@/lib/recipes/dish-image-bank-types";
import type { RecipeCuisineStyle, RecipeMealType } from "@/lib/recipes/premium-recipe-filters";
import type { DishBankActiveFilter } from "@/components/admin/dish-bank-filters";

export type DishBankFilterState = {
  searchQuery: string;
  mealTypes: RecipeMealType[];
  cuisineStyles: RecipeCuisineStyle[];
  activeFilter: DishBankActiveFilter;
};

export function filterDishBankItems(
  items: DishImageBankItem[],
  filters: DishBankFilterState
): DishImageBankItem[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.activeFilter === "active" && !item.isActive) return false;
    if (filters.activeFilter === "inactive" && item.isActive) return false;

    if (
      filters.mealTypes.length > 0 &&
      !filters.mealTypes.some((mealType) => item.mealTypes.includes(mealType))
    ) {
      return false;
    }

    if (
      filters.cuisineStyles.length > 0 &&
      !filters.cuisineStyles.some((style) => item.cuisineStyles.includes(style))
    ) {
      return false;
    }

    if (!query) return true;

    const haystack = [item.title, ...item.keywords, ...item.tags].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}
