export const WEEK_DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo"
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

export const MEAL_TYPES = ["Desayuno", "Almuerzo", "Cena"] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export const WEEK_DAY_SHORT: Record<WeekDay, string> = {
  Lunes: "Lun",
  Martes: "Mar",
  Miércoles: "Mié",
  Jueves: "Jue",
  Viernes: "Vie",
  Sábado: "Sáb",
  Domingo: "Dom"
};

export const WEEK_DAY_SHORT_IDS: Record<WeekDay, string> = {
  Lunes: "mon",
  Martes: "tue",
  Miércoles: "wed",
  Jueves: "thu",
  Viernes: "fri",
  Sábado: "sat",
  Domingo: "sun"
};
