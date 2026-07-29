"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildDeterministicIntelligentDose } from "@/lib/premium-stories/build-deterministic-intelligent-dose";
import {
  buildIntelligentDoseUserContext,
  indexPlanDaysByIso,
  mondayIsosForDoseWindow,
  type IntelligentDoseReport,
  type IntelligentDoseUserContext
} from "@/lib/premium-stories/intelligent-dose-context";
import { fetchUserNutritionGoals } from "@/lib/nutrition/nutrition-profile";
import { fetchWeeklyPlan } from "@/lib/plan/plan-service";
import { parseISODateToLocalDate, toISODateString } from "@/lib/plan/week-utils";
import type { PlanDay } from "@/lib/plan/types";

type UseIntelligentDoseParams = {
  enabled: boolean;
  userId: string | null;
  firstName?: string | null;
  /**
   * Firma del plan de hoy (kcal, comidas, snacks, fetchedAt).
   * Cuando cambia tras la primera carga, se recalcula la dosis.
   */
  planRevision?: string | null;
};

type UseIntelligentDoseResult = {
  report: IntelligentDoseReport | null;
  context: IntelligentDoseUserContext | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

async function loadPlanDaysForDoseWindow(userId: string): Promise<Map<string, PlanDay>> {
  const mondayIsos = mondayIsosForDoseWindow();
  const maps = await Promise.all(
    mondayIsos.map(async (weekStartIso) => {
      const weekStart = parseISODateToLocalDate(weekStartIso);
      const { days } = await fetchWeeklyPlan(userId, weekStart);
      return indexPlanDaysByIso(days, weekStartIso);
    })
  );

  const merged = new Map<string, PlanDay>();
  for (const map of maps) {
    Array.from(map.entries()).forEach(([iso, day]) => {
      merged.set(iso, day);
    });
  }
  return merged;
}

export function useIntelligentDose({
  enabled,
  userId,
  firstName,
  planRevision = null
}: UseIntelligentDoseParams): UseIntelligentDoseResult {
  const [report, setReport] = useState<IntelligentDoseReport | null>(null);
  const [context, setContext] = useState<IntelligentDoseUserContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);
  /** undefined = aún no vimos planRevision; evita doble fetch en el mount. */
  const seenPlanRevisionRef = useRef<string | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setReport(null);
      setContext(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const gen = ++genRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const [planDaysByIso, nutrition] = await Promise.all([
        loadPlanDaysForDoseWindow(userId),
        fetchUserNutritionGoals(userId)
      ]);
      if (gen !== genRef.current) return;

      const nextContext = buildIntelligentDoseUserContext({
        planDaysByIso,
        todayIso: toISODateString(new Date()),
        firstName,
        nutritionGoals: {
          isComplete: nutrition.isComplete,
          calorieTarget: nutrition.calorieTarget,
          proteinTarget: nutrition.proteinTarget,
          source: nutrition.source,
          bmr: nutrition.bmr,
          tdee: nutrition.tdee
        }
      });
      setContext(nextContext);

      // Preview inmediata coherente; luego refinamos con IA.
      const localReport = buildDeterministicIntelligentDose(nextContext);
      setReport(localReport);

      const response = await fetch("/api/intelligent-dose", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: nextContext })
      });

      if (gen !== genRef.current) return;

      const payload = (await response.json()) as {
        error?: string;
        report?: IntelligentDoseReport;
      };

      if (!response.ok || !payload.report) {
        setError(payload.error ?? "No pudimos generar el informe.");
        return;
      }

      setReport(payload.report);
    } catch (err) {
      if (gen !== genRef.current) return;
      console.error("[intelligent-dose] load:", err);
      setError("No pudimos generar el informe.");
    } finally {
      if (gen === genRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, userId, firstName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !userId) {
      seenPlanRevisionRef.current = undefined;
      return;
    }
    if (planRevision == null || planRevision === "") return;

    if (seenPlanRevisionRef.current === undefined) {
      seenPlanRevisionRef.current = planRevision;
      return;
    }
    if (seenPlanRevisionRef.current === planRevision) return;
    seenPlanRevisionRef.current = planRevision;
    void refresh();
  }, [enabled, planRevision, refresh, userId]);

  return { report, context, isLoading, error, refresh };
}
