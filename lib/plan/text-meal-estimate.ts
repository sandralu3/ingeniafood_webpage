import {
  EXTERNAL_MEAL_BADGE,
  createExternalMealFoodItem,
  evaluateExternalMealBalance,
  sumExternalMealFoodMacros,
  type ExternalMealEstimate,
  type ExternalMealFoodItem
} from "@/lib/plan/external-meal";
import {
  findFoodDensity,
  macrosFromDensity,
  normalizeFoodUnit,
  portionToGrams,
  type FoodDensity
} from "@/lib/plan/food-density";

/** Quita tildes para que "café" / "cafe" matcheen igual. */
function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const SKIP_TOKEN_RE =
  /^(saltead[oa]s?|frit[oa]s?|asada?s?|cocid[oa]s?|plancha|horno|vapor|grande|pequen[oa]|mediano|casero|casera|con|de|del|la|el|los|las|y|e|un|una|unos|unas)$/i;

type ParsedSegment = {
  raw: string;
  amount: number | null;
  unit: string | null;
  foodText: string;
};

function parseLeadingAmount(raw: string): { amount: number; rest: string } | null {
  const fraction = raw.match(/^(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (fraction) {
    const num = Number(fraction[1]);
    const den = Number(fraction[2]);
    if (den > 0 && Number.isFinite(num)) {
      return { amount: num / den, rest: fraction[3].trim() };
    }
  }
  const decimal = raw.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (decimal) {
    return { amount: Number(decimal[1].replace(",", ".")), rest: decimal[2].trim() };
  }
  return null;
}

const UNIT_TOKEN =
  "g|gr|grs|gramos?|kg|ml|uds?|u|unidades?|rebanadas?|cucharadas?|cdas?|cditas?|cdta|cucharaditas?|tazas?|tz|porciones?";

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
 * Soporta fracciones (1/2), tz, cdita y "4cdas" pegado.
 */
export function splitFoodDescriptionSegments(description: string): ParsedSegment[] {
  const text = description.trim().replace(/\s+/g, " ");
  if (!text) return [];

  const parts = text
    .split(/\s*,\s*|\s+\+\s*|\s+\/\s*|(?:\s+y\s+)(?![a-záéíóúñ]{1,3}\b)/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const segments: ParsedSegment[] = [];

  for (const part of parts) {
    const chunks =
      parts.length === 1
        ? part.split(/\s+con\s+/i).map((p) => p.trim()).filter(Boolean)
        : [part];

    for (const chunk of chunks) {
      const leadingQty = chunk.match(
        new RegExp(
          `^(\\d+(?:[.,]\\d+)?|\\d+\\s*/\\s*\\d+)\\s*(${UNIT_TOKEN})(?:\\s+de)?\\s+(.+)$`,
          "i"
        )
      );
      if (leadingQty) {
        const amountParsed = parseLeadingAmount(leadingQty[1]);
        segments.push({
          raw: chunk,
          amount: amountParsed?.amount ?? Number(leadingQty[1].replace(",", ".")),
          unit: normalizeFoodUnit(leadingQty[2]),
          foodText: leadingQty[3].trim()
        });
        continue;
      }

      // "1/2 taza de avena" / "1/2 de leche" / "1/2 guineo"
      const fractionFood = chunk.match(
        new RegExp(
          `^(\\d+\\s*/\\s*\\d+)\\s*(?:(${UNIT_TOKEN})\\s+)?(?:de\\s+)?(.+)$`,
          "i"
        )
      );
      if (fractionFood) {
        const amountParsed = parseLeadingAmount(fractionFood[1]);
        const unit = fractionFood[2] ? normalizeFoodUnit(fractionFood[2]) : null;
        const foodText = fractionFood[3].trim();
        const density = findFoodDensity(foodText);
        segments.push({
          raw: chunk,
          amount: amountParsed?.amount ?? 0.5,
          unit: unit ?? density?.defaultUnit ?? (density ? "unidad" : null),
          foodText
        });
        continue;
      }

      const trailingQty = chunk.match(
        new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_TOKEN})\\s*$`, "i")
      );
      if (trailingQty) {
        segments.push({
          raw: chunk,
          amount: Number(trailingQty[2].replace(",", ".")),
          unit: normalizeFoodUnit(trailingQty[3]),
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
  const density = findFoodDensity(segment.foodText);
  if (!density) {
    if (segment.amount != null && (segment.unit === "g" || segment.unit === "ml" || segment.unit === "kg")) {
      const grams = segment.unit === "kg" ? segment.amount * 1000 : segment.amount;
      const kcal = Math.round((grams / 100) * 80);
      const protein = Math.round((grams / 100) * 3);
      return createExternalMealFoodItem({
        nombre: cleanFoodLabel(segment.foodText, "Alimento"),
        cantidad: Math.round(grams * 10) / 10,
        unidad: segment.unit === "ml" ? "ml" : "g",
        calorias: Math.max(5, kcal),
        proteinas_g: Math.max(0, protein)
      });
    }

    return createExternalMealFoodItem({
      nombre: cleanFoodLabel(segment.foodText, "Alimento"),
      cantidad: segment.amount != null && segment.amount > 0 ? segment.amount : 1,
      unidad: segment.unit ?? "porción",
      calorias: 40,
      proteinas_g: 1
    });
  }

  const unit = segment.unit ?? density.defaultUnit ?? "g";
  const amount =
    segment.amount ??
    (unit === "unidad" || unit === "rebanada" ? 1 : density.defaultGrams);
  const macros = macrosFromDensity(density, amount, unit);
  const displayUnit = segment.unit ?? density.defaultUnit ?? "g";
  const displayAmount =
    segment.amount != null
      ? segment.unit === "kg"
        ? Math.round(segment.amount * 1000)
        : Math.round(segment.amount * 10) / 10
      : displayUnit === "g" || displayUnit === "ml"
        ? Math.round(macros.grams)
        : Math.round(amount * 10) / 10;

  return createExternalMealFoodItem({
    nombre: cleanFoodLabel(segment.foodText, density.name),
    cantidad: Math.max(0.1, displayAmount),
    unidad: displayUnit === "kg" ? "g" : displayUnit,
    calorias: Math.max(1, macros.calorias),
    proteinas_g: Math.max(0, macros.proteinas_g)
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

export function descriptionHasExplicitQuantities(description: string): boolean {
  return new RegExp(
    `\\d+(?:[.,]\\d+)?\\s*(?:${UNIT_TOKEN})\\b|\\d+\\s*/\\s*\\d+`,
    "i"
  ).test(description);
}

export function countCommaSeparatedFoods(description: string): number {
  return description
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2).length;
}

/** @deprecated Prefer findFoodDensity from food-density. */
export function findDensityForTests(foodText: string): FoodDensity | null {
  return findFoodDensity(foodText);
}

/** @deprecated Prefer portionToGrams from food-density. */
export function gramsForTests(amount: number, unit: string, density: FoodDensity): number {
  return portionToGrams(amount, unit, density);
}
