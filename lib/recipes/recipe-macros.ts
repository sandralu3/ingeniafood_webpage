import type { Json } from "@/types/database.types";

export type RecipeMacros = {
  proteinas_g: number;
  carbohidratos_g: number;
  grasas_g: number;
  calorias: number;
};

export type MacroDisplayItem = {
  label: string;
  value: string;
  progress: number;
};

const MACRO_LIMITS = {
  proteinas_g: { min: 0, max: 120 },
  carbohidratos_g: { min: 0, max: 150 },
  grasas_g: { min: 0, max: 80 },
  calorias: { min: 80, max: 1200 }
} as const;

function clampRound(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.round(Math.min(max, Math.max(min, value)));
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickMacroSource(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.macronutrientes && typeof raw.macronutrientes === "object" && !Array.isArray(raw.macronutrientes)) {
    return raw.macronutrientes as Record<string, unknown>;
  }
  return raw;
}

export function normalizeRecipeMacros(raw: unknown): RecipeMacros | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const source = pickMacroSource(raw as Record<string, unknown>);

  const proteinas = toNumber(
    source.proteinas_g ?? source.proteinas ?? source.protein_g ?? source.protein
  );
  const carbohidratos = toNumber(
    source.carbohidratos_g ??
      source.carbohidratos ??
      source.carbs_g ??
      source.carbs ??
      source.carbohidratos
  );
  const grasas = toNumber(source.grasas_g ?? source.grasas ?? source.fat_g ?? source.fat);
  const caloriasRaw = toNumber(
    source.calorias ?? source.calorias_kcal ?? source.calories ?? source.kcal
  );

  if (proteinas === null || carbohidratos === null || grasas === null) {
    return null;
  }

  const normalized: RecipeMacros = {
    proteinas_g: clampRound(
      proteinas,
      MACRO_LIMITS.proteinas_g.min,
      MACRO_LIMITS.proteinas_g.max
    ),
    carbohidratos_g: clampRound(
      carbohidratos,
      MACRO_LIMITS.carbohidratos_g.min,
      MACRO_LIMITS.carbohidratos_g.max
    ),
    grasas_g: clampRound(grasas, MACRO_LIMITS.grasas_g.min, MACRO_LIMITS.grasas_g.max),
    calorias: 0
  };

  const computedCalories =
    normalized.proteinas_g * 4 + normalized.carbohidratos_g * 4 + normalized.grasas_g * 9;

  if (caloriasRaw === null) {
    normalized.calorias = clampRound(
      computedCalories,
      MACRO_LIMITS.calorias.min,
      MACRO_LIMITS.calorias.max
    );
  } else {
    const clamped = clampRound(caloriasRaw, MACRO_LIMITS.calorias.min, MACRO_LIMITS.calorias.max);
    const diffRatio = Math.abs(clamped - computedCalories) / Math.max(computedCalories, 1);
    normalized.calorias =
      diffRatio > 0.25
        ? clampRound(computedCalories, MACRO_LIMITS.calorias.min, MACRO_LIMITS.calorias.max)
        : clamped;
  }

  return normalized;
}

export function macrosToJson(macros: RecipeMacros): Json {
  return {
    proteinas_g: macros.proteinas_g,
    carbohidratos_g: macros.carbohidratos_g,
    grasas_g: macros.grasas_g,
    calorias: macros.calorias
  };
}

export function parseMacrosFromJson(value: Json | null | undefined): RecipeMacros | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return normalizeRecipeMacros(value);
}

function buildHeuristicMacros(ingredientCount: number, stepCount: number): RecipeMacros {
  const proteinas_g = Math.min(18 + ingredientCount * 2, 42);
  const carbohidratos_g = Math.min(24 + stepCount * 3, 58);
  const grasas_g = Math.min(10 + ingredientCount, 28);
  const calorias = 220 + proteinas_g * 4 + carbohidratos_g * 4 + grasas_g * 9;

  return { proteinas_g, carbohidratos_g, grasas_g, calorias };
}

export function buildMacroDisplay(recipe: {
  macronutrientes?: RecipeMacros | null;
  ingredientes_detallados: string[];
  pasos_ordenados?: string[];
}): MacroDisplayItem[] {
  const ingredientCount = Math.max(recipe.ingredientes_detallados.length, 1);
  const stepCount = Math.max(recipe.pasos_ordenados?.length ?? 0, 1);
  const macros = recipe.macronutrientes ?? buildHeuristicMacros(ingredientCount, stepCount);

  const maxGram = 60;
  return [
    {
      label: "Proteínas",
      value: `${macros.proteinas_g} g`,
      progress: Math.round((macros.proteinas_g / maxGram) * 100)
    },
    {
      label: "Carbs",
      value: `${macros.carbohidratos_g} g`,
      progress: Math.round((macros.carbohidratos_g / maxGram) * 100)
    },
    {
      label: "Grasas",
      value: `${macros.grasas_g} g`,
      progress: Math.round((macros.grasas_g / maxGram) * 100)
    },
    {
      label: "Calorías",
      value: `${macros.calorias} kcal`,
      progress: Math.min(Math.round((macros.calorias / 520) * 100), 100)
    }
  ];
}
