"use client";

import { useEffect, useMemo, useState, type MutableRefObject, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PARAM_CONTROL,
  PARAM_LABEL,
  PARAM_SAVE_BTN,
  PARAM_SECTION,
  PARAM_SELECT
} from "@/components/parametros/parametros-form-styles";
import {
  NUTRITION_PROFILE_SELECT,
  NUTRITION_PROFILE_SELECT_LEGACY,
  isNutritionProfileComplete,
  type NutritionProfileRow
} from "@/lib/nutrition/nutrition-profile";
import {
  PREFERRED_DIETS,
  parsePreferredDiet,
  type PreferredDiet
} from "@/lib/nutrition/preferred-diet";
import {
  resolveNutritionTargets,
  type ActivityLevel,
  type BiologicalSex,
  type NutritionGoalType
} from "@/lib/nutrition/tdee";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type NutritionGoalsFormHandle = {
  getPayload: () => NutritionProfileRow;
};

type NutritionGoalsFormProps = {
  userId: string;
  apiRef?: MutableRefObject<NutritionGoalsFormHandle | null>;
  showSaveButton?: boolean;
  onSaved?: () => void;
};

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function Field({
  label,
  children,
  className
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className={PARAM_LABEL}>{label}</span>
      {children}
    </label>
  );
}

export function NutritionGoalsForm({
  userId,
  apiRef,
  showSaveButton = false,
  onSaved
}: NutritionGoalsFormProps) {
  const t = useTranslations("Profile");
  const tParams = useTranslations("Parametros");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [sex, setSex] = useState<BiologicalSex | "">("");
  const [activity, setActivity] = useState<ActivityLevel | "">("");
  const [goal, setGoal] = useState<NutritionGoalType | "">("");
  const [calorieOverride, setCalorieOverride] = useState("");
  const [proteinOverride, setProteinOverride] = useState("");
  const [preferredDiet, setPreferredDiet] = useState<PreferredDiet>("estandar");

  const getPayload = (): NutritionProfileRow => ({
    weight_kg: toNumberOrNull(weightKg),
    height_cm: toNumberOrNull(heightCm),
    age_years: toNumberOrNull(ageYears),
    biological_sex: sex || null,
    activity_level: activity || null,
    nutrition_goal: goal || null,
    calorie_goal_override: toNumberOrNull(calorieOverride),
    protein_goal_override: toNumberOrNull(proteinOverride),
    preferred_diet: preferredDiet
  });

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = { getPayload };
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
    proteinOverride,
    preferredDiet
  ]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const supabase = createSupabaseClient();
        let data: Partial<NutritionProfileRow> | null = null;

        const primary = await supabase
          .from("profiles")
          .select(NUTRITION_PROFILE_SELECT)
          .eq("id", userId)
          .maybeSingle();

        if (primary.error?.message?.includes("preferred_diet") || primary.error?.code === "PGRST204") {
          const legacy = await supabase
            .from("profiles")
            .select(NUTRITION_PROFILE_SELECT_LEGACY)
            .eq("id", userId)
            .maybeSingle();
          data = (legacy.data as Partial<NutritionProfileRow> | null) ?? null;
        } else {
          data = (primary.data as Partial<NutritionProfileRow> | null) ?? null;
        }

        if (cancelled || !data) return;
        setWeightKg(data.weight_kg != null ? String(data.weight_kg) : "");
        setHeightCm(data.height_cm != null ? String(data.height_cm) : "");
        setAgeYears(data.age_years != null ? String(data.age_years) : "");
        setSex(data.biological_sex ?? "");
        setActivity(data.activity_level ?? "");
        setGoal(data.nutrition_goal ?? "");
        setCalorieOverride(
          data.calorie_goal_override != null ? String(data.calorie_goal_override) : ""
        );
        setProteinOverride(
          data.protein_goal_override != null ? String(data.protein_goal_override) : ""
        );
        setPreferredDiet(parsePreferredDiet(data.preferred_diet));
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

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const supabase = createSupabaseClient();
      const payload = getPayload();
      let { error } = await supabase.from("profiles").update(payload).eq("id", userId);

      if (error?.message?.includes("preferred_diet") || error?.code === "PGRST204") {
        const { preferred_diet: _omit, ...legacyPayload } = payload;
        const legacy = await supabase.from("profiles").update(legacyPayload).eq("id", userId);
        error = legacy.error;
        if (!error) {
          setSaveError(
            tParams.has("dietMigrationNeeded")
              ? tParams("dietMigrationNeeded")
              : "Perfil guardado, pero falta aplicar la migración de tipo de alimentación en Supabase."
          );
          return;
        }
      }

      if (error) {
        console.error("[nutrition-goals] Error guardando:", error);
        setSaveError(
          tParams.has("nutritionSaveError")
            ? tParams("nutritionSaveError")
            : "No pudimos guardar tu perfil nutricional."
        );
        return;
      }

      onSaved?.();
    } catch (error) {
      console.error("[nutrition-goals] Error guardando:", error);
      setSaveError(
        tParams.has("nutritionSaveError")
          ? tParams("nutritionSaveError")
          : "No pudimos guardar tu perfil nutricional."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectPlaceholder = t.has("nutritionSelect") ? t("nutritionSelect") : "Selecciona";

  return (
    <section id="nutrition-goals" className={PARAM_SECTION}>
      <header className="mb-2.5">
        <h2 className="text-[13px] font-bold leading-tight text-stone-800">
          {t.has("nutritionTitle") ? t("nutritionTitle") : "Tu perfil biológico"}
        </h2>
        <p className="mt-0.5 text-[10px] leading-snug text-stone-500">
          {t.has("nutritionSubtitle")
            ? t("nutritionSubtitle")
            : "BMR/TDEE con Mifflin-St Jeor. Puedes sobrescribir kcal y proteína."}
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 animate-pulse">
          <div className="h-9 rounded-xl bg-stone-100" />
          <div className="h-9 rounded-xl bg-stone-100" />
          <div className="h-9 rounded-xl bg-stone-100" />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Field label={t.has("nutritionWeight") ? t("nutritionWeight") : "Peso (kg)"}>
              <Input
                type="number"
                inputMode="decimal"
                min={30}
                max={300}
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className={PARAM_CONTROL}
              />
            </Field>
            <Field label={t.has("nutritionHeight") ? t("nutritionHeight") : "Estatura (cm)"}>
              <Input
                type="number"
                inputMode="decimal"
                min={120}
                max={230}
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className={PARAM_CONTROL}
              />
            </Field>
            <Field label={t.has("nutritionAge") ? t("nutritionAge") : "Edad"}>
              <Input
                type="number"
                inputMode="numeric"
                min={14}
                max={100}
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                className={PARAM_CONTROL}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label={t.has("nutritionSex") ? t("nutritionSex") : "Sexo"}>
              <div className="relative">
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as BiologicalSex | "")}
                  className={PARAM_SELECT}
                >
                  <option value="">{selectPlaceholder}</option>
                  <option value="female">
                    {t.has("nutritionSexFemale") ? t("nutritionSexFemale") : "Mujer"}
                  </option>
                  <option value="male">
                    {t.has("nutritionSexMale") ? t("nutritionSexMale") : "Hombre"}
                  </option>
                </select>
              </div>
            </Field>
            <Field label={t.has("nutritionActivity") ? t("nutritionActivity") : "Actividad"}>
              <div className="relative">
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value as ActivityLevel | "")}
                  className={PARAM_SELECT}
                >
                  <option value="">{selectPlaceholder}</option>
                  <option value="sedentary">
                    {t.has("nutritionActivitySedentary")
                      ? t("nutritionActivitySedentary")
                      : "Sedentario"}
                  </option>
                  <option value="light">
                    {t.has("nutritionActivityLight") ? t("nutritionActivityLight") : "Ligero"}
                  </option>
                  <option value="moderate">
                    {t.has("nutritionActivityModerate")
                      ? t("nutritionActivityModerate")
                      : "Moderado"}
                  </option>
                  <option value="active">
                    {t.has("nutritionActivityActive") ? t("nutritionActivityActive") : "Activo"}
                  </option>
                  <option value="very_active">
                    {t.has("nutritionActivityVeryActive")
                      ? t("nutritionActivityVeryActive")
                      : "Muy activo"}
                  </option>
                </select>
              </div>
            </Field>
          </div>

          <Field label={tParams.has("dietLabel") ? tParams("dietLabel") : "Tipo de alimentación"}>
            <div className="relative">
              <select
                value={preferredDiet}
                onChange={(e) => setPreferredDiet(parsePreferredDiet(e.target.value))}
                className={PARAM_SELECT}
              >
                {PREFERRED_DIETS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {tParams.has(option.labelKey)
                      ? tParams(option.labelKey)
                      : option.fallbackLabel}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <p className="-mt-1 text-[10px] leading-snug text-stone-400">
            {tParams.has("dietHint")
              ? tParams("dietHint")
              : "Las recomendaciones de Hoy, el menú del día y las recetas nuevas se adaptarán a esta preferencia."}
          </p>

          <Field label={t.has("nutritionGoal") ? t("nutritionGoal") : "Objetivo"}>
            <div className="relative">
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as NutritionGoalType | "")}
                className={PARAM_SELECT}
              >
                <option value="">{selectPlaceholder}</option>
                <option value="deficit">
                  {t.has("nutritionGoalDeficit")
                    ? t("nutritionGoalDeficit")
                    : "Pérdida de grasa"}
                </option>
                <option value="maintenance">
                  {t.has("nutritionGoalMaintenance")
                    ? t("nutritionGoalMaintenance")
                    : "Mantenimiento"}
                </option>
                <option value="surplus">
                  {t.has("nutritionGoalSurplus")
                    ? t("nutritionGoalSurplus")
                    : "Ganancia muscular"}
                </option>
              </select>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field
              label={
                t.has("nutritionCalorieOverride") ? t("nutritionCalorieOverride") : "Meta kcal"
              }
            >
              <Input
                type="number"
                inputMode="numeric"
                min={1000}
                max={5000}
                placeholder={preview ? String(preview.calorieTarget) : "Auto"}
                value={calorieOverride}
                onChange={(e) => setCalorieOverride(e.target.value)}
                className={PARAM_CONTROL}
              />
            </Field>
            <Field
              label={
                t.has("nutritionProteinOverride")
                  ? t("nutritionProteinOverride")
                  : "Meta proteína (g)"
              }
            >
              <Input
                type="number"
                inputMode="numeric"
                min={30}
                max={300}
                placeholder={preview ? String(preview.proteinTarget) : "Auto"}
                value={proteinOverride}
                onChange={(e) => setProteinOverride(e.target.value)}
                className={PARAM_CONTROL}
              />
            </Field>
          </div>

          {preview ? (
            <p className="rounded-xl bg-[#556B2F]/8 px-2.5 py-1.5 text-[10px] leading-snug text-stone-700 ring-1 ring-[#556B2F]/12">
              <span className="font-semibold text-[#3e5219]">
                {t.has("nutritionPreviewTitle") ? t("nutritionPreviewTitle") : "Estimación"}
                :{" "}
              </span>
              BMR ~{preview.bmr} · TDEE ~{preview.tdee} ·{" "}
              <strong>{preview.calorieTarget} kcal</strong> ·{" "}
              <strong>{preview.proteinTarget} g</strong> prot
              {!completeHint ? (
                <span className="mt-0.5 block text-amber-800">
                  {t.has("nutritionIncompleteHint")
                    ? t("nutritionIncompleteHint")
                    : "Completa los campos obligatorios."}
                </span>
              ) : null}
            </p>
          ) : null}

          {saveError ? (
            <p className="text-[11px] font-medium text-red-600" role="alert">
              {saveError}
            </p>
          ) : null}

          {showSaveButton ? (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className={PARAM_SAVE_BTN}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  {tParams.has("saving") ? tParams("saving") : "Guardando..."}
                </>
              ) : tParams.has("nutritionSave") ? (
                tParams("nutritionSave")
              ) : (
                "Guardar perfil nutricional"
              )}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
