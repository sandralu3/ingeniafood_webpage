import {
  normalizeIngredientKey,
  parseIngredientString,
  stripIngredientDescriptors,
  toTitleCaseForIngredient
} from "@/lib/plan/ingredient-parser";

export type CanonicalIngredient = {
  key: string;
  displayName: string;
};

const DESCRIPTOR_PREFIX_PATTERN =
  /^(?:esencia|extracto|mezcla|mezcla de|un toque de|un chorrito de)\s+/i;

const CANONICAL_ALIASES: Record<string, string> = {
  "esencia de vainilla": "vainilla",
  "extracto de vainilla": "vainilla",
  "un toque de vainilla": "vainilla",
  vainilla: "vainilla",
  "frutos secos": "frutos secos",
  "mezcla de frutos secos": "frutos secos",
  "nueces y frutos secos": "frutos secos",
  "un chorrito de aceite de oliva": "aceite de oliva",
  "aceite de oliva virgen extra": "aceite de oliva",
  "aceite de oliva": "aceite de oliva",
  "aceite oliva": "aceite de oliva",
  leche: "leche",
  "leche entera": "leche",
  "leche desnatada": "leche",
  "leche semidesnatada": "leche",
  "leche de almendras": "leche de almendras",
  "leche de avena": "leche de avena",
  "leche de soja": "leche de soja",
  "leche de coco": "leche de coco",
  miel: "miel",
  canela: "canela",
  "miel y canela": "miel y canela",
  chia: "chia",
  chía: "chia",
  "semillas de chia": "chia",
  "semillas de chía": "chia",
  "polvo de hornear": "polvo de hornear",
  "levadura en polvo": "polvo de hornear",
  "bicarbonato sodico": "bicarbonato",
  bicarbonato: "bicarbonato",
  "avena en hojuelas": "avena",
  "copos de avena": "avena",
  avena: "avena",
  "sal marina": "sal",
  sal: "sal",
  "pimienta negra": "pimienta",
  pimienta: "pimienta",
  "sal y pimienta": "sal y pimienta",
  "pepino": "pepino",
  "arroz integral": "arroz",
  arroz: "arroz"
};

const CANONICAL_DISPLAY_NAMES: Record<string, string> = {
  vainilla: "Vainilla",
  "frutos secos": "Frutos Secos",
  "aceite de oliva": "Aceite de Oliva",
  leche: "Leche",
  "leche de almendras": "Leche de Almendras",
  "leche de avena": "Leche de Avena",
  "leche de soja": "Leche de Soja",
  "leche de coco": "Leche de Coco",
  miel: "Miel",
  canela: "Canela",
  chia: "Chía",
  "polvo de hornear": "Polvo de Hornear",
  bicarbonato: "Bicarbonato",
  avena: "Avena",
  sal: "Sal",
  pimienta: "Pimienta",
  pepino: "Pepino",
  arroz: "Arroz"
};

function stripQualitativePrefixes(name: string): string {
  return stripIngredientDescriptors(name);
}

const COMPOUND_SPLIT_PATTERN = /\s+y\s+/i;

const PRODUCT_DE_PREFIXES = [
  "leche de",
  "aceite de",
  "jugo de",
  "zumo de",
  "crema de",
  "mantequilla de",
  "harina de",
  "pure de",
  "pulpa de",
  "salsa de",
  "vinagre de",
  "yogur de",
  "queso de"
];

function preservesProductDePhrase(normalizedName: string): boolean {
  return PRODUCT_DE_PREFIXES.some((prefix) => normalizedName.startsWith(prefix));
}

function lookupAlias(normalizedName: string): string | null {
  if (CANONICAL_ALIASES[normalizedName]) {
    return CANONICAL_ALIASES[normalizedName];
  }

  for (const [alias, canonical] of Object.entries(CANONICAL_ALIASES)) {
    if (normalizedName === alias) return canonical;
  }

  return null;
}

function inferCanonicalFromSuffix(normalizedName: string): string {
  if (preservesProductDePhrase(normalizedName)) {
    return normalizedName;
  }

  const deMatch = normalizedName.match(/(?:^|\s)de\s+(.+)$/);
  if (deMatch) {
    const tail = deMatch[1].trim();
    const tailAlias = lookupAlias(tail);
    if (tailAlias) return tailAlias;

    if (tail.split(/\s+/).length <= 4) {
      return tail;
    }
  }

  return normalizedName;
}

export function resolveCanonicalIngredient(name: string): CanonicalIngredient {
  const stripped = stripQualitativePrefixes(name);
  const normalized = normalizeIngredientKey(stripped);
  const alias = lookupAlias(normalized) ?? lookupAlias(normalizeIngredientKey(name));
  const key = alias ?? inferCanonicalFromSuffix(normalized);

  const displayName =
    CANONICAL_DISPLAY_NAMES[key] ??
    toTitleCaseForIngredient(stripped || name);

  return { key, displayName };
}

function scoreDisplayCandidate(name: string): number {
  const normalized = normalizeIngredientKey(name);
  let score = 100;

  if (/^(?:un|una)\s+(?:toque|chorrito|poco)/i.test(name)) score -= 60;
  if (DESCRIPTOR_PREFIX_PATTERN.test(normalized)) score -= 25;
  if (/^\d/.test(name)) score -= 40;
  if (/\//.test(name)) score -= 20;
  if (/\b(al gusto|opcional)\b/i.test(name)) score -= 30;
  score -= name.length * 0.15;

  return score;
}

function normalizeCandidateName(name: string): string {
  const parsed = parseIngredientString(name);
  if (parsed && parsed.amount !== null && parsed.name.trim()) {
    return parsed.name;
  }

  return stripQualitativePrefixes(name);
}

export function pickCanonicalDisplayName(
  candidates: string[],
  canonicalKey: string
): string {
  if (CANONICAL_DISPLAY_NAMES[canonicalKey]) {
    return CANONICAL_DISPLAY_NAMES[canonicalKey];
  }

  const best = candidates
    .map((name) => normalizeCandidateName(name))
    .filter(Boolean)
    .sort((a, b) => scoreDisplayCandidate(b) - scoreDisplayCandidate(a))[0];

  return toTitleCaseForIngredient(best ?? canonicalKey);
}

export function shouldSplitCompoundIngredient(name: string): boolean {
  if (!COMPOUND_SPLIT_PATTERN.test(name)) return false;

  const parts = name
    .split(COMPOUND_SPLIT_PATTERN)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2 || parts.length > 3) return false;
  if (parts.some((part) => part.split(/\s+/).length > 5)) return false;

  const keys = parts.map((part) => resolveCanonicalIngredient(part).key);
  return new Set(keys).size === keys.length;
}

export function splitCompoundIngredientName(name: string): string[] {
  if (!shouldSplitCompoundIngredient(name)) {
    return [name];
  }

  return name
    .split(COMPOUND_SPLIT_PATTERN)
    .map((part) => part.trim())
    .filter(Boolean);
}
