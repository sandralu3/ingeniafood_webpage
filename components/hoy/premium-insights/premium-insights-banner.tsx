"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePremium } from "@/hooks/use-premium";
import { usePremiumStories } from "@/hooks/use-premium-stories";
import type { HoyPageData } from "@/lib/gamification/hoy-page-data";
import type { PremiumStory, PremiumStoryKind } from "@/lib/premium-stories/types";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

type PremiumHoyHeroProps = {
  data: HoyPageData | null;
  displayName?: string | null;
  className?: string;
};

const CARD_EMOJI: Record<PremiumStoryKind, string> = {
  analysis: "📊",
  sandra_tip: "💡",
  viral_dish: "🔥"
};

const CARD_TITLE_FALLBACK: Record<PremiumStoryKind, string> = {
  analysis: "Análisis del Día",
  sandra_tip: "Tip de Sandra",
  viral_dish: "Plato Viral / Idea"
};

function InsightCard({ story }: { story: PremiumStory }) {
  const title =
    story.kind === "analysis"
      ? CARD_TITLE_FALLBACK.analysis
      : story.kind === "sandra_tip"
        ? CARD_TITLE_FALLBACK.sandra_tip
        : story.title?.trim() || CARD_TITLE_FALLBACK.viral_dish;

  return (
    <article className="flex w-full min-w-full shrink-0 snap-center flex-col gap-0.5 rounded-xl bg-white/70 px-3 py-2 shadow-sm shadow-stone-100/40 ring-1 ring-white/80 backdrop-blur-[2px]">
      <p className="text-[11px] font-bold leading-snug text-stone-900">
        <span className="mr-1" aria-hidden>
          {CARD_EMOJI[story.kind]}
        </span>
        {title}
      </p>
      <p
        className={cn(
          "text-[11px] leading-snug text-stone-600",
          story.kind === "sandra_tip" ? "line-clamp-5" : "line-clamp-3"
        )}
      >
        {story.body}
      </p>
      {story.ctaLabel && story.ctaHref ? (
        <Link
          href={story.ctaHref}
          className="mt-0 inline-flex w-fit text-[10px] font-semibold leading-tight text-[#556B2F] underline-offset-2 hover:underline"
        >
          {story.ctaLabel} →
        </Link>
      ) : null}
    </article>
  );
}

/**
 * Hero Premium: fondo pastel + carrusel de 3 insights + CTA escanear.
 */
export function PremiumHoyHero({ data, className }: PremiumHoyHeroProps) {
  const t = useTranslations("Hoy");
  const { isPremium, isLoading: isPremiumLoading, userId } = usePremium();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const update = () => {
      const children = Array.from(node.children) as HTMLElement[];
      if (children.length === 0) return;
      const scrollLeft = node.scrollLeft;
      let nearest = 0;
      let best = Number.POSITIVE_INFINITY;
      children.forEach((child, index) => {
        const distance = Math.abs(child.offsetLeft - scrollLeft);
        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });
      setActiveIndex(nearest);
    };

    update();
    node.addEventListener("scroll", update, { passive: true });
    return () => node.removeEventListener("scroll", update);
  }, [stories.length]);

  if (isPremiumLoading || !isPremium) {
    return null;
  }

  if (isLoading && stories.length === 0) {
    return (
      <div
        className={cn(
          "w-full animate-pulse rounded-2xl border border-emerald-100/40 bg-gradient-to-r from-[#E8F5EF] via-[#F3F8EC] to-[#FBF6E8] px-3 py-2.5",
          className
        )}
        aria-hidden
      >
        <div className="mb-2 h-2.5 w-36 rounded bg-emerald-100/80" />
        <div className="mb-2 h-14 rounded-xl bg-white/60" />
        <div className="mx-auto h-8 w-40 rounded-full bg-white/70" />
      </div>
    );
  }

  if (stories.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-emerald-100/50 bg-gradient-to-br from-[#E6F4EE] via-[#F2F7EC] to-[#FBF4E4] px-3 py-2.5 shadow-sm shadow-emerald-900/5",
        className
      )}
    >
      <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#7A8F5C]">
        {t.has("premiumInsightsBadge")
          ? t("premiumInsightsBadge")
          : "✨ Ingenia AI Insights · Premium"}
      </p>

      <div
        ref={scrollerRef}
        className="no-scrollbar flex w-full snap-x snap-mandatory flex-row gap-3 overflow-x-auto"
        role="list"
        aria-label={
          t.has("premiumInsightsAria")
            ? t("premiumInsightsAria")
            : "Insights de nutrición Premium"
        }
      >
        {stories.map((story) => (
          <div key={story.id} role="listitem" className="w-full min-w-full shrink-0 snap-center">
            <InsightCard story={story} />
          </div>
        ))}
      </div>

      <div
        className="mt-1.5 flex items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Slides"
      >
        {stories.map((story, index) => (
          <button
            key={story.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Insight ${index + 1}`}
            onClick={() => {
              const child = scrollerRef.current?.children[index] as HTMLElement | undefined;
              child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
              setActiveIndex(index);
            }}
            className={cn(
              "h-1 w-1 rounded-full transition-colors",
              index === activeIndex ? "bg-stone-500" : "bg-stone-300"
            )}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-center">
        <Link
          href={APP_ROUTES.scanner}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#556B2F] px-3.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#3e5219]"
        >
          <ScanLine className="h-3.5 w-3.5" strokeWidth={2} />
          {t.has("premiumHeroScanCta") ? t("premiumHeroScanCta") : "📸 Escanear Despensa"}
        </Link>
      </div>
    </section>
  );
}

/** @deprecated Usa PremiumHoyHero */
export { PremiumHoyHero as PremiumInsightsBanner };
