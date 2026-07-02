import type { MealType } from "@/lib/plan/constants";

type RecipeCandidate = {
  id: string;
  title: string;
  description: string | null;
  instructions: string;
};

const MEAL_KEYWORDS: Record<MealType, string[]> = {
  Desayuno: ["desayuno", "breakfast", "avena", "tostada", "smoothie", "huevo", "bowl matutino"],
  Almuerzo: ["almuerzo", "comida", "lunch", "pollo", "ensalada", "quinoa", "garbanzo", "bowl"],
  Cena: ["cena", "dinner", "salmón", "salmon", "wok", "tofu", "airfryer", "pescado"]
};

function recipeSearchText(recipe: RecipeCandidate): string {
  return `${recipe.title} ${recipe.description ?? ""} ${recipe.instructions}`.toLowerCase();
}

export function recipeMatchesMealType(recipe: RecipeCandidate, mealType: MealType): boolean {
  const text = recipeSearchText(recipe);
  return MEAL_KEYWORDS[mealType].some((keyword) => text.includes(keyword));
}

export function pickRandomRecipe(
  recipes: RecipeCandidate[],
  mealType: MealType,
  excludeRecipeId: string
): RecipeCandidate | null {
  const pool = recipes.filter((recipe) => recipe.id !== excludeRecipeId);
  if (!pool.length) return null;

  const typed = pool.filter((recipe) => recipeMatchesMealType(recipe, mealType));
  const candidates = typed.length ? typed : pool;
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index] ?? null;
}
