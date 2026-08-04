"use client";

import { useMemo, useState } from "react";
import { ChefHat, Lightbulb, LineChart } from "lucide-react";
import { useTranslations } from "next-intl";
import { PremiumStoryViewer } from "@/components/hoy/premium-stories/premium-story-viewer";
import { usePremium } from "@/hooks/use-premium";
import { usePremiumStories } from "@/hooks/use-premium-stories";
import type { HoyPageData } from "@/lib/gamification/hoy-page-data";
import type { PremiumStoryKind } from "@/lib/premium-stories/types";
import { cn } from "@/lib/utils";

type PremiumStoriesProps = {
  data: HoyPageData | null;
  className?: string;
};

const RING_ICON: Record<
  PremiumStoryKind,
  typeof LineChart
> = {
  analysis: LineChart,
  sandra_tip: Lightbulb,
  viral_dish: ChefHat
};

/**
 * Historias de Nutrición (estilo Instagram) — solo Premium.
 * Caché diaria local + 1 llamada IA/día; se invalida al cambiar la despensa.
 */
export function PremiumStories({ data, className }: PremiumStoriesProps) {
  const t = useTranslations("Hoy");
  const { isPremium, isLoading: isPremiumLoading, userId } = usePremium();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const nutrition = useMemo(
    () => ({
      totalKcal: data?.todayPlanNutrition.totalKcal ?? 0,
      plannedMealCount: data?.todayPlanNutrition.plannedMealCount ?? 0,
      hasVegetables: Boolean(data?.todayPlanNutrition.hasVegetables),
      hasProtein: Boolean(data?.todayPlanNutrition.hasProtein),
      mealTitles: (data?.todayPlanMeals ?? [])
        .flatMap((slot) => slot.meals ?? [])
        .map((meal) => meal.title)
        .filter((title): title is string => Boolean(title))
        .slice(0, 6)
    }),
    [data]
  );

  const { stories, isLoading } = usePremiumStories({
    enabled: isPremium && !isPremiumLoading,
    userId,
    nutrition
  });

  if (isPremiumLoading || !isPremium) {
    return null;
  }

  if (isLoading && stories.length === 0) {
    return (
      <div
        className={cn("no-scrollbar flex flex-row gap-4 overflow-x-auto py-2", className)}
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5">
            <div className="h-16 w-16 animate-pulse rounded-full bg-stone-200/80" />
            <div className="h-2 w-12 animate-pulse rounded bg-stone-200/70" />
          </div>
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("py-1", className)}>
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#8B6914]/90">
          {t.has("premiumStoriesEyebrow")
            ? t("premiumStoriesEyebrow")
            : "Historias Premium"}
        </p>
        <div
          className="no-scrollbar flex flex-row gap-4 overflow-x-auto py-2"
          role="list"
          aria-label={
            t.has("premiumStoriesAria")
              ? t("premiumStoriesAria")
              : "Historias de nutrición"
          }
        >
          {stories.map((story, index) => {
            const Icon = RING_ICON[story.kind];
            return (
              <button
                key={story.id}
                type="button"
                role="listitem"
                onClick={() => setViewerIndex(index)}
                className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center"
              >
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full p-[2.5px] shadow-sm"
                  style={{
                    background:
                      "conic-gradient(from 210deg, #C9A227, #F5E6A8, #8B6914, #556B2F, #C9A227)"
                  }}
                >
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
                    <span className="flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-full bg-[#eef4e6] text-[#556B2F]">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                  </span>
                </span>
                <span className="line-clamp-2 max-w-[4.5rem] text-[10px] font-semibold leading-tight text-stone-700">
                  {story.ringLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {viewerIndex != null ? (
        <PremiumStoryViewer
          stories={stories}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </>
  );
}
