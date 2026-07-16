/** Primera letra en mayúscula; no altera el resto (válido en ES y EN). */
export function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** @deprecated Usa toSentenceCase — se mantiene por compatibilidad. */
export function toSpanishSentenceCase(text: string): string {
  return toSentenceCase(text);
}

export function normalizeRecipeSteps(steps: string[]): string[] {
  return steps.map((step) => toSentenceCase(step));
}
