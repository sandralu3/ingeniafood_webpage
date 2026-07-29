import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";

export const EXTERNAL_MEAL_BADGE = {
  comida_fuera: "comida_fuera",
  escaneado: "escaneado"
} as const;

export type ExternalMealBadge =
  (typeof EXTERNAL_MEAL_BADGE)[keyof typeof EXTERNAL_MEAL_BADGE];

export type ExternalMealEstimate = {
  nombre_plato: string;
  calorias_est: number;
  proteinas_est_g: number;
  tiene_vegetales: boolean;
  badge: ExternalMealBadge;
};

export const EXTERNAL_MEAL_TAG = "comida_fuera";
export const SCANNED_MEAL_TAG = "escaneado";
export const HAS_VEGETABLES_TAG = "tiene_vegetales";

export function isExternalMealBadge(value: unknown): value is ExternalMealBadge {
  return value === "comida_fuera" || value === "escaneado";
}

export function resolveExternalMealBadge(tags: unknown): ExternalMealBadge | null {
  const list = normalizeRecipeTags(tags).map((tag) => tag.toLowerCase());
  if (list.includes(SCANNED_MEAL_TAG)) return "escaneado";
  if (list.includes(EXTERNAL_MEAL_TAG) || list.includes("comida fuera")) return "comida_fuera";
  return null;
}

/** True when the recipe is a synthetic out-of-home meal (not a cookable recipe). */
export function isExternalMeal(tags: unknown): boolean {
  return resolveExternalMealBadge(tags) != null;
}

export function externalMealBadgeLabel(badge: ExternalMealBadge): string {
  return badge === "escaneado" ? "📸 Escaneado" : "📍 Comida fuera";
}

export function buildExternalMealTags(estimate: ExternalMealEstimate): string[] {
  const tags = [EXTERNAL_MEAL_TAG];
  if (estimate.badge === "escaneado") tags.push(SCANNED_MEAL_TAG);
  if (estimate.tiene_vegetales) tags.push(HAS_VEGETABLES_TAG);
  return tags;
}
