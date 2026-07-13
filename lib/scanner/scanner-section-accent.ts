import { MEAL_TYPE_SUBTLE_ACCENTS } from "@/lib/plan/meal-type-accent";

/** Acentos del plan semanal reutilizados en el escáner (misma paleta Desayuno / Almuerzo / Cena). */
export const SCANNER_SECTION_ACCENTS = {
  favoritos: MEAL_TYPE_SUBTLE_ACCENTS.Almuerzo,
  filtros: MEAL_TYPE_SUBTLE_ACCENTS.Desayuno
} as const;
