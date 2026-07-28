"use client";

import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import { useTranslations } from "next-intl";
import {
  NUTRITION_PROFILE_SELECT,
  isNutritionProfileComplete,
  type NutritionProfileRow
} from "@/lib/nutrition/nutrition-profile";
import {
  resolveNutritionTargets,
  type ActivityLevel,
  type BiologicalSex,
  type NutritionGoalType
} from "@/lib/nutrition/tdee";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";

const selectClassName =
  "h-9 w-full appearance-none rounded-lg border border-stone-200 bg-white px-2.5 pr-8 text-[12px] text-stone-800 focus:border-[#4c6633]/35 focus:outline-none focus:ring-2 focus:ring-[#4c6633]/10";

const inputClassName =
  "h-9 rounded-lg border-stone-200 bg-white px-2.5 text-[12px] focus-visible:border-[#4c6633]/35 focus-visible:ring-[#4c6633]/10";

const fieldLabelClassName = "text-[11px] font-medium text-stone-600";

export type NutritionGoalsFormHandle = {
  /** Campos nutricionales listos para el update de `profiles`. */
  getPayload: () => NutritionProfileRow;
};

type NutritionGoalsFormProps = {
  userId: string;
  apiRef?: MutableRefObject<NutritionGoalsFormHandle | null>;
};

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function NutritionGoalsForm({ userId, apiRef }: NutritionGoalsFormProps) {
  const t = useTranslations("Profile");
  const [isLoading, setIsLoading] = useState(true);
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [sex, setSex] = useState<BiologicalSex | "">("");
  const [activity, setActivity] = useState<ActivityLevel | "">("");
  const [goal, setGoal] = useState<NutritionGoalType | "">("");
  const [calorieOverride, setCalorieOverride] = useState("");
  const [proteinOverride, setProteinOverride] = useState("");

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      getPayload: () => ({
        weight_kg: toNumberOrNull(weightKg),
        height_cm: toNumberOrNull(heightCm),
        age_years: toNumberOrNull(ageYears),
        biological_sex: sex || null,
        activity_level: activity || null,
        nutrition_goal: goal || null,
        calorie_goal_override: toNumberOrNull(calorieOverride),
        protein_goal_override: toNumberOrNull(proteinOverride)
      })
    };
    return () => {
      apiRef.current = null;
    };
  }, [
    apiRef,
    weightKg,
    heightCm,
    ageYears,
    sex,
    activity,
    goal,
    calorieOverride,
    proteinOverride
  ]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const supabase = createSupabaseClient();
        const { data } = await supabase
          .from("profiles")
          .select(NUTRITION_PROFILE_SELECT)
          .eq("id", userId)
          .maybeSingle();
        if (cancelled || !data) return;
        const row = data as NutritionProfileRow;
        setWeightKg(row.weight_kg != null ? String(row.weight_kg) : "");
        setHeightCm(row.height_cm != null ? String(row.height_cm) : "");
        setAgeYears(row.age_years != null ? String(row.age_years) : "");
        setSex(row.biological_sex ?? "");
        setActivity(row.activity_level ?? "");
        setGoal(row.nutrition_goal ?? "");
        setCalorieOverride(
          row.calorie_goal_override != null ? String(row.calorie_goal_override) : ""
        );
        setProteinOverride(
          row.protein_goal_override != null ? String(row.protein_goal_override) : ""
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const preview = useMemo(() => {
    const w = toNumberOrNull(weightKg);
    const h = toNumberOrNull(heightCm);
    const a = toNumberOrNull(ageYears);
    if (!w || !h || !a || !sex || !activity || !goal) return null;
    try {
      return resolveNutritionTargets({
        weightKg: w,
        heightCm: h,
        ageYears: a,
        biologicalSex: sex,
        activityLevel: activity,
        nutritionGoal: goal,
        calorieGoalOverride: toNumberOrNull(calorieOverride),
        proteinGoalOverride: toNumberOrNull(proteinOverride)
      });
    } catch {
      return null;
    }
  }, [
    weightKg,
    heightCm,
    ageYears,
    sex,
    activity,
    goal,
    calorieOverride,
    proteinOverride
  ]);

  const completeHint = isNutritionProfileComplete({
    weight_kg: toNumberOrNull(weightKg),
    height_cm: toNumberOrNull(heightCm),
    age_years: toNumberOrNull(ageYears),
    biological_sex: sex || null,
    activity_level: activity || null,
    nutrition_goal: goal || null,
    calorie_goal_override: null,
    protein_goal_override: null
  });

  return (
    <section
      id="nutrition-goals"
      className="scroll-mt-24 space-y-2.5 rounded-xl border border-stone-200/80 bg-stone-50/60 p-3"
    >
      <header>
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#556B2F]/80">
          {t.has("nutritionEyebrow") ? t("nutritionEyebrow") : "Metas nutricionales"}
        </p>
        <h2 className="mt-0.5 text-[13px] font-bold leading-tight text-stone-800">
          {t.has("nutritionTitle") ? t("nutritionTitle") : "Tu perfil biológico"}
        </h2>
        <p className="mt-0.5 text-[10px] leading-snug text-stone-500">
          {t.has("nutritionSubtitle")
            ? t("nutritionSubtitle")
            : "Calculamos tu gasto (BMR/TDEE) con Mifflin-St Jeor. Puedes sobrescribir kcal y proteína."}
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-9 rounded-lg bg-stone-100" />
          <div className="h-9 rounded-lg bg-stone-100" />
          <div className="h-9 rounded-lg bg-stone-100" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-0.5">
              <span className={fieldLabelClassName}>
                {t.has("nutritionWeight") ? t("nutritionWeight") : "Peso (kg)"}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={30}
                max={300}
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="space-y-0.5">
              <span className={fieldLabelClassName}>
                {t.has("nutritionHeight") ? t("nutritionHeight") : "Estatura (cm)"}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={120}
                max={230}
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="space-y-0.5">
              <span className={fieldLabelClassName}>
                {t.has("nutritionAge") ? t("nutritionAge") : "Edad"}
              </span>
              <Input
                type="number"
                inputMode="numeric"
                min={14}
                max={100}
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="space-y-0.5">
              <span className={fieldLabelClassName}>
                {t.has("nutritionSex") ? t("nutritionSex") : "Sexo biológico"}
              </span>
              <div className="relative">
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as BiologicalSex | "")}
                  className={selectClassName}
                >
                  <option value="">
                    {t.has("nutritionSelect") ? t("nutritionSelect") : "Selecciona"}
                  </option>
                  <option value="female">
                    {t.has("nutritionSexFemale") ? t("nutritionSexFemale") : "Mujer"}
                  </option>
                  <option value="male">
                    {t.has("nutritionSexMale") ? t("nutritionSexMale") : "Hombre"}
                  </option>
                </select>
              </div>
            </label>
          </div>

          <label className="block space-y-0.5">
            <span className={fieldLabelClassName}>
              {t.has("nutritionActivity") ? t("nutritionActivity") : "Nivel de actividad"}
            </span>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityLevel | "")}
              className={selectClassName}
            >
              <option value="">
                {t.has("nutritionSelect") ? t("nutritionSelect") : "Selecciona"}
              </option>
              <option value="sedentary">
                {t.has("nutritionActivitySedentary")
                  ? t("nutritionActivitySedentary")
                  : "Sedentario"}
              </option>
              <option value="light">
                {t.has("nutritionActivityLight")
                  ? t("nutritionActivityLight")
                  : "Ligero (1–3 días/sem)"}
              </option>
              <option value="moderate">
                {t.has("nutritionActivityModerate")
                  ? t("nutritionActivityModerate")
                  : "Moderado (3–5 días/sem)"}
              </option>
              <option value="active">
                {t.has("nutritionActivityActive")
                  ? t("nutritionActivityActive")
                  : "Activo (6–7 días/sem)"}
              </option>
              <option value="very_active">
                {t.has("nutritionActivityVeryActive")
                  ? t("nutritionActivityVeryActive")
                  : "Muy activo"}
              </option>
            </select>
          </label>

          <label className="block space-y-0.5">
            <span className={fieldLabelClassName}>
              {t.has("nutritionGoal") ? t("nutritionGoal") : "Objetivo"}
            </span>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as NutritionGoalType | "")}
              className={selectClassName}
            >
              <option value="">
                {t.has("nutritionSelect") ? t("nutritionSelect") : "Selecciona"}
              </option>
              <option value="deficit">
                {t.has("nutritionGoalDeficit")
                  ? t("nutritionGoalDeficit")
                  : "Pérdida de grasa (déficit)"}
              </option>
              <option value="maintenance">
                {t.has("nutritionGoalMaintenance")
                  ? t("nutritionGoalMaintenance")
                  : "Mantenimiento"}
              </option>
              <option value="surplus">
                {t.has("nutritionGoalSurplus")
                  ? t("nutritionGoalSurplus")
                  : "Ganancia muscular (superávit)"}
              </option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-0.5">
              <span className={fieldLabelClassName}>
                {t.has("nutritionCalorieOverride")
                  ? t("nutritionCalorieOverride")
                  : "Meta kcal (opcional)"}
              </span>
              <Input
                type="number"
                inputMode="numeric"
                min={1000}
                max={5000}
                placeholder={preview ? String(preview.calorieTarget) : "—"}
                value={calorieOverride}
                onChange={(e) => setCalorieOverride(e.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="space-y-0.5">
              <span className={fieldLabelClassName}>
                {t.has("nutritionProteinOverride")
                  ? t("nutritionProteinOverride")
                  : "Meta proteína g (opcional)"}
              </span>
              <Input
                type="number"
                inputMode="numeric"
                min={30}
                max={300}
                placeholder={preview ? String(preview.proteinTarget) : "—"}
                value={proteinOverride}
                onChange={(e) => setProteinOverride(e.target.value)}
                className={inputClassName}
              />
            </label>
          </div>

          {preview ? (
            <div className="rounded-lg bg-[#556B2F]/8 px-2.5 py-2 text-[10px] leading-snug text-stone-700 ring-1 ring-[#556B2F]/15">
              <p className="font-semibold text-[#3e5219]">
                {t.has("nutritionPreviewTitle")
                  ? t("nutritionPreviewTitle")
                  : "Estimación actual"}
              </p>
              <p className="mt-0.5">
                BMR ~{preview.bmr} kcal · TDEE ~{preview.tdee} kcal · Meta{" "}
                <strong>{preview.calorieTarget} kcal</strong> · Prot{" "}
                <strong>{preview.proteinTarget} g</strong>
              </p>
              {!completeHint ? (
                <p className="mt-0.5 text-amber-800">
                  {t.has("nutritionIncompleteHint")
                    ? t("nutritionIncompleteHint")
                    : "Completa todos los campos obligatorios para activar el análisis personalizado."}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
