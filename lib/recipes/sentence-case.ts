/** Oración en español: solo la primera letra del paso en mayúscula. */
export function toSpanishSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function normalizeRecipeSteps(steps: string[]): string[] {
  return steps.map((step) => toSpanishSentenceCase(step));
}
