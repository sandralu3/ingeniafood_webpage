export type PremiumStoryKind = "analysis" | "sandra_tip" | "viral_dish";

export type PremiumStory = {
  id: string;
  kind: PremiumStoryKind;
  /** Etiqueta corta bajo el círculo (carrusel). */
  ringLabel: string;
  title: string;
  body: string;
  badge?: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

export type PremiumStoriesNutritionContext = {
  totalKcal: number;
  plannedMealCount: number;
  hasVegetables: boolean;
  hasProtein: boolean;
  mealTitles: string[];
};

export type PremiumStoriesPayload = {
  dateKey: string;
  pantryFingerprint: string;
  /** Huella del menú/balance del día; invalida insights si el plan cambia. */
  nutritionFingerprint: string;
  expiresAt: number;
  generatedAt: string;
  stories: PremiumStory[];
  fromCache?: boolean;
};

export const PREMIUM_STORIES_COUNT = 3;
