import type { MealType, WeekDay } from "@/lib/plan/constants";
import type { PlanMeal } from "@/components/plan/plan-meal-card";
import {
  buildExternalMealTags,
  formatExternalMealFoodLine,
  formatExternalMealRecommendations,
  type ExternalMealEstimate
} from "@/lib/plan/external-meal";
import { assignRecipeToPlan } from "@/lib/plan/plan-service";
import { canRegisterExternalMealForPlanDay } from "@/lib/plan/week-utils";
import { saveGeneratedRecipeToLibrary } from "@/lib/recipes/save-generated-recipe";
import {
  stringsToStructuredIngredients,
  structuredIngredientsToJson
} from "@/lib/recipes/structured-ingredients";
import { createSupabaseClient } from "@/lib/supabaseClient";

function mapMealTypeToFilter(mealType: MealType): "desayuno" | "almuerzo" | "cena" {
  if (mealType === "Desayuno") return "desayuno";
  if (mealType === "Cena") return "cena";
  return "almuerzo";
}

/**
 * Persiste la estimación como registro privado (sin módulo de receta) y la asigna al plan.
 * Solo guarda imageUrl cuando el usuario escaneó el plato; texto = sin imagen.
 */
export async function registerExternalMealToPlan(params: {
  userId: string;
  estimate: ExternalMealEstimate;
  dayLabel: WeekDay;
  mealType: MealType;
  weekStartISO: string;
  /** Solo foto del plato escaneado; null en registro por texto. */
  imageUrl?: string | null;
}): Promise<{ meal: PlanMeal } | { error: string }> {
  if (!canRegisterExternalMealForPlanDay(params.weekStartISO, params.dayLabel)) {
    return {
      error:
        "No puedes registrar una comida fuera en un día futuro: todavía no ha ocurrido."
    };
  }

  const supabase = createSupabaseClient();
  const tags = buildExternalMealTags(params.estimate);

  const proteinKcal = params.estimate.proteinas_est_g * 4;
  const remainingKcal = Math.max(0, params.estimate.calorias_est - proteinKcal);
  const macros = {
    calorias: params.estimate.calorias_est,
    proteinas_g: params.estimate.proteinas_est_g,
    carbohidratos_g: Math.max(15, Math.round((remainingKcal * 0.55) / 4)),
    grasas_g: Math.max(5, Math.round((remainingKcal * 0.45) / 9))
  };

  const platePhoto = params.imageUrl?.trim() || null;
  const ingredientLines =
    params.estimate.alimentos?.length > 0
      ? params.estimate.alimentos.map(formatExternalMealFoodLine)
      : [];
  const adviceText = formatExternalMealRecommendations(params.estimate);

  const saveResult = await saveGeneratedRecipeToLibrary(supabase, {
    userId: params.userId,
    title: params.estimate.nombre_plato,
    ingredients: structuredIngredientsToJson(
      stringsToStructuredIngredients(ingredientLines)
    ),
    steps: [],
    instructions: "Registro de comida externa (sin preparación).",
    tipSandra: adviceText || "",
    isAirfryer: false,
    isFlourless: false,
    tags,
    macronutrientes: macros,
    cookingTimeMinutes: null,
    imageUrl: platePhoto,
    referenceImageUrl: null,
    appliedFilters: {
      mealType: mapMealTypeToFilter(params.mealType),
      cuisineStyle: "estandar",
      servings: 1,
      complexity: "facil"
    },
    mealTypeAdvisory: adviceText || null
  });

  if ("error" in saveResult) {
    return { error: saveResult.error };
  }

  const meal = await assignRecipeToPlan({
    userId: params.userId,
    diaSemana: params.dayLabel,
    tipoComida: params.mealType,
    recipeId: saveResult.recipeId,
    semanaInicioISO: params.weekStartISO
  });

  if (!meal) {
    return { error: "Se guardó la comida pero no pudimos asignarla al plan." };
  }

  return {
    meal: {
      ...meal,
      imageUrl: platePhoto,
      externalBadge: params.estimate.badge,
      kcal: params.estimate.calorias_est,
      proteinGrams: params.estimate.proteinas_est_g,
      hasVegetables: params.estimate.tiene_vegetales,
      hasProtein: params.estimate.proteinas_est_g >= 12
    }
  };
}
