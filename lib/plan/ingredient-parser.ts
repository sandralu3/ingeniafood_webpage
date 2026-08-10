export type ParsedIngredient = {
  name: string;
  amount: number | null;
  unit: string | null;
  qualitative: boolean;
};

const UNIT_ALIASES: Record<string, string> = {
  g: "g",
  gr: "g",
  grs: "g",
  gramo: "g",
  gramos: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  litro: "l",
  litros: "l",
  cdita: "cdita",
  cditas: "cdita",
  cucharadita: "cdita",
  cucharaditas: "cdita",
  cda: "cda",
  cdas: "cda",
  cucharada: "cda",
  cucharadas: "cda",
  taza: "taza",
  tazas: "taza",
  tz: "taza",
  tzs: "taza",
  unidad: "ud",
  unidades: "ud",
  ud: "ud",
  uds: "ud",
  pizca: "pizca",
  pizcas: "pizca",
  diente: "diente",
  dientes: "diente"
};

const QUANTITY_LINE_PATTERN =
  /^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*(g|grs?|kg|ml|l|litros?|gramos?|cditas?|cdas?|cucharaditas?|cucharadas?|tazas?|tzs?\.?|unidades?|uds?\.?|pizcas?|dientes?)?\s*(?:de\s+)?(.+)$/i;

export function ingredientNameEmbedsQuantity(name: string): boolean {
  const cleaned = cleanMalformedIngredientName(stripAnnotations(name.trim()));
  return QUANTITY_LINE_PATTERN.test(cleaned);
}

export function normalizeIngredientUnit(raw?: string | null): string | null {
  return normalizeUnit(raw);
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed.includes("/")) {
    const [left, right] = trimmed.split("/").map((part) => Number(part.trim()));
    if (!Number.isFinite(left) || !Number.isFinite(right) || right === 0) return null;
    return left / right;
  }

  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function normalizeUnit(raw?: string | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\.$/, "");
  return UNIT_ALIASES[key] ?? null;
}

function stripAnnotations(text: string): string {
  return text
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*,?\s*(opcional|al gusto)\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(name: string): string {
  const lowerWords = new Set(["de", "del", "la", "el", "los", "las", "y", "o", "con", "sin", "al"]);
  return name
    .split(" ")
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && lowerWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function toTitleCaseForIngredient(name: string): string {
  return toTitleCase(name);
}

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeIngredientKey(name: string): string {
  return stripAccents(stripAnnotations(name))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isQualitativeQuantity(quantity: string | null | undefined): boolean {
  if (!quantity) return false;
  return /al gusto|opcional|cantidad necesaria|qb|q\.b\./i.test(quantity);
}

function cleanMalformedIngredientName(name: string): string {
  return name
    .trim()
    .replace(/^\.\s*(de\s+)?/i, "")
    .replace(/^\/(?=\d)/, "1/")
    .replace(/^\s*de\s+/i, "");
}

const QUALITATIVE_PREFIX_PATTERN =
  /^(?:un|una|unos|unas)?\s*(?:toque|chorrito|poco|poquito|puñado|manojo|gota|gotas|hilo|hilos|pizca|pizcas|cucharadita|cucharaditas|cucharada|cucharadas)\s+(?:de\s+)?/i;

const DESCRIPTOR_PREFIX_PATTERN =
  /^(?:esencia|extracto|mezcla|mezcla de|un toque de|un chorrito de)\s+/i;

export function stripIngredientDescriptors(name: string): string {
  let result = cleanMalformedIngredientName(name);

  for (let i = 0; i < 3; i += 1) {
    const next = result.replace(QUALITATIVE_PREFIX_PATTERN, "").trim();
    if (next === result) break;
    result = next;
  }

  return result.replace(DESCRIPTOR_PREFIX_PATTERN, "").replace(/^\s*de\s+/i, "").trim();
}

export function parseIngredientString(raw: string): ParsedIngredient | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const qualitativeInText = /\(?(opcional|al gusto)\)?/i.test(trimmed);
  const withoutAnnotations = cleanMalformedIngredientName(stripAnnotations(trimmed));
  const quantityMatch = withoutAnnotations.match(QUANTITY_LINE_PATTERN);

  if (quantityMatch) {
    const amount = parseAmount(quantityMatch[1]);
    const unit = normalizeUnit(quantityMatch[2]);
    const name = toTitleCase(stripIngredientDescriptors(quantityMatch[3].trim()));

    return {
      name,
      amount,
      unit,
      qualitative: qualitativeInText && amount === null
    };
  }

  return {
    name: toTitleCase(stripIngredientDescriptors(withoutAnnotations)),
    amount: null,
    unit: null,
    qualitative: qualitativeInText
  };
}

export function parseIngredientObject(
  name: string,
  quantity?: string | null
): ParsedIngredient | null {
  const cleanName = cleanMalformedIngredientName(stripAnnotations(name.trim()));
  if (!cleanName) return null;

  if (!quantity || isQualitativeQuantity(quantity)) {
    return {
      name: toTitleCase(cleanName),
      amount: null,
      unit: null,
      qualitative: true
    };
  }

  const trimmedQuantity = quantity.trim();
  const amountUnitOnly = trimmedQuantity.match(
    /^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*(g|grs?|kg|ml|l|litros?|gramos?|cditas?|cdas?|cucharaditas?|cucharadas?|tazas?|tzs?\.?|unidades?|uds?\.?|pizcas?|dientes?)?$/i
  );

  if (amountUnitOnly) {
    return {
      name: toTitleCase(cleanName),
      amount: parseAmount(amountUnitOnly[1]),
      unit: normalizeUnit(amountUnitOnly[2]),
      qualitative: false
    };
  }

  const parsedQuantityLine = parseIngredientString(trimmedQuantity);
  if (parsedQuantityLine && parsedQuantityLine.amount !== null) {
    return {
      name: toTitleCase(cleanName),
      amount: parsedQuantityLine.amount,
      unit: parsedQuantityLine.unit,
      qualitative: false
    };
  }

  return {
    name: toTitleCase(cleanName),
    amount: null,
    unit: null,
    qualitative: false
  };
}

function pluralizeUnit(unit: string, amount: number): string {
  if (amount === 1) {
    if (unit === "ud") return "ud";
    if (unit === "cda") return "cda";
    if (unit === "cdita") return "cdita";
    if (unit === "taza") return "taza";
    if (unit === "pizca") return "pizca";
    if (unit === "diente") return "diente";
    return unit;
  }

  if (unit === "ud") return "uds";
  if (unit === "cda") return "cdas";
  if (unit === "cdita") return "cditas";
  if (unit === "taza") return "tazas";
  if (unit === "pizca") return "pizcas";
  if (unit === "diente") return "dientes";
  return unit;
}

function formatAmount(amount: number): string {
  if (Math.abs(amount - 0.5) < 0.001) return "1/2";
  if (Math.abs(amount - 0.25) < 0.001) return "1/4";
  if (Math.abs(amount - 0.75) < 0.001) return "3/4";
  if (Number.isInteger(amount)) return String(amount);
  return amount.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

export function formatQuantityLabel(amount: number, unit: string): string {
  return `${formatAmount(amount)} ${pluralizeUnit(unit, amount)}`;
}

/**
 * Unifica unidades compatibles (g/kg, ml/l) para que la lista de compra
 * no mezcle formatos distintos de la misma magnitud.
 */
export function consolidateAmountMap(amounts: Map<string, number>): Map<string, number> {
  const next = new Map<string, number>();

  let grams = 0;
  let milliliters = 0;

  for (const [unit, amount] of Array.from(amounts.entries())) {
    if (!Number.isFinite(amount) || amount <= 0) continue;

    if (unit === "g") {
      grams += amount;
      continue;
    }
    if (unit === "kg") {
      grams += amount * 1000;
      continue;
    }
    if (unit === "ml") {
      milliliters += amount;
      continue;
    }
    if (unit === "l") {
      milliliters += amount * 1000;
      continue;
    }

    next.set(unit, (next.get(unit) ?? 0) + amount);
  }

  if (grams > 0) {
    if (grams >= 1000 && grams % 1000 === 0) {
      next.set("kg", grams / 1000);
    } else if (grams >= 1000) {
      // Preferir kg con decimales cuando es más legible (ej. 1,2 kg).
      next.set("kg", Math.round((grams / 1000) * 100) / 100);
    } else {
      next.set("g", Math.round(grams * 100) / 100);
    }
  }

  if (milliliters > 0) {
    if (milliliters >= 1000 && milliliters % 1000 === 0) {
      next.set("l", milliliters / 1000);
    } else if (milliliters >= 1000) {
      next.set("l", Math.round((milliliters / 1000) * 100) / 100);
    } else {
      next.set("ml", Math.round(milliliters * 100) / 100);
    }
  }

  return next;
}

const UNIT_PRIORITY = ["kg", "g", "l", "ml", "taza", "cda", "cdita", "diente", "ud", "pizca"];

function sortUnits(units: string[]): string[] {
  return [...units].sort((a, b) => {
    const ia = UNIT_PRIORITY.indexOf(a);
    const ib = UNIT_PRIORITY.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "es");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/**
 * Formato legible para compra.
 * Si hay peso/volumen y también “unidades”, prioriza lo medible
 * y deja las uds entre paréntesis para no confundir.
 */
export function formatAggregatedQuantities(
  amounts: Map<string, number>,
  qualitativeCount: number
): string | null {
  const consolidated = consolidateAmountMap(amounts);

  if (consolidated.size === 0) {
    if (qualitativeCount > 0) return "al gusto";
    return null;
  }

  const units = sortUnits(Array.from(consolidated.keys()));
  const hasMassOrVolume = units.some((unit) => ["g", "kg", "ml", "l"].includes(unit));
  const primaryUnits = hasMassOrVolume
    ? units.filter((unit) => unit !== "ud")
    : units;
  const secondaryUnits = hasMassOrVolume
    ? units.filter((unit) => unit === "ud")
    : [];

  const primary = primaryUnits
    .map((unit) => formatQuantityLabel(consolidated.get(unit)!, unit))
    .join(" · ");

  if (!primary && secondaryUnits.length) {
    return secondaryUnits
      .map((unit) => formatQuantityLabel(consolidated.get(unit)!, unit))
      .join(" · ");
  }

  if (secondaryUnits.length) {
    const secondary = secondaryUnits
      .map((unit) => formatQuantityLabel(consolidated.get(unit)!, unit))
      .join(" · ");
    return `${primary} (${secondary})`;
  }

  if (qualitativeCount > 0 && !hasMassOrVolume) {
    return `${primary} · al gusto`;
  }

  return primary;
}

export function pickDisplayName(candidates: string[]): string {
  const cleaned = candidates
    .map((name) => cleanMalformedIngredientName(stripAnnotations(name)))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return toTitleCase(cleaned[0] ?? "Ingrediente");
}
