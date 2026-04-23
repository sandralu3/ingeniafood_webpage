type RecipeSuggestion = {
  title: string;
  description: string;
};

export async function generateRecipeFromIngredients(
  ingredients: string[]
): Promise<RecipeSuggestion> {
  const response = await fetch("/api/ai/recipes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ingredients })
  });

  if (!response.ok) {
    throw new Error("No se pudo generar la receta.");
  }

  return response.json();
}
