"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { buildFallbackPremiumStories } from "@/lib/premium-stories/fallback-stories";
import { getActivePantryIngredients } from "@/lib/premium-stories/get-active-pantry";
import {
  buildNutritionFingerprint,
  buildPantryFingerprint,
  endOfLocalDayMs,
  premiumStoriesDateKey,
  readPremiumStoriesCache,
  writePremiumStoriesCache
} from "@/lib/premium-stories/stories-cache";
import type {
  PremiumStoriesNutritionContext,
  PremiumStoriesPayload,
  PremiumStory
} from "@/lib/premium-stories/types";

type UsePremiumStoriesParams = {
  enabled: boolean;
  userId: string | null;
  nutrition: PremiumStoriesNutritionContext;
};

type UsePremiumStoriesResult = {
  stories: PremiumStory[];
  isLoading: boolean;
  error: string | null;
  fromCache: boolean;
  refresh: () => Promise<void>;
};

export function usePremiumStories({
  enabled,
  userId,
  nutrition
}: UsePremiumStoriesParams): UsePremiumStoriesResult {
  const [stories, setStories] = useState<PremiumStory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const nutritionRef = useRef(nutrition);
  nutritionRef.current = nutrition;
  const fetchGenRef = useRef(0);

  const nutritionFingerprint = useMemo(
    () => buildNutritionFingerprint(nutrition),
    [
      nutrition.plannedMealCount,
      nutrition.totalKcal,
      nutrition.hasVegetables,
      nutrition.hasProtein,
      nutrition.mealTitles.join("\0")
    ]
  );

  const load = useCallback(async () => {
    if (!enabled || !userId) {
      setStories([]);
      setIsLoading(false);
      setFromCache(false);
      setError(null);
      return;
    }

    const gen = ++fetchGenRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const pantry = await getActivePantryIngredients(supabase, userId);
      if (gen !== fetchGenRef.current) return;

      const pantryFingerprint = buildPantryFingerprint(pantry.ids);
      const cached = readPremiumStoriesCache(
        userId,
        pantryFingerprint,
        nutritionFingerprint
      );
      if (cached) {
        const nutritionNow = nutritionRef.current;
        if (nutritionNow.plannedMealCount === 0) {
          const emptyMenuFallback = buildFallbackPremiumStories(
            nutritionNow,
            pantry.names
          );
          setStories(
            cached.stories.map((story) => {
              if (story.kind === "analysis") return emptyMenuFallback[0];
              if (story.kind === "sandra_tip") return emptyMenuFallback[1];
              return story;
            })
          );
        } else {
          setStories(cached.stories);
        }
        setFromCache(true);
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/premium-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nutrition: nutritionRef.current })
      });

      if (gen !== fetchGenRef.current) return;

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (response.status === 403) {
          setStories([]);
          setError(null);
          setIsLoading(false);
          return;
        }
        throw new Error(payload?.error ?? "No pudimos cargar las historias.");
      }

      const payload = (await response.json()) as PremiumStoriesPayload & {
        stories: PremiumStory[];
      };

      const next: PremiumStoriesPayload = {
        dateKey: payload.dateKey || premiumStoriesDateKey(),
        pantryFingerprint: payload.pantryFingerprint || pantryFingerprint,
        nutritionFingerprint,
        expiresAt: payload.expiresAt || endOfLocalDayMs(),
        generatedAt: payload.generatedAt || new Date().toISOString(),
        stories:
          payload.stories?.length > 0
            ? payload.stories
            : buildFallbackPremiumStories(nutritionRef.current, pantry.names)
      };

      writePremiumStoriesCache(userId, next);
      setStories(next.stories);
      setFromCache(false);
    } catch (err) {
      if (gen !== fetchGenRef.current) return;
      console.error("[premium-stories] load:", err);
      try {
        const supabase = createSupabaseClient();
        const pantry = await getActivePantryIngredients(supabase, userId);
        setStories(buildFallbackPremiumStories(nutritionRef.current, pantry.names));
      } catch {
        setStories(buildFallbackPremiumStories(nutritionRef.current, []));
      }
      setFromCache(false);
      setError(err instanceof Error ? err.message : "Error cargando historias.");
    } finally {
      if (gen === fetchGenRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, userId, nutritionFingerprint]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    stories,
    isLoading,
    error,
    fromCache,
    refresh: load
  };
}
