import {
  getRecipeMealTypeLabel,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";

/** Ingredientes típicamente “pesados” (heurística UI para tip de desayuno con varias opciones). */
const HEAVY_PANTRY_PATTERNS = [
  /\bpollo\b/i,
  /\bchicken\b/i,
  /\bcarne\b/i,
  /\bbeef\b/i,
  /\bternera\b/i,
  /\bcerdo\b/i,
  /\bpork\b/i,
  /\bcordero\b/i,
  /\bpavo\b/i,
  /\bturkey\b/i,
  /\bpicada\b/i,
  /\bminced\b/i,
  /\barroz\b/i,
  /\brice\b/i,
  /\bpasta\b/i,
  /\bespagueti\b/i,
  /\bspaghetti\b/i,
  /\bmacarron/i,
  /\blenteja/i,
  /\bgarbanzo/i,
  /\bquinoa\b/i,
  /\bcusc[uú]s\b/i
];

export function hasHeavyPantryIngredients(ingredientNames: string[]): boolean {
  return ingredientNames.some((name) =>
    HEAVY_PANTRY_PATTERNS.some((pattern) => pattern.test(name.trim()))
  );
}

/**
 * Tip de UI: Desayuno + varios ingredientes + al menos uno “pesado”.
 * Con un solo ingrediente no tiene sentido sugerir omitirlo.
 */
export function shouldShowBreakfastPantryTip(ingredientNames: string[]): boolean {
  const cleaned = ingredientNames.map((n) => n.trim()).filter(Boolean);
  return cleaned.length >= 2 && hasHeavyPantryIngredients(cleaned);
}

/**
 * Prioridades: 1) usar lo que el usuario tiene, 2) adaptar al momento del día, 3) omitir solo con alternativas.
 */
export function buildMealTypeCompatibilityPromptClause(mealType: RecipeMealType): string {
  const label = getRecipeMealTypeLabel(mealType);

  const breakfastAdaptation =
    mealType === "desayuno"
      ? (
          "REGLA 2 — ADAPTACIÓN CULINARIA AL DESAYUNO (fit / salado permitido): " +
          "Cualquier ingrediente (pollo, carne, atún, vegetales, granos, arroz, etc.) SE PUEDE adaptar a un Desayuno. " +
          "NO asumas que el desayuno debe ser solo huevo, dulce o harina: existen desayunos salados y altos en proteína. " +
          "Ejemplos con Pollo: omelette proteico relleno de pollo; tostada de pechuga desmechada con especias; " +
          "sándwich/wrap de pollo mañanero; bowl proteico. " +
          "Si el usuario solo tiene pollo (u otro único ingrediente), GENERA un desayuno salado/proteico CON ese ingrediente. "
        )
      : (
          `REGLA 2 — ADAPTACIÓN AL MOMENTO (${label}): adapta creativamente los ingredientes del usuario a un plato realista de ${label}. `
        );

  return (
    "LÓGICA DE PRIORIDADES (OBLIGATORIA, en este orden):\n" +
    "REGLA 1 — USAR LO QUE EL USUARIO TIENE (PRIORIDAD ABSOLUTA): " +
    "Si el usuario tiene ingredientes activos en su despensa, la receta DEBE incluir AL MENOS UNO de sus ingredientes principales. " +
    "NUNCA generes una receta donde el usuario no tenga casi nada de lo listado (\"YA TIENES\" ≈ 0) si envió ingredientes activos, " +
    "salvo imposibilidad técnica extrema. NO inventes un plato solo con huevos/lácteos/pan si el usuario no los seleccionó y SÍ tiene, por ejemplo, pollo. " +
    "Los complementos de despensa básica (sal, aceite, especias, pan o huevo solo como apoyo) pueden añadirse, pero el protagonista debe ser de la lista del usuario.\n" +
    breakfastAdaptation +
    "\nREGLA 3 — CUÁNDO SÍ SE PUEDE RESERVAR/OMITIR UN INGREDIENTE: " +
    "ÚNICAMENTE si el usuario ingresó MÚLTIPLES opciones (ej. Huevos + Pollo + Avena) y eliges las más adecuadas al momento del día. " +
    "Si el ingrediente es EL ÚNICO o de los POCOS disponibles, ES OBLIGATORIO USARLO en la receta. " +
    "Nunca digas que el pollo \"no es habitual de desayuno\" para rechazarlo: adáptalo.\n" +
    "REGLA 4 — NOTA DE OMISIÓN: solo genera ingredientes_omitidos_nota cuando REALMENTE omitas algún ingrediente seleccionado " +
    "Y al mismo tiempo uses otros ingredientes seleccionados del usuario en la receta. " +
    "Si usas el único ingrediente disponible, ingredientes_omitidos_nota debe ser \"\". " +
    "También puedes usar advertencia_ingredientes para complementos de despensa no escaneados.\n" +
    `El tipo de plato pedido es "${label}": genera un plato apetecible de ese momento del día SIN abandonar la despensa del usuario. ` +
    'Responde con {"error":"tipo_plato_incompatible","mensaje":"..."} SOLO en casos extremos en los que sea imposible adaptar nada de lo enviado a ' +
    `${label}.`
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
        "DESPENSA AMPLIADA PARA DESAYUNO: condimentos básicos y, solo como apoyo, pan, huevo, leche, especias o hierbas " +
        "si ayudan a montar el desayuno. El ingrediente principal DEBE seguir siendo el del usuario (ej. pollo). " +
        "No sustituyas el protagonista por huevos inventados."
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
