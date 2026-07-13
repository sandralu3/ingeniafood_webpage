const FLOURLESS_PATTERN = /sin\s+harinas?/i;
const AIRFRYER_PATTERN = /air\s*fryer|airfryer/i;
const MEAL_MOMENT_TAG_PATTERN = /^(desayuno|cena|snack|almuerzo|postre)$/i;

export function normalizeRecipeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of raw) {
    const label = typeof item === "string" ? item.trim() : String(item).trim();
    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(label);
  }

  return tags;
}

export function buildTagsFromLegacyFlags(flags: {
  is_airfryer?: boolean;
  is_flourless?: boolean;
}): string[] {
  const tags: string[] = [];
  if (flags.is_flourless) tags.push("Sin Harinas");
  if (flags.is_airfryer) tags.push("Apto para Airfryer");
  return tags;
}

export function resolveRecipeTags(source: {
  tags?: unknown;
  is_airfryer?: boolean;
  is_flourless?: boolean;
}): string[] {
  const fromArray = normalizeRecipeTags(source.tags);
  if (fromArray.length > 0) return fromArray;
  return buildTagsFromLegacyFlags(source);
}

export function tagsToLegacyFlags(tags: string[]): {
  is_airfryer: boolean;
  is_flourless: boolean;
} {
  return {
    is_airfryer: tags.some((tag) => AIRFRYER_PATTERN.test(tag)),
    is_flourless: tags.some((tag) => FLOURLESS_PATTERN.test(tag))
  };
}

export function isShareExcludedTag(tag: string): boolean {
  return FLOURLESS_PATTERN.test(tag) || AIRFRYER_PATTERN.test(tag);
}

export function filterRecipeTagsForDisplay(
  tags: string[],
  options?: { hideMealMomentTags?: boolean }
): string[] {
  if (!options?.hideMealMomentTags) return tags;
  return tags.filter((tag) => !MEAL_MOMENT_TAG_PATTERN.test(tag.trim()));
}
