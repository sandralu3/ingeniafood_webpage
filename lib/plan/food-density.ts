/**
 * Densidades nutricionales + conversión cantidad/unidad → macros.
 * Fuente de verdad para recalcular kcal cuando el usuario confirma o edita porciones.
 */

export type FoodDensity = {
  name: string;
  /** kcal por 100 g (o por 100 ml si es líquido). */
  kcalPer100: number;
  /** Proteína g por 100 g (o 100 ml). */
  proteinPer100: number;
  /** Porción por defecto si no hay cantidad. */
  defaultGrams: number;
  defaultUnit?: string;
  /** Gramos (o ml) por 1 taza cuando aplica (seco vs líquido). */
  gramsPerCup?: number;
  /** Gramos por cucharada. */
  gramsPerTbsp?: number;
  /** Gramos por cucharadita. */
  gramsPerTsp?: number;
  /** Gramos por unidad/pieza. */
  gramsPerUnit?: number;
  /** Gramos por rebanada. */
  gramsPerSlice?: number;
};

function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Orden: más específico primero.
 * Valores orientativos tipo USDA / etiquetas habituales.
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
    match: /\bternera\b|\bres\b|\bcarne\s+(molida|de\s+res)\b|\bfilete\b/,
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
      defaultUnit: "unidad",
      gramsPerUnit: 60
    }
  },
  {
    match: /\byogur(t)?(\s+griego)?\b|\byogurt(\s+griego)?\b/,
    density: {
      name: "Yogur griego",
      kcalPer100: 97,
      proteinPer100: 9,
      defaultGrams: 125,
      gramsPerTbsp: 15,
      gramsPerCup: 245
    }
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
    density: { name: "Arroz", kcalPer100: 130, proteinPer100: 2.5, defaultGrams: 150, gramsPerCup: 158 }
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
      defaultUnit: "rebanada",
      gramsPerSlice: 35
    }
  },
  {
    match: /\bavena\b|\boat(meal|s)?\b/,
    density: {
      name: "Avena",
      kcalPer100: 370,
      proteinPer100: 13,
      defaultGrams: 40,
      gramsPerCup: 80,
      gramsPerTbsp: 6
    }
  },
  {
    match: /\bchia\b|\bsemillas?\s+de\s+chia\b/,
    density: {
      name: "Semillas de chía",
      kcalPer100: 486,
      proteinPer100: 17,
      defaultGrams: 10,
      gramsPerTbsp: 10,
      gramsPerTsp: 3
    }
  },
  {
    match: /\b(mantequilla|crema)\s+de\s+(mani|maní|cacahuete|cacahuate|peanut)\b|\bpeanut\s+butter\b/,
    density: {
      name: "Mantequilla de maní",
      kcalPer100: 588,
      proteinPer100: 25,
      defaultGrams: 16,
      gramsPerTbsp: 16,
      gramsPerTsp: 5
    }
  },
  {
    match: /\b(mantequilla|crema)\s+de\s+almendras?\b|\balmond\s+butter\b/,
    density: {
      name: "Mantequilla de almendras",
      kcalPer100: 614,
      proteinPer100: 21,
      defaultGrams: 16,
      gramsPerTbsp: 16,
      gramsPerTsp: 5
    }
  },
  {
    match: /\bmiel\b|\bhoney\b/,
    density: {
      name: "Miel",
      kcalPer100: 304,
      proteinPer100: 0.3,
      defaultGrams: 7,
      gramsPerTbsp: 21,
      gramsPerTsp: 7
    }
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
      defaultUnit: "cda",
      gramsPerTbsp: 10,
      gramsPerTsp: 4
    }
  },
  {
    match: /\baguacate\b|\bavocado\b/,
    density: { name: "Aguacate", kcalPer100: 160, proteinPer100: 2, defaultGrams: 80 }
  },
  {
    match: /\b(frutos?\s+rojos?|berries|fresas?|arándanos?|arandanos?|frambuesas?|moras?)\b/,
    density: { name: "Frutos rojos", kcalPer100: 40, proteinPer100: 0.7, defaultGrams: 80 }
  },
  {
    match: /\b(platano|plátano|banana|banano|guineo)s?\b/,
    density: {
      name: "Plátano",
      kcalPer100: 89,
      proteinPer100: 1.1,
      defaultGrams: 118,
      defaultUnit: "unidad",
      gramsPerUnit: 118,
      gramsPerSlice: 18
    }
  },
  {
    match: /\bmanzana\b|\bfrutas?\b/,
    density: { name: "Fruta", kcalPer100: 60, proteinPer100: 0.5, defaultGrams: 120 }
  },
  {
    match: /\bgalletas?\b|\bcookies?\b/,
    density: {
      name: "Galletas",
      kcalPer100: 480,
      proteinPer100: 6,
      defaultGrams: 30,
      defaultUnit: "unidad",
      gramsPerUnit: 12
    }
  },
  {
    match: /\bpizza\b/,
    density: { name: "Pizza", kcalPer100: 270, proteinPer100: 11, defaultGrams: 250 }
  },
  {
    match: /\bcafe(\s+en\s+polvo)?\b|\bcoffee\b/,
    density: {
      name: "Café",
      kcalPer100: 2,
      proteinPer100: 0.1,
      defaultGrams: 2,
      gramsPerTsp: 2,
      gramsPerTbsp: 5
    }
  },
  {
    match: /\bmatcha\b|\bte\s+matcha\b|\btea\s+matcha\b/,
    density: {
      name: "Té matcha",
      kcalPer100: 5,
      proteinPer100: 0,
      defaultGrams: 200,
      defaultUnit: "ml",
      gramsPerCup: 240
    }
  },
  {
    match: /\blatte\b/,
    density: {
      name: "Latte",
      kcalPer100: 45,
      proteinPer100: 3,
      defaultGrams: 240,
      defaultUnit: "ml",
      gramsPerCup: 240
    }
  },
  {
    match: /\bte\b|\binfusion\b/,
    density: {
      name: "Té",
      kcalPer100: 2,
      proteinPer100: 0,
      defaultGrams: 200,
      defaultUnit: "ml",
      gramsPerCup: 240
    }
  },
  {
    match: /\bleche\s+de\s+(almendras?|avenas?|soja|soya|coco)\b|\balmond\s+milk\b|\boat\s+milk\b/,
    density: {
      name: "Leche vegetal",
      kcalPer100: 25,
      proteinPer100: 0.8,
      defaultGrams: 240,
      defaultUnit: "ml",
      gramsPerCup: 240
    }
  },
  {
    match: /\bleche\b/,
    density: {
      name: "Leche",
      kcalPer100: 42,
      proteinPer100: 3.4,
      defaultGrams: 200,
      defaultUnit: "ml",
      gramsPerCup: 240
    }
  }
];

export function findFoodDensity(foodText: string): FoodDensity | null {
  const normalized = normalizeForMatch(foodText);
  if (!normalized) return null;
  for (const entry of FOOD_DENSITIES) {
    if (entry.match.test(normalized)) return entry.density;
  }
  return null;
}

export function normalizeFoodUnit(raw: string | null | undefined): string {
  if (!raw) return "g";
  const u = normalizeForMatch(raw).replace(/\./g, "");
  if (/^(g|gr|grs|gramo|gramos)$/.test(u)) return "g";
  if (/^(kg|kilo|kilos)$/.test(u)) return "kg";
  if (/^(ml|mililitro|mililitros)$/.test(u)) return "ml";
  if (/^(ud|uds|u|unidad|unidades)$/.test(u)) return "unidad";
  if (/^(rebanada|rebanadas)$/.test(u)) return "rebanada";
  if (/^(cda|cdas|cucharada|cucharadas)$/.test(u)) return "cda";
  if (/^(cdta|cditas?|cucharadita|cucharaditas)$/.test(u)) return "cdta";
  if (/^(taza|tazas|tz)$/.test(u)) return "taza";
  if (/^(porcion|porciones)$/.test(u)) return "porción";
  return u.slice(0, 12);
}

/**
 * Convierte cantidad + unidad a gramos (o ml equivalentes).
 * Para avena u otros secos, "ml"/"taza" usan el peso típico del alimento, no 1:1 con agua.
 */
export function portionToGrams(
  amount: number,
  unitRaw: string,
  density: FoodDensity
): number {
  const unit = normalizeFoodUnit(unitRaw);
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;

  switch (unit) {
    case "kg":
      return safeAmount * 1000;
    case "g":
      return safeAmount;
    case "ml":
      // Líquidos ≈ 1 ml = 1 g; secos (avena) usan peso por taza / 240.
      if (density.gramsPerCup && density.defaultUnit !== "ml") {
        return safeAmount * (density.gramsPerCup / 240);
      }
      return safeAmount;
    case "unidad":
      return safeAmount * (density.gramsPerUnit ?? density.defaultGrams);
    case "rebanada":
      return safeAmount * (density.gramsPerSlice ?? (density.defaultUnit === "rebanada" ? density.defaultGrams : 35));
    case "cda":
      return safeAmount * (density.gramsPerTbsp ?? (density.defaultUnit === "cda" ? density.defaultGrams : 10));
    case "cdta":
      return safeAmount * (density.gramsPerTsp ?? 5);
    case "taza":
      return safeAmount * (density.gramsPerCup ?? 150);
    case "porción":
      return safeAmount * density.defaultGrams;
    default:
      return safeAmount;
  }
}

export type MacroPortion = {
  calorias: number;
  proteinas_g: number;
  grams: number;
};

export function macrosFromDensity(
  density: FoodDensity,
  amount: number,
  unit: string
): MacroPortion {
  const grams = portionToGrams(amount, unit, density);
  const factor = grams / 100;
  return {
    grams,
    calorias: Math.max(0, Math.round(density.kcalPer100 * factor)),
    proteinas_g: Math.max(0, Math.round(density.proteinPer100 * factor))
  };
}

/**
 * Macros para un alimento por nombre + cantidad + unidad.
 * Si no hay densidad, usa el fallback (p. ej. macros de la IA) como densidad implícita.
 */
export function macrosForFoodPortion(input: {
  nombre: string;
  cantidad: number;
  unidad: string;
  fallback?: { cantidad: number; unidad: string; calorias: number; proteinas_g: number };
}): MacroPortion | null {
  const density = findFoodDensity(input.nombre);
  if (density) {
    return macrosFromDensity(density, input.cantidad, input.unidad);
  }

  const fb = input.fallback;
  if (!fb || fb.cantidad <= 0 || fb.calorias < 0) return null;

  const fbUnit = normalizeFoodUnit(fb.unidad);
  const nextUnit = normalizeFoodUnit(input.unidad);

  // Misma unidad: escala lineal (densidad implícita de la IA).
  if (fbUnit === nextUnit) {
    const factor = input.cantidad / fb.cantidad;
    return {
      grams: input.cantidad,
      calorias: Math.max(0, Math.round(fb.calorias * factor)),
      proteinas_g: Math.max(0, Math.round(fb.proteinas_g * factor))
    };
  }

  // Cambio de unidad sin catálogo: conservar kcal de la IA (mejor que inventar).
  return {
    grams: input.cantidad,
    calorias: Math.max(0, Math.round(fb.calorias)),
    proteinas_g: Math.max(0, Math.round(fb.proteinas_g))
  };
}
