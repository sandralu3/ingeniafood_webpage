const STOP_WORDS = new Set([
  "con",
  "sin",
  "para",
  "por",
  "una",
  "uno",
  "del",
  "de",
  "la",
  "el",
  "los",
  "las",
  "al",
  "en",
  "y",
  "o",
  "the",
  "and"
]);

export function normalizeMatchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function tokenizeMatchText(text: string): string[] {
  const normalized = normalizeMatchText(text);
  if (!normalized) return [];

  const tokens = normalized
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  return Array.from(new Set(tokens));
}

export function tokensOverlap(left: string[], right: string[]): boolean {
  if (!left.length || !right.length) return false;

  const rightSet = new Set(right);
  for (const token of left) {
    if (rightSet.has(token)) return true;
    if (token.length < 4) continue;
    for (const candidate of right) {
      if (candidate.length < 4) continue;
      if (candidate.includes(token) || token.includes(candidate)) {
        return true;
      }
    }
  }

  return false;
}
