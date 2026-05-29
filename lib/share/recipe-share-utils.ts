import type { Json } from "@/types/database.types";
import type { ShareableRecipe } from "@/lib/share/recipe-share-image";

export function inferDifficulty(pasosCount: number): string {
  if (pasosCount <= 3) return "FÁCIL";
  if (pasosCount <= 5) return "INTERMEDIO";
  return "AVANZADO";
}

export function formatTimeLabel(tiempo: string): string {
  const t = tiempo.trim().toUpperCase();
  if (t.includes("MIN")) return t.replace(/\s+/g, "\u00A0");
  const n = tiempo.match(/\d+/);
  return n ? `${n[0]}\u00A0MIN` : tiempo;
}

export function jsonToStringList(value: Json): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

export function parseInstructionsToSteps(instructions: string): string[] {
  return instructions
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

export function buildMacroData(recipe: ShareableRecipe) {
  const ingredientCount = Math.max(recipe.ingredientes_detallados.length, 1);
  const stepCount = Math.max(recipe.pasos_ordenados?.length ?? 0, 1);

  const proteinas = Math.min(18 + ingredientCount * 2, 42);
  const carbs = Math.min(24 + stepCount * 3, 58);
  const grasas = Math.min(10 + ingredientCount, 28);
  const calorias = 220 + proteinas * 4 + carbs * 4 + grasas * 9;

  const maxGram = 60;
  return [
    { label: "Proteínas", value: `${proteinas} g`, progress: Math.round((proteinas / maxGram) * 100) },
    { label: "Carbs", value: `${carbs} g`, progress: Math.round((carbs / maxGram) * 100) },
    { label: "Grasas", value: `${grasas} g`, progress: Math.round((grasas / maxGram) * 100) },
    {
      label: "Calorías",
      value: `${calorias} kcal`,
      progress: Math.min(Math.round((calorias / 520) * 100), 100)
    }
  ];
}

type SavedRecipeSource = {
  title: string;
  ingredients: Json;
  steps?: Json;
  instructions: string;
  cooking_time: number | null;
  tip_sandra?: string | null;
};

export function savedRecipeToShareable(recipe: SavedRecipeSource): ShareableRecipe {
  const ingredientes = jsonToStringList(recipe.ingredients);
  let pasos = recipe.steps ? jsonToStringList(recipe.steps) : [];
  if (pasos.length === 0) {
    pasos = parseInstructionsToSteps(recipe.instructions);
  }

  const tiempo =
    recipe.cooking_time && recipe.cooking_time > 0
      ? `${recipe.cooking_time} min`
      : "25 min";

  return {
    titulo: recipe.title,
    tiempo_preparacion: tiempo,
    ingredientes_detallados: ingredientes,
    pasos_ordenados: pasos,
    tip_sandra: recipe.tip_sandra ?? ""
  };
}
