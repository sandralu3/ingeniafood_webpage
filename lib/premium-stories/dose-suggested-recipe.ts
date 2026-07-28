import type { MealType } from "@/lib/plan/constants";
import type { RecipeMealType } from "@/lib/recipes/premium-recipe-filters";
import type { IntelligentDoseMealSnapshot } from "@/lib/premium-stories/intelligent-dose-context";
import {
  calorieTargetRatio,
  isModeratelyOverCalorieTarget,
  isModeratelyUnderCalorieTarget,
  isSeverelyOverCalorieTarget,
  isSeverelyUnderCalorieTarget,
  isWithinCalorieSweetSpot
} from "@/lib/nutrition/tdee";
import { DEFAULT_DAY_BUDGET } from "@/lib/plan/meal-suggestion";

export type DoseSuggestedRecipe = {
  /** Idea corta para el generador (ej. "Pollo a la plancha con verduras asadas"). */
  idea: string;
  /** Ingredientes semilla para el escáner. */
  ingredients: string[];
  /** Slot del plan (mañana). */
  planMealType: MealType;
  /** Filtro del generador de recetas. */
  recipeMealType: RecipeMealType;
};

/** low/high = extremo; below/above = fuera del ±15% de la meta. */
export type DayBalanceCalorieWarning = "low" | "below" | "above" | "high" | null;

export type DayBalanceLevel = {
  score: number;
  labelKey: "excellent" | "good" | "improve";
  emoji: string;
  /** Aviso preventivo vs meta calórica personalizada. */
  calorieWarning: DayBalanceCalorieWarning;
  /** Meta usada para el tramo calórico. */
  calorieTarget: number;
  calorieRatio: number;
};

export type ComputeDayBalanceOptions = {
  /** Meta kcal diaria (perfil o default 2000). */
  calorieTarget?: number | null;
};

/**
 * Puntuación 0–100 del balance del día.
 * El tramo calórico se mide contra la meta personalizada (±15% = máximo).
 * Fuera del sweet spot no se puede etiquetar como "excellent".
 */
export function computeDayBalanceLevel(
  today: IntelligentDoseMealSnapshot,
  options?: ComputeDayBalanceOptions
): DayBalanceLevel {
  const calorieTarget =
    typeof options?.calorieTarget === "number" && options.calorieTarget > 0
      ? options.calorieTarget
      : DEFAULT_DAY_BUDGET.calories;

  const ratio = calorieTargetRatio(today.totalCalories, calorieTarget);
  let calorieWarning: DayBalanceCalorieWarning = null;
  if (isSeverelyUnderCalorieTarget(ratio)) calorieWarning = "low";
  else if (isSeverelyOverCalorieTarget(ratio)) calorieWarning = "high";
  else if (isModeratelyUnderCalorieTarget(ratio)) calorieWarning = "below";
  else if (isModeratelyOverCalorieTarget(ratio)) calorieWarning = "above";

  let score = 28;

  if (today.mealCount >= 3) score += 22;
  else score += today.mealCount * 7;

  // Tramo calórico: máx +24 dentro de ±15% de la meta.
  if (isWithinCalorieSweetSpot(ratio)) {
    score += 24;
  } else if (ratio >= 0.75 && ratio < 0.85) {
    score += 12;
  } else if (ratio > 1.15 && ratio <= 1.25) {
    score += 12;
  } else if (ratio >= 0.6 && ratio < 0.75) {
    score += 6;
  } else if (ratio > 1.25 && ratio <= 1.3) {
    score += 6;
  } else if (ratio > 0 && ratio < 0.6) {
    score += Math.round((ratio / 0.6) * 6);
  } else if (ratio > 1.3) {
    score += 3;
  }

  if (today.hasProtein) score += 14;
  else if (today.totalProtein >= 10) score += 6;

  if (today.hasVegetables) score += 12;

  if (today.isLikelyLiquidOnly) score = Math.min(score, 35);

  // Caps: sin "excellent" si estás fuera del rango de la meta personalizada.
  if (calorieWarning === "low") score = Math.min(score, 55);
  else if (calorieWarning === "below") score = Math.min(score, 72);
  else if (calorieWarning === "above") score = Math.min(score, 75);
  else if (calorieWarning === "high") score = Math.min(score, 68);

  if (today.isLowCalorieDay && calorieWarning !== "high" && calorieWarning !== "above") {
    score = Math.min(score, 62);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 80) {
    return {
      score,
      labelKey: "excellent",
      emoji: "🟢",
      calorieWarning,
      calorieTarget,
      calorieRatio: ratio
    };
  }
  if (score >= 55) {
    return {
      score,
      labelKey: "good",
      emoji: "🟡",
      calorieWarning,
      calorieTarget,
      calorieRatio: ratio
    };
  }
  return {
    score,
    labelKey: "improve",
    emoji: "🔴",
    calorieWarning,
    calorieTarget,
    calorieRatio: ratio
  };
}

export function buildDoseSuggestedRecipe(
  today: IntelligentDoseMealSnapshot
): DoseSuggestedRecipe {
  if (!today.hasProtein || today.isLowCalorieDay || today.isLikelyLiquidOnly) {
    return {
      idea: "Pollo a la plancha con verduras asadas",
      ingredients: ["Pollo", "Calabacín", "Pimiento", "Aceite de oliva"],
      planMealType: "Almuerzo",
      recipeMealType: "almuerzo"
    };
  }

  if (!today.hasVegetables) {
    return {
      idea: "Salmón a la plancha con ensalada fresca",
      ingredients: ["Salmón", "Lechuga", "Tomate", "Aceite de oliva"],
      planMealType: "Cena",
      recipeMealType: "cena"
    };
  }

  return {
    idea: "Pollo a la plancha y ensalada fresca",
    ingredients: ["Pollo", "Lechuga", "Tomate", "Aceite de oliva"],
    planMealType: "Cena",
    recipeMealType: "cena"
  };
}

/** Extrae una idea usable si la IA no devolvió suggestedRecipe estructurado. */
export function extractIdeaFromActionText(action: string): string | null {
  const cleaned = action
    .replace(/[🔥✨🌟💡🎯¡!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  const patterns = [
    /(?:prueba|integra|añade|suma|prepara|cierra el d[ií]a con|opta por)\s+(.+?)(?:\.|!|$)/i,
    /(?:mañana|tomorrow)\s+(.+?)(?:\.|!|$)/i
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate && candidate.length >= 8 && candidate.length <= 120) {
      return candidate.replace(/\s*¡?[Tt]ú puedes!?$/i, "").trim();
    }
  }

  if (cleaned.length <= 120) return cleaned;
  return cleaned.slice(0, 117).trim() + "…";
}

const FOOD_SEED_MAP: Array<{ pattern: RegExp; ingredients: string[] }> = [
  { pattern: /pollo/i, ingredients: ["Pollo"] },
  { pattern: /huevo/i, ingredients: ["Huevos"] },
  { pattern: /salm[oó]n/i, ingredients: ["Salmón"] },
  { pattern: /at[uú]n/i, ingredients: ["Atún"] },
  { pattern: /legumbre|lenteja|garbanzo/i, ingredients: ["Lentejas"] },
  { pattern: /tofu/i, ingredients: ["Tofu"] },
  { pattern: /verdura|ensalada|esp[aá]rrago|vegetal/i, ingredients: ["Lechuga", "Tomate"] },
  { pattern: /calabac/i, ingredients: ["Calabacín"] },
  { pattern: /pimiento/i, ingredients: ["Pimiento"] }
];

export function inferIngredientsFromIdea(idea: string): string[] {
  const found = new Set<string>();
  for (const entry of FOOD_SEED_MAP) {
    if (entry.pattern.test(idea)) {
      entry.ingredients.forEach((ing) => found.add(ing));
    }
  }
  if (found.size === 0) {
    return ["Pollo", "Verduras", "Aceite de oliva"];
  }
  return Array.from(found).slice(0, 6);
}
