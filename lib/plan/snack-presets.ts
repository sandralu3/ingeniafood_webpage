import type { WeekDay } from "@/lib/plan/constants";

export type PlanSnackSource = "text" | "photo" | "quick";

export type PlanSnack = {
  id: string;
  title: string;
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  imageUrl?: string | null;
  source: PlanSnackSource;
  emoji?: string | null;
  dayLabel?: WeekDay;
};

export type SnackPreset = {
  id: string;
  emoji: string;
  title: string;
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

/** Chips de 1 toque: macros típicos, sin IA. */
export const SNACK_PRESETS: SnackPreset[] = [
  {
    id: "apple",
    emoji: "🍎",
    title: "Manzana",
    kcal: 80,
    proteinGrams: 0,
    carbsGrams: 21,
    fatGrams: 0
  },
  {
    id: "nuts30",
    emoji: "🥜",
    title: "Nueces (30g)",
    kcal: 200,
    proteinGrams: 5,
    carbsGrams: 4,
    fatGrams: 20
  },
  {
    id: "greek-yogurt",
    emoji: "🥛",
    title: "Yogur griego",
    kcal: 130,
    proteinGrams: 15,
    carbsGrams: 6,
    fatGrams: 4
  },
  {
    id: "coffee",
    emoji: "☕",
    title: "Café",
    kcal: 5,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0
  },
  {
    id: "banana",
    emoji: "🍌",
    title: "Plátano",
    kcal: 105,
    proteinGrams: 1,
    carbsGrams: 27,
    fatGrams: 0
  },
  {
    id: "dark-chocolate",
    emoji: "🍫",
    title: "Chocolate negro (20g)",
    kcal: 110,
    proteinGrams: 2,
    carbsGrams: 10,
    fatGrams: 7
  }
];

export function findSnackPreset(presetId: string): SnackPreset | null {
  return SNACK_PRESETS.find((item) => item.id === presetId) ?? null;
}
