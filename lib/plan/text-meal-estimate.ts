import {
  EXTERNAL_MEAL_BADGE,
  createExternalMealFoodItem,
  evaluateExternalMealBalance,
  sumExternalMealFoodMacros,
  type ExternalMealEstimate,
  type ExternalMealFoodItem
} from "@/lib/plan/external-meal";

type FoodDensity = {
  /** Nombre limpio para mostrar. */
  name: string;
  /** kcal por 100 g (o por 100 ml). */
  kcalPer100: number;
  /** Proteína g por 100 g (o por 100 ml). */
  proteinPer100: number;
  /** Porción por defecto si el usuario no indica cantidad. */
  defaultGrams: number;
  /** Unidad por defecto. */
  defaultUnit?: string;
};

/** Quita tildes para que "café" / "cafe" matcheen igual (\b de JS falla con acentos). */
function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Densidades aproximadas (cocinado / listo para comer cuando aplica).
 * Los `match` se evalúan sobre texto sin tildes.
 */
const FOOD_DENSITIES: Array<{ match: RegExp; density: FoodDensity }> = [
  {
    match: /\bpechuga(s)?(\s+de\s+pollo)?\b|\bpollo\s+a\s+la\s+plancha\b|\bchicken\s+breast\b/,
    density: { name: "Pechuga de pollo", kcalPer100: 110, proteinPer100: 23, defaultGrams: 150 }
  },
  {
    match: /\bmuslo(s)?(\s+de\s+pollo)?\b|\bcontramuslo/,
    density: { name: "Muslo de pollo", kcalPer100: 150, proteinPer100: 18, defaultGrams: 150 }
  },
  {
    match: /\bpollo\b(?!\s+de\s+campo)/,
    density: { name: "Pollo", kcalPer100: 140, proteinPer100: 20, defaultGrams: 150 }
  },
  {
    match: /\bpavo\b|\bpechuga\s+de\s+pavo\b/,
    density: { name: "Pavo", kcalPer100: 105, proteinPer100: 22, defaultGrams: 120 }
  },
  {
    match: /\bternera\b|\bres\b|\bcarne\s+de\s+res\b|\bfilete\b/,
    density: { name: "Ternera", kcalPer100: 180, proteinPer100: 26, defaultGrams: 150 }
  },
  {
    match: /\bcerdo\b|\blomo\s+de\s+cerdo\b/,
    density: { name: "Cerdo", kcalPer100: 170, proteinPer100: 22, defaultGrams: 140 }
  },
  {
    match: /\bhamburguesa\b|\bburger\b/,
    density: { name: "Hamburguesa", kcalPer100: 250, proteinPer100: 15, defaultGrams: 180 }
  },
  {
    match: /\bsalmon\b/,
    density: { name: "Salmón", kcalPer100: 180, proteinPer100: 22, defaultGrams: 150 }
  },
  {
    match: /\batun\b/,
    density: { name: "Atún", kcalPer100: 130, proteinPer100: 26, defaultGrams: 100 }
  },
  {
    match: /\bmerluza\b|\bbacalao\b|\bpescado\b|\btilapia\b/,
    density: { name: "Pescado", kcalPer100: 100, proteinPer100: 20, defaultGrams: 150 }
  },
  {
    match: /\bhuevos?\b|\begg\b/,
    density: {
      name: "Huevo",
      kcalPer100: 140,
      proteinPer100: 12,
      defaultGrams: 60,
      defaultUnit: "unidad"
    }
  },
  {
    match: /\byogur(t)?(\s+griego)?\b|\byogurt\b/,
    density: { name: "Yogur", kcalPer100: 70, proteinPer100: 6, defaultGrams: 125 }
  },
  {
    match: /\bqueso\s+fresco\b|\bcottage\b/,
    density: { name: "Queso fresco", kcalPer100: 100, proteinPer100: 12, defaultGrams: 100 }
  },
  {
    match: /\bqueso\b/,
    density: { name: "Queso", kcalPer100: 350, proteinPer100: 22, defaultGrams: 40 }
  },
  {
    match: /\btofu\b/,
    density: { name: "Tofu", kcalPer100: 80, proteinPer100: 8, defaultGrams: 120 }
  },
  {
    match: /\blentejas?\b|\bgarbanzos?\b|\bfrijoles?\b|\balubias?\b|\blegumbres?\b/,
    density: { name: "Legumbres", kcalPer100: 120, proteinPer100: 8, defaultGrams: 150 }
  },
  {
    match: /\barroz\b/,
    density: { name: "Arroz", kcalPer100: 130, proteinPer100: 2.5, defaultGrams: 150 }
  },
  {
    match: /\bpasta\b|\bespagueti|\bmacarrones?\b|\btallarines?\b/,
    density: { name: "Pasta", kcalPer100: 140, proteinPer100: 5, defaultGrams: 180 }
  },
  {
    match: /\bpatatas?\b|\bpapas?\b|\bpure\b/,
    density: { name: "Patata", kcalPer100: 85, proteinPer100: 2, defaultGrams: 200 }
  },
  {
    match: /\bquinoa\b/,
    density: { name: "Quinoa", kcalPer100: 120, proteinPer100: 4, defaultGrams: 150 }
  },
  {
    match: /\bpan\b|\btostadas?\b/,
    density: {
      name: "Pan",
      kcalPer100: 260,
      proteinPer100: 9,
      defaultGrams: 40,
      defaultUnit: "rebanada"
    }
  },
  {
    match: /\bavena\b/,
    density: { name: "Avena", kcalPer100: 370, proteinPer100: 13, defaultGrams: 40 }
  },
  {
    match: /\bensalada\b|\blechuga\b|\bverduras?\b|\bvegetales?\b|\bbrocoli\b|\bespinaca/,
    density: { name: "Verduras", kcalPer100: 25, proteinPer100: 1.5, defaultGrams: 150 }
  },
  {
    match: /\btomate\b|\bpepino\b|\bcebolla\b|\bzucchini\b|\bcalabacin\b/,
    density: { name: "Verdura", kcalPer100: 20, proteinPer100: 1, defaultGrams: 100 }
  },
  {
    match: /\bajo\b/,
    density: { name: "Ajo", kcalPer100: 140, proteinPer100: 6, defaultGrams: 5 }
  },
  {
    match: /\baceite(\s+de\s+oliva)?\b/,
    density: {
      name: "Aceite",
      kcalPer100: 884,
      proteinPer100: 0,
      defaultGrams: 10,
      defaultUnit: "cda"
    }
  },
  {
    match: /\baguacate\b|\bavocado\b/,
    density: { name: "Aguacate", kcalPer100: 160, proteinPer100: 2, defaultGrams: 80 }
  },
  {
    match: /\bplatano\b|\bbanana\b|\bmanzana\b|\bfresas?\b|\bfrutas?\b/,
    density: { name: "Fruta", kcalPer100: 60, proteinPer100: 0.5, defaultGrams: 120 }
  },
  {
    match: /\bgalletas?\b|\bcookies?\b/,
    density: {
      name: "Galletas",
      kcalPer100: 480,
      proteinPer100: 6,
      defaultGrams: 30,
      defaultUnit: "unidad"
    }
  },
  {
    match: /\bpizza\b/,
    density: { name: "Pizza", kcalPer100: 270, proteinPer100: 11, defaultGrams: 250 }
  },
  // Bebidas: matcha antes que "te" genérico; café sin depender de tilde
  {
    match: /\bmatcha\b|\bte\s+matcha\b|\btea\s+matcha\b/,
    density: {
      name: "Té matcha",
      kcalPer100: 5,
      proteinPer100: 0,
      defaultGrams: 200,
      defaultUnit: "ml"
    }
  },
  {
    match: /\bcafe\b|\blatte\b/,
    density: {
      name: "Café",
      kcalPer100: 5,
      proteinPer100: 0,
      defaultGrams: 200,
      defaultUnit: "ml"
    }
  },
  {
    match: /\bte\b|\binfusion\b/,
    density: {
      name: "Té",
      kcalPer100: 2,
      proteinPer100: 0,
      defaultGrams: 200,
      defaultUnit: "ml"
    }
  },
  {
    match: /\bleche\b/,
    density: { name: "Leche", kcalPer100: 45, proteinPer100: 3.3, defaultGrams: 200, defaultUnit: "ml" }
  }
];

const SKIP_TOKEN_RE =
  /^(saltead[oa]s?|frit[oa]s?|asada?s?|cocid[oa]s?|plancha|horno|vapor|grande|pequen[oa]|mediano|casero|casera|con|de|del|la|el|los|las|y|e|un|una|unos|unas)$/i;

type ParsedSegment = {
  raw: string;
  amount: number | null;
  unit: string | null;
  foodText: string;
};

function normalizeUnit(raw: string | null): string {
  if (!raw) return "g";
  const u = normalizeForMatch(raw).replace(/\./g, "");
  if (/^(g|gr|grs|gramo|gramos)$/.test(u)) return "g";
  if (/^(kg|kilo|kilos)$/.test(u)) return "kg";
  if (/^(ml|mililitro|mililitros)$/.test(u)) return "ml";
  if (/^(ud|uds|u|unidad|unidades)$/.test(u)) return "unidad";
  if (/^(rebanada|rebanadas)$/.test(u)) return "rebanada";
  if (/^(cda|cdas|cucharada|cucharadas)$/.test(u)) return "cda";
  if (/^(cdta|cucharadita|cucharaditas)$/.test(u)) return "cdta";
  if (/^(taza|tazas)$/.test(u)) return "taza";
  if (/^(porcion|porciones)$/.test(u)) return "porción";
  return u.slice(0, 12);
}

function unitToGrams(amount: number, unit: string, density: FoodDensity): number {
  switch (unit) {
    case "kg":
      return amount * 1000;
    case "g":
    case "ml":
      return amount;
    case "unidad":
      return amount * density.defaultGrams;
    case "rebanada":
      return amount * (density.defaultUnit === "rebanada" ? density.defaultGrams : 35);
    case "cda":
      return amount * (density.defaultUnit === "cda" ? density.defaultGrams : 10);
    case "cdta":
      return amount * 5;
    case "taza":
      return amount * 150;
    case "porción":
      return amount * density.defaultGrams;
    default:
      return amount;
  }
}

function findDensity(foodText: string): FoodDensity | null {
  const normalized = normalizeForMatch(foodText);
  if (!normalized) return null;
  for (const entry of FOOD_DENSITIES) {
    if (entry.match.test(normalized)) return entry.density;
  }
  return null;
}

function cleanFoodLabel(text: string, fallbackName: string): string {
  const cleaned = text
    .replace(/\b(saltead[oa]s?|frit[oa]s?|asada?s?|cocid[oa]s?|a\s+la\s+plancha|al\s+horno)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 2) return fallbackName;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Parte el texto en segmentos de alimento respetando cantidades.
 * Ej: "200 gr de Pechuga salteada con ajo, arroz y verduras"
 */
export function splitFoodDescriptionSegments(description: string): ParsedSegment[] {
  const text = description.trim().replace(/\s+/g, " ");
  if (!text) return [];

  // Separadores de lista: coma, " y ", " + ", "/"
  const parts = text
    .split(/\s*,\s*|\s+\+\s*|\s+\/\s*|(?:\s+y\s+)(?![a-záéíóúñ]{1,3}\b)/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const segments: ParsedSegment[] = [];

  for (const part of parts) {
    // Con lista por comas, "con" es preparación ("café con leche"), no otro alimento.
    const chunks =
      parts.length === 1
        ? part.split(/\s+con\s+/i).map((p) => p.trim()).filter(Boolean)
        : [part];

    for (const chunk of chunks) {
      const leadingQty = chunk.match(
        /^(\d+(?:[.,]\d+)?)\s*(g|gr|grs|gramos?|kg|ml|uds?|u|unidades?|rebanadas?|cucharadas?|cdas?|cdta|cucharaditas?|tazas?|porciones?)(?:\s+de)?\s+(.+)$/i
      );
      if (leadingQty) {
        segments.push({
          raw: chunk,
          amount: Number(leadingQty[1].replace(",", ".")),
          unit: normalizeUnit(leadingQty[2]),
          foodText: leadingQty[3].trim()
        });
        continue;
      }

      const trailingQty = chunk.match(
        /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|gr|grs|gramos?|kg|ml|uds?|u|unidades?|rebanadas?|cucharadas?|cdas?|cdta|tazas?|porciones?)\s*$/i
      );
      if (trailingQty) {
        segments.push({
          raw: chunk,
          amount: Number(trailingQty[2].replace(",", ".")),
          unit: normalizeUnit(trailingQty[3]),
          foodText: trailingQty[1].trim()
        });
        continue;
      }

      if (SKIP_TOKEN_RE.test(normalizeForMatch(chunk)) || chunk.length < 2) continue;

      segments.push({
        raw: chunk,
        amount: null,
        unit: null,
        foodText: chunk
      });
    }
  }

  return segments;
}

function segmentToFoodItem(segment: ParsedSegment): ExternalMealFoodItem {
  const density = findDensity(segment.foodText);
  if (!density) {
    // Segmento tras coma u otro alimento no catalogado: no lo descartamos.
    if (segment.amount != null && (segment.unit === "g" || segment.unit === "ml" || segment.unit === "kg")) {
      const grams = segment.unit === "kg" ? segment.amount * 1000 : segment.amount;
      const kcal = Math.round((grams / 100) * 80);
      const protein = Math.round((grams / 100) * 3);
      return createExternalMealFoodItem({
        nombre: cleanFoodLabel(segment.foodText, "Alimento"),
        cantidad: Math.round(grams),
        unidad: segment.unit === "ml" ? "ml" : "g",
        calorias: Math.max(5, kcal),
        proteinas_g: Math.max(0, protein)
      });
    }

    return createExternalMealFoodItem({
      nombre: cleanFoodLabel(segment.foodText, "Alimento"),
      cantidad: 1,
      unidad: "porción",
      calorias: 40,
      proteinas_g: 1
    });
  }

  const unit = segment.unit ?? density.defaultUnit ?? "g";
  const amount = segment.amount ?? (unit === "unidad" || unit === "rebanada" ? 1 : density.defaultGrams);
  const grams = unitToGrams(amount, unit, density);
  const factor = grams / 100;
  const kcal = Math.round(density.kcalPer100 * factor);
  const protein = Math.round(density.proteinPer100 * factor);

  const displayUnit = segment.unit ?? density.defaultUnit ?? "g";
  const displayAmount =
    segment.amount != null
      ? segment.unit === "kg"
        ? Math.round(segment.amount * 1000)
        : Math.round(segment.amount)
      : displayUnit === "g" || displayUnit === "ml"
        ? Math.round(grams)
        : Math.round(amount);

  return createExternalMealFoodItem({
    nombre: cleanFoodLabel(segment.foodText, density.name),
    cantidad: Math.max(1, displayAmount),
    unidad: displayUnit === "kg" ? "g" : displayUnit,
    calorias: Math.max(5, kcal),
    proteinas_g: Math.max(0, protein)
  });
}

function buildDishTitle(description: string, foods: ExternalMealFoodItem[]): string {
  const trimmed = description.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 70) return trimmed;
  if (foods.length >= 2) {
    return `${foods[0].nombre} con ${foods[1].nombre}`;
  }
  if (foods.length === 1) return foods[0].nombre;
  return `${trimmed.slice(0, 67).trim()}…`;
}

/**
 * Estima un plato/snack a partir de texto abierto usando cantidades y densidades.
 * Devuelve null si no se reconoce ningún alimento útil.
 */
export function estimateMealFromOpenText(description: string): ExternalMealEstimate | null {
  const segments = splitFoodDescriptionSegments(description);
  if (segments.length === 0) return null;

  const alimentos = segments.map(segmentToFoodItem).slice(0, 10);

  if (alimentos.length === 0) return null;

  const totals = sumExternalMealFoodMacros(alimentos);
  const hasVeggies = alimentos.some((item) =>
    /verdura|ensalada|tomate|lechuga|brocoli|br[oó]coli|espinaca|pepino|calabac/i.test(item.nombre)
  );

  const base: ExternalMealEstimate = {
    nombre_plato: buildDishTitle(description, alimentos),
    calorias_est: Math.min(2500, Math.max(20, totals.calorias || 20)),
    proteinas_est_g: Math.min(200, Math.max(0, totals.proteinas_g)),
    tiene_vegetales: hasVeggies,
    badge: EXTERNAL_MEAL_BADGE.comida_fuera,
    alimentos,
    balance: "mejorable",
    recomendaciones: []
  };

  return {
    ...base,
    ...evaluateExternalMealBalance(base)
  };
}

/** True si el texto declara cantidades explícitas (g, ml, unidades…). */
export function descriptionHasExplicitQuantities(description: string): boolean {
  return /\d+(?:[.,]\d+)?\s*(g|gr|grs|gramos?|kg|ml|uds?|u|unidades?|rebanadas?|cucharadas?|cdas?|cdta|tazas?)\b/i.test(
    description
  );
}

/** Número de alimentos separados por coma en el texto. */
export function countCommaSeparatedFoods(description: string): number {
  return description
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2).length;
}
