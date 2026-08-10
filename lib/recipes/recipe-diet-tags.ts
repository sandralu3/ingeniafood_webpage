import { PREFERRED_DIETS, type PreferredDiet } from "@/lib/nutrition/preferred-diet";
import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";

/** Prefijo canónico en `recipes.tags` para dietas asignadas por admin. */
export const RECIPE_DIET_TAG_PREFIX = "diet:";

/** Dietas que se pueden etiquetar en una receta (excluye «sin restricciones»). */
export const ASSIGNABLE_RECIPE_DIETS = PREFERRED_DIETS.filter(
  (item) => item.id !== "estandar"
);

export type AssignableRecipeDiet = (typeof ASSIGNABLE_RECIPE_DIETS)[number]["id"];

const ASSIGNABLE_IDS = new Set<string>(ASSIGNABLE_RECIPE_DIETS.map((item) => item.id));

const DIET_TAG_PATTERN = /^diet:([a-z0-9_]+)$/i;

export function recipeDietTag(diet: AssignableRecipeDiet): string {
  return `${RECIPE_DIET_TAG_PREFIX}${diet}`;
}

export function parseRecipeDietTag(tag: string): AssignableRecipeDiet | null {
  const match = DIET_TAG_PATTERN.exec(tag.trim());
  if (!match) return null;
  const id = match[1]?.toLowerCase() ?? "";
  return ASSIGNABLE_IDS.has(id) ? (id as AssignableRecipeDiet) : null;
}

export function parseAssignableRecipeDiets(raw: unknown): AssignableRecipeDiet[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<AssignableRecipeDiet>();
  const result: AssignableRecipeDiet[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().toLowerCase();
    const diet =
      parseRecipeDietTag(item) ??
      (ASSIGNABLE_IDS.has(normalized) ? (normalized as AssignableRecipeDiet) : null);
    if (!diet || seen.has(diet)) continue;
    seen.add(diet);
    result.push(diet);
  }

  return result;
}

/** Lee dietas canónicas desde `tags` de la receta. */
export function getRecipeDietsFromTags(tags: unknown): AssignableRecipeDiet[] {
  return parseAssignableRecipeDiets(normalizeRecipeTags(tags));
}

/**
 * Sustituye las etiquetas `diet:*` (y ids sueltos) por las dietas indicadas.
 * Conserva el resto de tags (comida, airfryer, etc.).
 * Si no hay dietas restrictivas, deja `diet:estandar` como marca de «revisado / sin restricciones».
 */
export function withRecipeDietTags(
  tags: unknown,
  diets: readonly AssignableRecipeDiet[]
): string[] {
  const cleaned = normalizeRecipeTags(tags).filter((tag) => {
    if (parseRecipeDietTag(tag)) return false;
    if (/^diet:estandar$/i.test(tag)) return false;
    if (ASSIGNABLE_IDS.has(tag.toLowerCase())) return false;
    return true;
  });
  const unique = Array.from(new Set(diets));
  if (unique.length === 0) {
    return [...cleaned, `${RECIPE_DIET_TAG_PREFIX}estandar`];
  }
  return [...cleaned, ...unique.map(recipeDietTag)];
}

/** ¿Hay alguna etiqueta diet:* (incluye estandar = revisado)? */
export function hasRecipeDietAssignment(tags: unknown): boolean {
  return normalizeRecipeTags(tags).some(
    (tag) => Boolean(parseRecipeDietTag(tag)) || /^diet:estandar$/i.test(tag)
  );
}

/**
 * Añade dieta del perfil solo si aún no hay asignación canónica.
 * `estandar` / null → marca `diet:estandar`. Restrictiva → `diet:{id}`.
 */
export function stampPreferredDietOntoTags(
  tags: unknown,
  preferredDiet: PreferredDiet | null | undefined
): string[] {
  if (hasRecipeDietAssignment(tags)) {
    return normalizeRecipeTags(tags);
  }
  if (!preferredDiet || preferredDiet === "estandar") {
    return withRecipeDietTags(tags, []);
  }
  return withRecipeDietTags(tags, [preferredDiet]);
}

export function assignableRecipeDietLabel(diet: AssignableRecipeDiet): string {
  return (
    ASSIGNABLE_RECIPE_DIETS.find((item) => item.id === diet)?.fallbackLabel ?? diet
  );
}

export function parsePreferredDietList(raw: unknown): AssignableRecipeDiet[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<AssignableRecipeDiet>();
  const result: AssignableRecipeDiet[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim().toLowerCase();
    if (!ASSIGNABLE_IDS.has(id) || seen.has(id as AssignableRecipeDiet)) continue;
    seen.add(id as AssignableRecipeDiet);
    result.push(id as AssignableRecipeDiet);
  }

  return result;
}
