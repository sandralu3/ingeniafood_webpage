const FLOURLESS_PATTERN = /sin\s+harinas?/i;
const AIRFRYER_PATTERN = /air\s*fryer|airfryer/i;
const MEAL_MOMENT_TAG_PATTERN = /^(desayuno|cena|snack|almuerzo|postre)$/i;

/** Claves internas del plan (mismas que en lib/plan/external-meal). */
const EXTERNAL_MEAL_TAG = "comida_fuera";
const SCANNED_MEAL_TAG = "escaneado";
const HAS_VEGETABLES_TAG = "tiene_vegetales";

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

/** Etiquetas internas que no deben verse como pills (detalle / compartir). */
const HIDDEN_DISPLAY_TAG_PATTERN =
  /^(diet:estandar|estandar)$/i;

export function filterRecipeTagsForDisplay(
  tags: string[],
  options?: { hideMealMomentTags?: boolean }
): string[] {
  const lower = tags.map((tag) => tag.trim().toLowerCase());
  const hasScanned = lower.includes(SCANNED_MEAL_TAG);

  const withoutHidden = tags.filter((tag) => {
    const key = tag.trim().toLowerCase();
    if (!key || HIDDEN_DISPLAY_TAG_PATTERN.test(key)) return false;
    // Flag interno de nutrición del plan; el detalle no lo muestra como pill.
    if (key === HAS_VEGETABLES_TAG) return false;
    // Un solo badge de origen, como en detalle: Escaneado pisa Registrada.
    if (
      hasScanned &&
      (key === EXTERNAL_MEAL_TAG || key === "comida fuera")
    ) {
      return false;
    }
    return true;
  });

  if (!options?.hideMealMomentTags) return withoutHidden;
  return withoutHidden.filter((tag) => !MEAL_MOMENT_TAG_PATTERN.test(tag.trim()));
}
