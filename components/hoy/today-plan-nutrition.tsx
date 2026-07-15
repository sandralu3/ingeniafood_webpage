"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { HoySection } from "@/components/hoy/hoy-section-header";
import type { HoyPageData } from "@/lib/gamification/hoy-page-data";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

type TodayPlanNutritionProps = {
  data: HoyPageData | null;
  className?: string;
};

function SignalBadge({
  active,
  activeLabel,
  inactiveLabel,
  tone
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  tone: "green" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        active
          ? tone === "green"
            ? "bg-emerald-50 text-emerald-800"
            : "bg-amber-50 text-amber-900"
          : "bg-stone-100 text-stone-500"
      )}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export function TodayPlanNutrition({ data, className }: TodayPlanNutritionProps) {
  const nutrition = data?.todayPlanNutrition;

  if (!nutrition) return null;

  return (
    <HoySection
      className={className}
      title="Plan de hoy"
      subtitle="Calorías y balance según tus comidas planificadas"
      action={
        <Link
          href={APP_ROUTES.plan}
          className="text-[10px] font-semibold text-[#556B2F] transition hover:text-[#3e5219]"
        >
          Ver plan
        </Link>
      }
    >
      {nutrition.plannedMealCount === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-3 py-3 text-center">
          <p className="text-xs font-medium text-stone-700">Aún no tienes comidas en el plan de hoy</p>
          <p className="mt-1 text-[11px] text-stone-500">
            Añade recetas al plan semanal para ver calorías, vegetales y proteínas.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-orange-50/70 px-2.5 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-orange-700 shadow-sm">
              <Flame className="h-4 w-4" />
            </span>
            <div>
              <p className="text-lg font-bold tabular-nums text-stone-900">
                {nutrition.totalKcal}
                <span className="ml-1 text-xs font-semibold text-stone-500">kcal</span>
              </p>
              <p className="text-[10px] text-stone-500">
                Suma estimada de {nutrition.plannedMealCount} comida
                {nutrition.plannedMealCount === 1 ? "" : "s"} planificada
                {nutrition.plannedMealCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <SignalBadge
              active={nutrition.hasVegetables}
              activeLabel="Vegetales en el plan"
              inactiveLabel="Sin vegetales detectados"
              tone="green"
            />
            <SignalBadge
              active={nutrition.hasProtein}
              activeLabel="Proteínas en el plan"
              inactiveLabel="Sin proteínas detectadas"
              tone="amber"
            />
          </div>
        </>
      )}
    </HoySection>
  );
}
