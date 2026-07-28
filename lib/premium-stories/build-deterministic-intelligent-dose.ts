import {
  LOW_CALORIE_DAY_THRESHOLD,
  type IntelligentDoseReport,
  type IntelligentDoseUserContext
} from "@/lib/premium-stories/intelligent-dose-context";
import {
  buildDoseSuggestedRecipe,
  computeDayBalanceLevel
} from "@/lib/premium-stories/dose-suggested-recipe";
import { remainingCaloriesToTarget } from "@/lib/nutrition/tdee";
import type { MealType } from "@/lib/plan/constants";

function mealSlotPhrase(mealType: MealType): string {
  if (mealType === "Cena") return "en la cena";
  if (mealType === "Desayuno") return "en el desayuno";
  return "en el almuerzo";
}

function missingMealsLabel(filled: string[]): string {
  const all = ["Desayuno", "Almuerzo", "Cena"];
  const missing = all.filter((meal) => !filled.includes(meal));
  if (missing.length === 0) return "ninguna";
  if (missing.length === 1) return missing[0].toLowerCase();
  return `${missing.slice(0, -1).join(", ").toLowerCase()} y ${missing[missing.length - 1].toLowerCase()}`;
}

function dishTitlesLabel(titles: string[]): string {
  if (titles.length === 0) return "sin platos";
  if (titles.length === 1) return `"${titles[0]}"`;
  if (titles.length === 2) return `"${titles[0]}" y "${titles[1]}"`;
  return `"${titles[0]}", "${titles[1]}" y más`;
}

/**
 * Fallback determinista basado en macros/platos reales del plan
 * y en la meta calórica personalizada del usuario.
 */
export function buildDeterministicIntelligentDose(
  context: IntelligentDoseUserContext
): IntelligentDoseReport {
  const today = context.mealsPlannedToday;
  const yesterday = context.mealsPlannedYesterday;
  const week = context.weeklyStats;
  const suggestedRecipe = buildDoseSuggestedRecipe(today);
  const balance = computeDayBalanceLevel(today, {
    calorieTarget: context.nutritionGoals?.calorieTarget
  });
  const targetKcal = balance.calorieTarget;
  const proteinTarget = context.nutritionGoals?.proteinTarget ?? 90;
  const kcalGap = remainingCaloriesToTarget(today.totalCalories, targetKcal);
  const pct = Math.round(balance.calorieRatio * 100);

  if (today.mealCount === 0 && yesterday.mealCount === 0 && week.totalMealsPlanned === 0) {
    return {
      hasPlanData: false,
      previewHeadline:
        "¡Vamos a por un día increíble! Planifica tu menú para un análisis completo ✨",
      highlight:
        "Aún no hay historial de menú. El primer paso es registrar tus comidas de hoy.",
      improve:
        "Sin comidas planificadas no puedo darte un análisis real de macronutrientes ni de equilibrio del día.",
      action:
        "Añade desayuno, almuerzo y cena al Plan y vuelve para tu informe personalizado.",
      suggestedRecipe: null
    };
  }

  if (today.isIncompleteMenu || today.isLowCalorieDay || today.isLikelyLiquidOnly) {
    const liquidNote = today.isLikelyLiquidOnly
      ? " con infusiones/bebidas"
      : today.dishes.some((d) => d.isLikelyLiquidOnly)
        ? " (incluye bebidas/infusiones)"
        : "";
    const titles = dishTitlesLabel(today.mealTitles);

    return {
      hasPlanData: today.mealCount > 0 || yesterday.mealCount > 0 || week.totalMealsPlanned > 0,
      previewHeadline:
        today.mealCount === 0
          ? "Completa tu menú de hoy para un análisis más preciso ✨"
          : `Hoy ~${today.totalCalories} kcal: aún lejos de tu meta (~${targetKcal}) ✨`,
      highlight:
        today.mealCount === 0
          ? "Registraste tu intención de planificar: ¡buen paso de organización!"
          : "Registraste tu plan de hoy: ¡buen paso de organización!",
      improve:
        today.mealCount === 0
          ? "Aún no hay comidas sólidas registradas hoy. Sin eso no hay análisis real de energía ni proteína."
          : `Tu menú actual solo suma ~${today.totalCalories} kcal${liquidNote} (${titles}). Te faltan ~${kcalGap} kcal para acercarte a tu meta de ~${targetKcal} kcal.`,
      action: `Mañana integra ${suggestedRecipe.idea.toLowerCase()} ${mealSlotPhrase(suggestedRecipe.planMealType)}. ¡Tú puedes!`,
      suggestedRecipe
    };
  }

  // --- Día “completo” pero evaluado contra la meta personalizada ---
  let highlight: string;
  let improve: string;
  let previewHeadline: string;
  let action: string;

  if (balance.calorieWarning === "low" || balance.calorieWarning === "below") {
    const qualityBits: string[] = [];
    if (today.hasProtein) qualityBits.push(`proteína (~${today.totalProtein} g)`);
    if (today.hasVegetables) qualityBits.push("vegetales");
    const qualityNote =
      qualityBits.length > 0
        ? ` Buen aporte de ${qualityBits.join(" y ")}.`
        : "";

    highlight = `Registraste ${today.mealCount} comidas (~${today.totalCalories} kcal).${qualityNote} Aún estás al ~${pct}% de tu meta (~${targetKcal} kcal).`;
    improve = `Te faltan ~${kcalGap} kcal para entrar en el rango de tu objetivo energético (~${targetKcal} kcal). Prioriza un plato más contundente con proteína y verdura.`;
    previewHeadline = `Te faltan ~${kcalGap} kcal para tu meta ⚡`;
    action = `Mañana suma ${suggestedRecipe.idea.toLowerCase()} ${mealSlotPhrase(suggestedRecipe.planMealType)} para cerrar el hueco energético. ¡Tú puedes!`;
  } else if (balance.calorieWarning === "high" || balance.calorieWarning === "above") {
    highlight = `Hoy sumas ~${today.totalCalories} kcal frente a tu meta de ~${targetKcal} kcal (${pct}%).${
      today.hasProtein ? ` La proteína (~${today.totalProtein} g) está bien cubierta.` : ""
    }`;
    improve = `Estás por encima de tu meta energética (~${today.totalCalories} vs ~${targetKcal} kcal). Ajusta porciones o elige un cierre más ligero en vegetales.`;
    previewHeadline = `Por encima de tu meta (~${targetKcal} kcal) ⚖️`;
    action = `Mañana opta por ${suggestedRecipe.idea.toLowerCase()} ${mealSlotPhrase(suggestedRecipe.planMealType)} para reequilibrar. ¡Tú puedes!`;
  } else {
    // Dentro del ±15% de la meta.
    if (today.hasProtein && today.hasVegetables) {
      highlight = `Excelente balance hoy: proteína (~${today.totalProtein} g) y vegetales, cerca de tu meta (~${today.totalCalories} / ${targetKcal} kcal). ¡A por todas!`;
    } else if (today.hasProtein) {
      highlight = `Cumpliste un buen aporte de proteína hoy (~${today.totalProtein} g) y estás cerca de tu meta (~${today.totalCalories} / ${targetKcal} kcal).`;
    } else if (today.hasVegetables) {
      highlight = `Buen aporte de vegetales y energía cercana a tu meta (~${today.totalCalories} / ${targetKcal} kcal).`;
    } else {
      highlight = `Registraste un día completo cerca de tu meta (~${today.totalCalories} / ${targetKcal} kcal; P ${today.totalProtein}g / C ${today.totalCarbs}g / G ${today.totalFat}g).`;
    }

    if (week.weekendDinnersWithoutProtein > 0 && !today.hasProtein) {
      improve =
        "Notamos que las cenas del fin de semana suelen ir más ligeras de proteína. ¿Qué tal equilibrar la de mañana con proteína magra?";
    } else if (!today.hasVegetables && !yesterday.hasVegetables) {
      improve =
        "Tu nivel de vegetales/fibra viene bajito esta semana: suma una ración de verdura en la próxima comida.";
    } else if (!today.hasVegetables) {
      improve = "Hoy el aporte de vegetales quedó corto frente al resto del día.";
    } else if (!today.hasProtein) {
      improve = `Falta una fuente clara de proteína magra: hoy solo sumas ~${today.totalProtein} g (meta ~${proteinTarget} g).`;
    } else if (yesterday.mealCount > 0 && !yesterday.hasVegetables) {
      improve = "Ayer la fibra se quedó corta; mantén el hábito verde también mañana.";
    } else if (week.planCompletionPercent < 50) {
      improve = `Esta semana planificaste ${week.daysWithAnyMeal} de ${week.daysTracked} días. Apuntemos a más constancia con un pequeño paso adicional.`;
    } else {
      improve = "Varía colores y cocciones mañana para que el menú no se sienta repetido.";
    }

    previewHeadline = today.hasProtein
      ? `Cerca de tu meta · proteína (~${today.totalProtein} g) 🥩`
      : today.hasVegetables
        ? `Cerca de tu meta · buen aporte de vegetales 🥦`
        : `Cerca de tu meta: ~${today.totalCalories} / ${targetKcal} kcal ✨`;
    action = `Mañana cierra el día con ${suggestedRecipe.idea.toLowerCase()} para mantener el equilibrio. ¡Tú puedes!`;
  }

  const missingHint =
    today.mealTypesFilled.length < 3
      ? ` Te falta ${missingMealsLabel(today.mealTypesFilled)}.`
      : "";

  return {
    hasPlanData: true,
    previewHeadline,
    highlight: highlight + missingHint,
    improve,
    action,
    suggestedRecipe
  };
}
