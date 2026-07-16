"use client";

import Link from "next/link";
import { Check, Egg, Flame, Leaf } from "lucide-react";
import { HoySection } from "@/components/hoy/hoy-section-header";
import type { HoyPageData } from "@/lib/gamification/hoy-page-data";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

type TodayPlanNutritionProps = {
  data: HoyPageData | null;
  className?: string;
};

type PlanSignalProps = {
  icon: typeof Leaf;
  label: string;
  active: boolean;
  activeHint: string;
  inactiveHint: string;
  tone: "green" | "amber";
};

function PlanNutritionSignal({
  icon: Icon,
  label,
  active,
  activeHint,
  inactiveHint,
  tone
}: PlanSignalProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl px-2.5 py-2",
        active
          ? tone === "green"
            ? "bg-emerald-50/80"
            : "bg-amber-50/70"
          : "border border-dashed border-stone-200 bg-stone-50/60"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          active
            ? tone === "green"
              ? "bg-white text-emerald-700 shadow-sm"
              : "bg-white text-amber-800 shadow-sm"
            : "bg-white text-stone-400"
        )}
      >
        {active ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Icon className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-stone-800">{label}</p>
        <p className="text-[10px] leading-snug text-stone-500">{active ? activeHint : inactiveHint}</p>
      </div>
    </div>
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

          <div className="space-y-1.5">
            <PlanNutritionSignal
              icon={Leaf}
              label="Vegetales en el plan"
              active={nutrition.hasVegetables}
              activeHint="Tus recetas de hoy incluyen verduras o vegetales"
              inactiveHint="Añade una receta con vegetales al plan de hoy"
              tone="green"
            />
            <PlanNutritionSignal
              icon={Egg}
              label="Proteína en el desayuno"
              active={nutrition.hasProteinBreakfast}
              activeHint="Tu desayuno planificado aporta proteína"
              inactiveHint="Planifica un desayuno con huevo, yogur, legumbres u otra proteína"
              tone="amber"
            />
          </div>
        </>
      )}
    </HoySection>
  );
}
