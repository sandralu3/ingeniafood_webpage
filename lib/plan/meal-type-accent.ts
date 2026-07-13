import { Coffee, Soup, Utensils, type LucideIcon } from "lucide-react";
import type { MealType } from "@/lib/plan/constants";

/** Pasteles suaves visibles en móvil; las clases deben vivir en archivos escaneados por Tailwind (lib/ incluido). */
export type MealTypeSubtleAccent = {
  iconCircleBg: string;
  iconRing: string;
  iconText: string;
  dividerText: string;
  dividerLine: string;
};

export const MEAL_TYPE_SUBTLE_ACCENTS: Record<MealType, MealTypeSubtleAccent> = {
  Desayuno: {
    iconCircleBg: "bg-[#F5E6DF]",
    iconRing: "ring-[#E8C4B8]",
    iconText: "text-[#B86B52]",
    dividerText: "text-[#B86B52]",
    dividerLine: "bg-[#E8C4B8]"
  },
  Almuerzo: {
    iconCircleBg: "bg-olive-100",
    iconRing: "ring-olive-200",
    iconText: "text-[#5A7843]",
    dividerText: "text-[#5A7843]",
    dividerLine: "bg-brand-green-light/35"
  },
  Cena: {
    iconCircleBg: "bg-indigo-50",
    iconRing: "ring-indigo-100",
    iconText: "text-indigo-600",
    dividerText: "text-indigo-600",
    dividerLine: "bg-indigo-200"
  }
};

export function getMealTypeIcon(mealType: MealType): LucideIcon {
  switch (mealType) {
    case "Desayuno":
      return Coffee;
    case "Almuerzo":
      return Utensils;
    case "Cena":
      return Soup;
    default:
      return Utensils;
  }
}

export function getMealTypeSubtleAccent(mealType: MealType): MealTypeSubtleAccent {
  return MEAL_TYPE_SUBTLE_ACCENTS[mealType];
}
