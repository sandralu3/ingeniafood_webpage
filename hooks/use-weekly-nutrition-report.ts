"use client";

import { useCallback, useState } from "react";
import { fetchUserNutritionGoals } from "@/lib/nutrition/nutrition-profile";
import {
  buildWeeklyNutritionReport,
  type WeeklyNutritionReport
} from "@/lib/nutrition/weekly-nutrition-report";
import { fetchWeeklyPlan } from "@/lib/plan/plan-service";
import { getMondayOfWeek, toISODateString } from "@/lib/plan/week-utils";

type Options = {
  userId: string | null | undefined;
  /** Lunes de la semana a informar. Por defecto: semana actual. */
  weekStart?: Date | null;
};

export function useWeeklyNutritionReport({ userId, weekStart = null }: Options) {
  const [report, setReport] = useState<WeeklyNutritionReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setReport(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const monday = weekStart ? getMondayOfWeek(weekStart) : getMondayOfWeek(new Date());
      const weekStartISO = toISODateString(monday);
      const [{ days }, goals] = await Promise.all([
        fetchWeeklyPlan(userId, monday),
        fetchUserNutritionGoals(userId)
      ]);
      setReport(buildWeeklyNutritionReport(days, goals, weekStartISO));
    } catch (err) {
      console.error("[weekly-nutrition-report]", err);
      setError("No pudimos cargar el informe semanal.");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, weekStart]);

  return {
    report,
    isLoading,
    error,
    refresh
  };
}
