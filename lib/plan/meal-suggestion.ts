import type { MealType } from "@/lib/plan/constants";
import { recipeMatchesMealType } from "@/lib/plan/match-meal-type";
import {
  preferredDietScoreBonus,
  type PreferredDiet
} from "@/lib/nutrition/preferred-diet";
import { parseMacrosFromJson, type RecipeMacros } from "@/lib/recipes/recipe-macros";
import type { Json } from "@/types/database.types";

/** Presupuesto diario por defecto cuando el usuario no tiene objetivos. */
export const DEFAULT_DAY_BUDGET = {
  calories: 2000,
  protein: 90,
  carbs: 220,
  fat: 65
} as const;

/** Reparto energético aproximado por comida. */
export const MEAL_SHARE: Record<MealType, number> = {
  Desayuno: 0.28,
  Almuerzo: 0.4,
  Cena: 0.32
};

export type RemainingMacros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealSuggestion = {
  recipeId: string;
  title: string;
  imageUrl: string | null;
  kcal: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  mealType: MealType;
  source: "catalog" | "ai-ranked";
};

export type MealSuggestionCandidate = {
  id: string;
  title: string;
  description: string | null;
  instructions: string;
  image_url: string | null;
  macros?: Json | null;
  meal_type?: string | null;
  tags?: Json | null;
  is_airfryer?: boolean | null;
  is_flourless?: boolean | null;
  cuisine_style?: string | null;
};

export function computeRemainingMacros(
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  },
  budget?: Partial<RemainingMacros> | null
): RemainingMacros {
  const calories = budget?.calories ?? DEFAULT_DAY_BUDGET.calories;
  const protein = budget?.protein ?? DEFAULT_DAY_BUDGET.protein;
  const carbs = budget?.carbs ?? DEFAULT_DAY_BUDGET.carbs;
  const fat = budget?.fat ?? DEFAULT_DAY_BUDGET.fat;
  return {
    calories: Math.max(0, calories - consumed.calories),
    protein: Math.max(0, protein - consumed.protein),
    carbs: Math.max(0, carbs - consumed.carbs),
    fat: Math.max(0, fat - consumed.fat)
  };
}

/**
 * Reparte el presupuesto restante entre los slots que aún hay que rellenar
 * (p. ej. solo Almuerzo+Cena si Desayuno ya estaba ocupado).
 */
export function mealShareAmongSlots(
  mealType: MealType,
  activeSlots: MealType[]
): number {
  const slots = activeSlots.length > 0 ? activeSlots : (Object.keys(MEAL_SHARE) as MealType[]);
  const total = slots.reduce((sum, slot) => sum + (MEAL_SHARE[slot] ?? 0), 0);
  if (total <= 0) return MEAL_SHARE[mealType] ?? 0.33;
  return (MEAL_SHARE[mealType] ?? 0) / total;
}

function resolveMacros(raw: Json | null | undefined): RecipeMacros | null {
  return parseMacrosFromJson(raw ?? null);
}

function targetForMeal(
  mealType: MealType,
  remaining: RemainingMacros,
  activeSlots?: MealType[]
): RemainingMacros {
  const share = activeSlots?.length
    ? mealShareAmongSlots(mealType, activeSlots)
    : MEAL_SHARE[mealType];
  return {
    calories: Math.max(180, Math.round(remaining.calories * share)),
    protein: Math.max(8, Math.round(remaining.protein * share)),
    carbs: Math.max(15, Math.round(remaining.carbs * share)),
    fat: Math.max(5, Math.round(remaining.fat * share))
  };
}

/** Menor score = mejor encaje con macros restantes del slot. */
export function scoreCandidateForMeal(
  candidate: MealSuggestionCandidate,
  mealType: MealType,
  remaining: RemainingMacros,
  activeSlots?: MealType[],
  preferredDiet?: PreferredDiet | null
): number {
  const macros = resolveMacros(candidate.macros);
  const target = targetForMeal(mealType, remaining, activeSlots);
  const preferredType =
    mealType === "Desayuno" ? "desayuno" : mealType === "Cena" ? "cena" : "almuerzo";
  const resolvedType = (candidate.meal_type ?? "").toLowerCase();
  const exactSlotBonus = resolvedType === preferredType ? -18 : 0;
  const dietBonus = preferredDietScoreBonus(candidate, preferredDiet);

  if (!macros) {
    return 80 + exactSlotBonus + dietBonus;
  }

  const kcalGap = Math.abs(macros.calorias - target.calories) / Math.max(target.calories, 1);
  const proteinGap =
    Math.abs(macros.proteinas_g - target.protein) / Math.max(target.protein, 1);
  const overshoot =
    macros.calorias > remaining.calories + 80
      ? (macros.calorias - remaining.calories) / 40
      : 0;

  return kcalGap * 40 + proteinGap * 25 + overshoot * 10 + exactSlotBonus + dietBonus;
}

export function toMealSuggestion(
  candidate: MealSuggestionCandidate,
  mealType: MealType,
  source: MealSuggestion["source"] = "catalog"
): MealSuggestion {
  const macros = resolveMacros(candidate.macros);
  return {
    recipeId: candidate.id,
    title: candidate.title,
    imageUrl: candidate.image_url?.trim() || null,
    kcal: macros?.calorias ?? null,
    proteinGrams: macros?.proteinas_g ?? null,
    carbsGrams: macros?.carbohidratos_g ?? null,
    fatGrams: macros?.grasas_g ?? null,
    mealType,
    source
  };
}

/**
 * Filtra por coherencia de comida (igual que el plan semanal) y ordena por macros.
 * Desayuno → solo desayunos; Almuerzo/Cena intercambiables; postre fuera.
 */
export function rankMealCandidates(
  candidates: MealSuggestionCandidate[],
  mealType: MealType,
  remaining: RemainingMacros,
  excludeRecipeIds: string[] = [],
  activeSlots?: MealType[],
  preferredDiet?: PreferredDiet | null
): MealSuggestionCandidate[] {
  const excluded = new Set(excludeRecipeIds.filter(Boolean));
  return candidates
    .filter((item) => !excluded.has(item.id))
    .filter((item) => recipeMatchesMealType(item, mealType))
    .map((item) => ({
      item,
      score: scoreCandidateForMeal(item, mealType, remaining, activeSlots, preferredDiet)
    }))
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.item);
}

/**
 * Elige una sugerencia del catálogo (macros + dieta preferida).
 * Si hay varios tops cercanos, introduce un poco de aleatoriedad.
 */
export function pickMealSuggestionFromCatalog(
  candidates: MealSuggestionCandidate[],
  mealType: MealType,
  remaining: RemainingMacros,
  excludeRecipeIds: string[] = [],
  activeSlots?: MealType[],
  preferredDiet?: PreferredDiet | null
): MealSuggestion | null {
  const ranked = rankMealCandidates(
    candidates,
    mealType,
    remaining,
    excludeRecipeIds,
    activeSlots,
    preferredDiet
  );
  if (ranked.length === 0) return null;

  const top = ranked.slice(0, Math.min(4, ranked.length));
  const chosen = top[Math.floor(Math.random() * top.length)] ?? ranked[0];
  return toMealSuggestion(chosen, mealType, "catalog");
}

/** Resta lo consumido de un plato al presupuesto restante del día. */
export function subtractSuggestionFromRemaining(
  remaining: RemainingMacros,
  suggestion: Pick<MealSuggestion, "kcal" | "proteinGrams" | "carbsGrams" | "fatGrams">
): RemainingMacros {
  return {
    calories: Math.max(0, remaining.calories - (suggestion.kcal ?? 0)),
    protein: Math.max(0, remaining.protein - (suggestion.proteinGrams ?? 0)),
    carbs: Math.max(0, remaining.carbs - (suggestion.carbsGrams ?? 0)),
    fat: Math.max(0, remaining.fat - (suggestion.fatGrams ?? 0))
  };
}
