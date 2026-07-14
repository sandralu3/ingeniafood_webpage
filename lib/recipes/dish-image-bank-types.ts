import type { RecipeCuisineStyle, RecipeMealType } from "@/lib/recipes/premium-recipe-filters";

export type DishImageBankRow = {
  id: string;
  image_url: string;
  title: string;
  meal_types: string[];
  cuisine_styles: string[];
  keywords: string[];
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DishImageBankItem = {
  id: string;
  imageUrl: string;
  title: string;
  mealTypes: RecipeMealType[];
  cuisineStyles: RecipeCuisineStyle[];
  keywords: string[];
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MatchDishImageInput = {
  recipeTitle: string;
  ingredients: string[];
  tags: string[];
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
};

export type MatchDishImageResult = {
  imageUrl: string;
  bankItemId: string;
  score: number;
  matchedTitle: string;
};
