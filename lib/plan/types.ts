import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { MealType, WeekDay } from "@/lib/plan/constants";

export type PlanDaySlots = Record<MealType, PlanMeal | null>;

export type PlanDay = {
  id: string;
  label: WeekDay;
  dateLabel: string;
  isToday?: boolean;
  slots: PlanDaySlots;
};
