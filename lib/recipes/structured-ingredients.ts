import type { Json } from "@/types/database.types";
import {
  formatQuantityLabel,
  parseIngredientObject,
  parseIngredientString,
  type ParsedIngredient
} from "@/lib/plan/ingredient-parser";

export type StructuredIngredient = {
  name: string;
  amount: number | null;
  unit: string | null;
  optional?: boolean;
};

function wasOptionalInRaw(raw: string): boolean {
  return /\(opcional\)|\bopcional\b/i.test(raw);
}

function parsedToStructured(parsed: ParsedIngredient, originalRaw?: string): StructuredIngredient {
  const optional =
    parsed.qualitative ||
    Boolean(originalRaw && wasOptionalInRaw(originalRaw));

  return {
    name: parsed.name,
    amount: parsed.amount,
    unit: parsed.unit,
    optional: optional || undefined
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStructuredRecord(record: Record<string, unknown>): StructuredIngredient | null {
  const name =
    (typeof record.name === "string" ? record.name : typeof record.nombre === "string" ? record.nombre : "")
      .trim();

  if (!name) {
    return null;
  }

  const optional = record.optional === true || record.opcional === true;

  const hasStructuredAmount =
    "amount" in record || "unit" in record || "cantidad" in record || "unidad" in record;

  if (hasStructuredAmount) {
    const amountValue =
      typeof record.amount === "number" && Number.isFinite(record.amount)
        ? record.amount
        : typeof record.cantidad === "number" && Number.isFinite(record.cantidad)
          ? record.cantidad
          : null;

    const unitValue =
      typeof record.unit === "string" && record.unit.trim()
        ? record.unit.trim()
        : typeof record.unidad === "string" && record.unidad.trim()
          ? record.unidad.trim()
          : null;

    if (amountValue === null && !unitValue && typeof record.cantidad === "string") {
      const parsed = parseIngredientObject(name, record.cantidad);
      if (!parsed) return null;
      const structured = parsedToStructured(parsed);
      return optional ? { ...structured, optional: true } : structured;
    }

    return {
      name,
      amount: amountValue,
      unit: unitValue,
      optional: optional || undefined
    };
  }

  if (typeof record.quantity === "string") {
    const parsed = parseIngredientObject(name, record.quantity);
    if (!parsed) return null;
    const structured = parsedToStructured(parsed);
    return optional ? { ...structured, optional: true } : structured;
  }

  const parsed = parseIngredientString(name);
  if (!parsed) return null;
  const structured = parsedToStructured(parsed, name);
  return optional ? { ...structured, optional: true } : structured;
}

export function normalizeIngredientEntry(entry: unknown): StructuredIngredient | null {
  if (typeof entry === "string") {
    const parsed = parseIngredientString(entry);
    if (!parsed) return null;
    return parsedToStructured(parsed, entry);
  }

  if (isRecord(entry)) {
    return normalizeStructuredRecord(entry);
  }

  return null;
}

export function stringsToStructuredIngredients(lines: string[]): StructuredIngredient[] {
  return lines
    .map((line) => normalizeIngredientEntry(line))
    .filter((item): item is StructuredIngredient => Boolean(item));
}

export function normalizeIngredientsJson(ingredients: Json): StructuredIngredient[] {
  if (!Array.isArray(ingredients)) return [];

  return ingredients
    .map((entry) => normalizeIngredientEntry(entry))
    .filter((item): item is StructuredIngredient => Boolean(item));
}

export function structuredIngredientsToJson(items: StructuredIngredient[]): Json {
  return items.map((item) => {
    const payload: Record<string, string | number | boolean> = {
      name: item.name
    };

    if (item.amount !== null) {
      payload.amount = item.amount;
    }

    if (item.unit) {
      payload.unit = item.unit;
    }

    if (item.optional) {
      payload.optional = true;
    }

    return payload;
  });
}

export function structuredIngredientToDisplayString(item: StructuredIngredient): string {
  if (item.amount !== null && item.unit) {
    const base = `${formatQuantityLabel(item.amount, item.unit)} de ${item.name}`;
    return item.optional ? `${base} (opcional)` : base;
  }

  if (item.amount !== null && !item.unit) {
    const base = `${item.amount} ${item.name}`;
    return item.optional ? `${base} (opcional)` : base;
  }

  if (item.optional) {
    return `${item.name} (al gusto)`;
  }

  return item.name;
}

export function ingredientsJsonToDisplayStrings(ingredients: Json): string[] {
  return normalizeIngredientsJson(ingredients).map(structuredIngredientToDisplayString);
}

export function formatIngredientLinesForDisplay(lines: string[]): string[] {
  return stringsToStructuredIngredients(lines).map(structuredIngredientToDisplayString);
}

type LooseGeminiIngredientsSource = {
  ingredientes_detallados?: unknown[];
  ingredientes?: unknown[];
  ingredientes_estructurados?: unknown[];
};

export function normalizeLooseGeminiIngredients(source: LooseGeminiIngredientsSource): string[] {
  const raw =
    source.ingredientes_estructurados ??
    source.ingredientes_detallados ??
    source.ingredientes ??
    [];

  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  return raw
    .map((entry) => normalizeIngredientEntry(entry))
    .filter((item): item is StructuredIngredient => Boolean(item))
    .map(structuredIngredientToDisplayString);
}
