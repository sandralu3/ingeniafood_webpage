/** Letras (incl. acentos ES), números, espacios, guion y apóstrofo. Compatible con target ES5. */
const LETTER_CHARS = "a-zA-ZáéíóúÁÉÍÓÚñÑüÜ";
const ALLOWED_CHARS = new RegExp(`^[${LETTER_CHARS}0-9\\s'\\-]+$`);
const ONLY_LETTERS = new RegExp(`[^${LETTER_CHARS}]`, "g");
const HAS_VOWEL = /[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]/;

export function formatCustomIngredientName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function isValidCustomIngredientName(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 3) return false;
  if (!ALLOWED_CHARS.test(trimmed)) return false;

  const letters = trimmed.replace(ONLY_LETTERS, "").toLowerCase();
  if (letters.length < 3) return false;

  const uniqueLetters = new Set(letters);
  if (uniqueLetters.size < 2) return false;

  if (trimmed.length >= 4 && !HAS_VOWEL.test(trimmed)) {
    return false;
  }

  return true;
}
