import {
  getRecipeMealTypeLabel,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";

/**
 * Instrucciones para que la IA decida creativamente qué plato encaja con cada ingrediente.
 * No usamos listas rígidas en código: cualquier alimento puede tener recetas para distintos momentos del día.
 */
export function buildMealTypeCompatibilityPromptClause(mealType: RecipeMealType): string {
  const label = getRecipeMealTypeLabel(mealType);

  return (
    `CREATIVIDAD POR TIPO DE PLATO (prioridad alta): el usuario pidió "${label}". ` +
    "Tu trabajo es encontrar la MEJOR receta posible de ese tipo con los ingredientes detectados o seleccionados, por muy neutros que sean. " +
    "Ejemplos válidos: arroz → arroz con leche (Postre); plátano → crepe o bowl (Desayuno); huevos → tortilla (Almuerzo/Cena); avena → porridge (Desayuno). " +
    "Puedes añadir ingredientes básicos de despensa imprescindibles para ese tipo de plato (leche, azúcar, canela, miel, vainilla, huevos, etc.) aunque no aparezcan en la foto. " +
    "Incluye el campo opcional advertencia_ingredientes (string, 1-2 frases en el mismo idioma de salida de la receta) cuando la receta necesite complementos que el usuario no escaneó; si no aplica, omítelo o déjalo vacío. " +
    'Responde con {"error":"tipo_plato_incompatible","mensaje":"..."} SOLO si no existe ninguna receta razonable de ' +
    `${label} con esos ingredientes (casos extremos). En ese mensaje explica por qué y sugiere otro tipo de plato. ` +
    `Si SÍ existe opción (aunque requiera despensa básica), GENERA la receta como ${label} y no cambies el momento del día.`
  );
}

export function buildMealTypePantryExpansionClause(mealType: RecipeMealType): string {
  const label = getRecipeMealTypeLabel(mealType);

  switch (mealType) {
    case "postre":
      return (
        "DESPENSA AMPLIADA PARA POSTRE: además de sal, pimienta, aceite y agua, puedes usar leche, azúcar, miel, canela, vainilla, " +
        "cacao, yogur o fruta seca si hacen falta para un postre real con el ingrediente principal del usuario."
      );
    case "desayuno":
      return (
        "DESPENSA AMPLIADA PARA DESAYUNO: además de condimentos básicos, puedes usar leche, huevos, mantequilla, miel, canela o pan " +
        "si son necesarios para un desayuno coherente con lo escaneado."
      );
    case "cena":
    case "almuerzo":
    default:
      return (
        `DESPENSA PARA ${label.toUpperCase()}: condimentos básicos (sal, pimienta, aceite, agua, ajo) y complementos lógicos ` +
        "(verduras de acompañamiento, hierbas, limón) si encajan con un plato principal saludable."
      );
  }
}
