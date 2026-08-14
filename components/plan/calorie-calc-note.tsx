"use client";

import { useTranslations } from "next-intl";
import {
  describeShownCalorieSource,
  foodsWereEdited,
  type AiCalculoSnapshot
} from "@/lib/plan/calorie-calc-explain";
import { OpenTextFoodTipsLink } from "@/components/plan/open-text-food-tips-link";
import type { ExternalMealFoodItem } from "@/lib/plan/external-meal";

type Props = {
  shownKcal: number;
  currentFoods: ExternalMealFoodItem[];
  originalFoods: ExternalMealFoodItem[];
  aiCalculo?: AiCalculoSnapshot | null;
  initialOrigen?: "tabla" | "ia" | "texto";
};

export function CalorieCalcNote({
  shownKcal,
  currentFoods,
  originalFoods,
  aiCalculo,
  initialOrigen
}: Props) {
  const t = useTranslations("Plan");
  const edited = foodsWereEdited(originalFoods, currentFoods);
  const shown = describeShownCalorieSource(currentFoods);

  const sourceKind =
    !edited && initialOrigen === "texto"
      ? "texto"
      : shown.kind;

  const sourceLine =
    sourceKind === "texto"
      ? t.has("calorieCalcShownText")
        ? t("calorieCalcShownText", { kcal: shownKcal, detail: shown.detail })
        : `Las ${shownKcal} kcal de ahora salen de lo que escribiste, con valores estándar${shown.detail ? `: ${shown.detail}` : ""}.`
      : sourceKind === "tabla" || sourceKind === "mixto"
        ? t.has("calorieCalcShownCatalog")
          ? t("calorieCalcShownCatalog", { kcal: shownKcal, detail: shown.detail })
          : `Las ${shownKcal} kcal de ahora salen de valores estándar${shown.detail ? `: ${shown.detail}` : ""}.`
        : t.has("calorieCalcShownAi")
          ? t("calorieCalcShownAi", { kcal: shownKcal, detail: shown.detail })
          : `Las ${shownKcal} kcal de ahora salen de la estimación de la IA${shown.detail ? `: ${shown.detail}` : ""}.`;

  const aiName = aiCalculo?.nombre_plato?.trim();
  const aiKcal = aiCalculo?.calorias_est;
  const assumptions = aiCalculo?.assumptions?.trim();
  const showAiLine =
    !edited &&
    Boolean(aiName) &&
    typeof aiKcal === "number" &&
    Number.isFinite(aiKcal);

  if (!showAiLine && !sourceLine) return null;

  return (
    <div className="rounded-xl border border-stone-200/80 bg-stone-50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
        {t.has("calorieCalcTitle")
          ? t("calorieCalcTitle")
          : "De dónde salen las calorías"}
      </p>
      {showAiLine && aiName && typeof aiKcal === "number" ? (
        <p className="mt-1 text-[11px] leading-snug text-stone-600">
          {t.has("calorieCalcAiLine")
            ? t("calorieCalcAiLine", {
                name: aiName,
                kcal: aiKcal
              })
            : `La IA interpretó «${aiName}» y calculó ~${aiKcal} kcal.`}
          {assumptions
            ? t.has("calorieCalcAiAssumptions")
              ? ` ${t("calorieCalcAiAssumptions", { assumptions })}`
              : ` Asumió: ${assumptions}.`
            : null}
        </p>
      ) : null}
      <p className="mt-1 text-[11px] leading-snug text-stone-700">{sourceLine}</p>
      {edited ? (
        <p className="mt-0.5 text-[10px] leading-snug text-stone-500">
          {t.has("calorieCalcShownEdited")
            ? t("calorieCalcShownEdited", { kcal: shownKcal })
            : "Recalculado con las cantidades que ves arriba."}
        </p>
      ) : null}
      <p className="mt-1 text-[10px] leading-snug text-stone-400">
        {t.has("calorieCalcHint")
          ? t("calorieCalcHint")
          : "Si las kcal no cuadran, pulsa Atrás y descríbelo mejor (cantidad, casera, sin azúcar, marca). Aquí solo puedes cambiar cantidad y unidad."}
      </p>
      <OpenTextFoodTipsLink className="mt-1.5 block" />
    </div>
  );
}
