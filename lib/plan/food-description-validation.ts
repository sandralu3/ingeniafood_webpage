import {
  isLikelyEdibleIngredientName,
  NON_FOOD_APPLIANCE_RE
} from "@/lib/pantry/validation";

const LETTERS_RE = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g;
const HAS_VOWEL = /[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]/;

const STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "con",
  "y",
  "e",
  "o",
  "u",
  "a",
  "en",
  "al",
  "para",
  "por",
  "sin",
  "mas",
  "más",
  "muy",
  "the",
  "and",
  "with",
  "of"
]);

/** Frases / saludos / basura frecuentes en texto abierto (no comida). */
const NON_FOOD_PHRASE_RE =
  /^(hola|hello|hi|hey|buenas|buenos\s+dias|buenas\s+tardes|buenas\s+noches|adios|adi[oó]s|gracias|thanks|ok|vale|test|prueba|asdf|qwerty|lorem|ipsum|nada|ninguno|ninguna|no\s+se|nose|abc|xyz)(\b|!|\.|,|$)/i;

const NON_FOOD_SENTENCE_RE =
  /\b(fui\s+al\s+cine|me\s+duele|ver\s+netflix|jugar\s+al?\s|trabajar|estudiar|dormir)\b/i;

function normalizeDescriptionKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Valida texto abierto de comida fuera / snack: debe parecer alimento o bebida,
 * no un saludo, nombre de persona, aparato u otra basura.
 */
export function isLikelyFoodOrDrinkDescription(value: string): boolean {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < 3 || trimmed.length > 400) return false;

  const letters = trimmed.match(LETTERS_RE)?.join("") ?? "";
  if (letters.length < 3) return false;
  if (!HAS_VOWEL.test(trimmed)) return false;

  const key = normalizeDescriptionKey(trimmed);
  if (!key) return false;

  if (NON_FOOD_PHRASE_RE.test(key)) return false;
  if (NON_FOOD_SENTENCE_RE.test(key)) return false;
  if (NON_FOOD_APPLIANCE_RE.test(key)) return false;
  if (/^(tip|receta|chef|coach|usuario|nombre)\b/.test(key)) return false;
  if (/\b(sandra|ingeniafood|ingenia food)\b/.test(key)) return false;

  if (!/\s/.test(key)) {
    return isLikelyEdibleIngredientName(key);
  }

  const contentTokens = key
    .split(" ")
    .map((token) => token.replace(/^['-]+|['-]+$/g, ""))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));

  if (contentTokens.length === 0) return false;

  return contentTokens.some((token) => isLikelyEdibleIngredientName(token));
}

export function foodDescriptionRejectionMessage(context: "meal" | "snack" = "meal"): string {
  return context === "snack"
    ? "Eso no parece un alimento o bebida. Describe el snack (por ejemplo: yogur con fresas, café con galleta)."
    : "Eso no parece un alimento o bebida. Describe lo que comiste (por ejemplo: pizza margarita, ensalada de pollo).";
}

/**
 * Varios alimentos unidos solo con "y"/"+": pedir comas para desglosarlos bien.
 * "café con leche" (un alimento) no dispara; "café y galletas" sí.
 */
export function descriptionNeedsCommaSeparation(description: string): boolean {
  const text = description.trim().replace(/\s+/g, " ");
  if (!text || text.includes(",")) return false;

  // Dos o más bloques separados por " y " o " + "
  const parts = text.split(/\s+(?:y|\+)\s+/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return false;

  // Cada parte debe tener algo de contenido (no solo "más")
  return parts.every((part) => part.length >= 2);
}

export function commaSeparationHintMessage(): string {
  return "Si añades varios alimentos, sepáralos por comas. Así los identificamos mejor. Ej.: 200 g pechuga, arroz, ensalada";
}

export function commaSeparationErrorMessage(): string {
  return "Para varios alimentos, sepáralos por comas (no solo con «y»). Ejemplo: galletas, café con leche";
}
