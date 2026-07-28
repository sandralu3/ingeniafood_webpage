import { APP_ROUTES } from "@/lib/navigation/app-routes";
import type {
  PremiumStoriesNutritionContext,
  PremiumStory
} from "@/lib/premium-stories/types";

/** Insights de respaldo si la IA falla o la despensa está vacía. */
export function buildFallbackPremiumStories(
  nutrition: PremiumStoriesNutritionContext,
  ingredientNames: string[]
): PremiumStory[] {
  const pantryLine =
    ingredientNames.length > 0
      ? ingredientNames.slice(0, 6).join(", ")
      : "tu despensa (añade ingredientes para personalizar)";

  const hasMenu = nutrition.plannedMealCount > 0;

  return [
    {
      id: "analysis",
      kind: "analysis",
      ringLabel: "Análisis",
      title: "Análisis del Día",
      badge: "Balance",
      body: hasMenu
        ? `Llevas ${nutrition.plannedMealCount} comida${nutrition.plannedMealCount === 1 ? "" : "s"} planificada${nutrition.plannedMealCount === 1 ? "" : "s"} (~${nutrition.totalKcal} kcal). ${
            nutrition.hasVegetables ? "Hay vegetales en el menú. " : "Suma más vegetales si puedes. "
          }${nutrition.hasProtein ? "La proteína está presente." : "Revisa incluir una fuente de proteína."}`
        : "Aún no tienes menú para hoy. Planifica desayuno, almuerzo y cena: así podré analizar tu balance y darte recomendaciones personalizadas.",
      ctaLabel: hasMenu ? "Ver mi menú" : "Planificar mi día",
      ctaHref: hasMenu ? APP_ROUTES.hoy : APP_ROUTES.plan
    },
    {
      id: "sandra_tip",
      kind: "sandra_tip",
      ringLabel: "Tip",
      title: "Tip de Sandra",
      badge: "Premium",
      body: hasMenu
        ? "Prioriza platos con color (verdura) y una proteína magra. Si cocinas con lo que ya tienes en casa, reduces compras impulsivas y mantienes el ritmo saludable."
        : "Empieza por armar el menú del día con lo que tienes en despensa. Con tu plan listo, los tips y el análisis se vuelven mucho más útiles y concretos.",
      ctaLabel: null,
      ctaHref: null
    },
    {
      id: "viral_dish",
      kind: "viral_dish",
      ringLabel: "Trend",
      title: "Plato Trend",
      badge: "Trend",
      body: hasMenu
        ? `Idea express con ${pantryLine}: saltea o asa lo que tengas, añade hierbas/especias y sirve con un toque ácido (limón o vinagre). Ajusta a 1 ración y anótalo en tu plan.`
        : `Mientras planificas el día, prueba esta idea con ${pantryLine}: un plato sencillo que puedes sumar ya a tu menú de hoy.`,
      ctaLabel: "Añadir a mi menú",
      ctaHref: APP_ROUTES.plan
    }
  ];
}
