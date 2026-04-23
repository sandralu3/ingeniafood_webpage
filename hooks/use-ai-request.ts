"use client";

import { useState } from "react";
import { generateRecipeFromIngredients } from "@/services/ai.service";

export function useAiRequest() {
  const [isLoading, setIsLoading] = useState(false);

  const requestRecipe = async (ingredients: string[]) => {
    setIsLoading(true);
    try {
      return await generateRecipeFromIngredients(ingredients);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    requestRecipe
  };
}
