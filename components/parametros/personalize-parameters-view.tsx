"use client";

import { useEffect, useState } from "react";
import { Droplets, Loader2, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { NutritionGoalsForm } from "@/components/profile/nutrition-goals-form";
import { NotificationPushSettings } from "@/components/profile/notification-push-settings";
import { ParametrosSkeleton } from "@/components/skeletons/parametros-skeleton";
import {
  PARAM_CHIP,
  PARAM_CONTROL,
  PARAM_LABEL,
  PARAM_SAVE_BTN,
  PARAM_SECTION
} from "@/components/parametros/parametros-form-styles";
import {
  WATER_GLASSES_MAX,
  WATER_GLASSES_MIN,
  WATER_GLASSES_SUGGESTED,
  clampWaterGlassesGoal,
  fetchWaterGlassesGoal,
  saveWaterGlassesGoal
} from "@/lib/hydration/water-intake";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function PersonalizeParametersView() {
  const t = useTranslations("Parametros");
  const [userId, setUserId] = useState<string | null>(null);
  const [glassesInput, setGlassesInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (isLoading) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#water-glasses") return;

    const timer = window.setTimeout(() => {
      document.getElementById("water-glasses")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const supabase = createSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setUserId(null);
            setGlassesInput("");
          }
          return;
        }

        const goal = await fetchWaterGlassesGoal(user.id);
        if (cancelled) return;

        setUserId(user.id);
        setGlassesInput(goal != null ? String(goal) : "");
      } catch (error) {
        console.error("[parametros] Error cargando parámetros:", error);
        if (!cancelled) {
          setErrorMessage(t("loadError"));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSaveWater = async () => {
    if (!userId || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);

    const trimmed = glassesInput.trim();
    let goal: number | null = null;

    if (trimmed.length > 0) {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        setErrorMessage(t("invalidGlasses"));
        setIsSaving(false);
        return;
      }
      goal = clampWaterGlassesGoal(parsed);
      if (goal == null && parsed !== 0) {
        setErrorMessage(t("invalidGlasses"));
        setIsSaving(false);
        return;
      }
      if (parsed === 0) goal = null;
    }

    const result = await saveWaterGlassesGoal(userId, goal);
    setIsSaving(false);

    if (!result.ok) {
      setErrorMessage(t("saveError"));
      return;
    }

    setGlassesInput(result.goal != null ? String(result.goal) : "");
    setToastMessage(result.goal != null ? t("toastSaved") : t("toastCleared"));
  };

  return (
    <div className="-mx-4 min-h-full bg-[#FAF7F2] px-4 pb-8 pt-2.5">
      <header className="mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-xl bg-[#3E5A3A]/10 p-2 text-[#3E5A3A]">
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#3E5A3A]/70">
              {t("eyebrow")}
            </p>
            <h1 className="text-[15px] font-bold leading-tight text-stone-900">{t("title")}</h1>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-stone-500">{t("subtitle")}</p>
      </header>

      {isLoading ? (
        <ParametrosSkeleton />
      ) : !userId ? (
        <p className="rounded-2xl bg-white p-4 text-[12px] text-stone-500 shadow-sm">
          {t("loginRequired")}
        </p>
      ) : (
        <div className="space-y-3">
          <NutritionGoalsForm
            userId={userId}
            showSaveButton
            onSaved={() =>
              setToastMessage(
                t.has("nutritionToastSaved")
                  ? t("nutritionToastSaved")
                  : "Perfil nutricional guardado."
              )
            }
          />

          <section id="water-glasses" className={PARAM_SECTION}>
            <header className="mb-2.5 flex items-start gap-2">
              <span className="mt-0.5 inline-flex rounded-lg bg-[#3D7A9A]/12 p-1.5 text-[#3D7A9A]">
                <Droplets className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-[13px] font-bold leading-tight text-stone-800">
                  {t("waterTitle")}
                </h2>
                <p className="mt-0.5 text-[10px] leading-snug text-stone-500">
                  {t("waterDescription")}
                </p>
              </div>
            </header>

            <div className="space-y-2">
              <label className="flex min-w-0 flex-col gap-1">
                <span className={PARAM_LABEL}>{t("waterGlassesLabel")}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={WATER_GLASSES_MAX}
                  step={1}
                  value={glassesInput}
                  onChange={(event) => setGlassesInput(event.target.value)}
                  placeholder={t("waterGlassesPlaceholder", {
                    min: WATER_GLASSES_MIN,
                    max: WATER_GLASSES_MAX
                  })}
                  className={PARAM_CONTROL}
                />
              </label>

              <p className="text-[10px] leading-snug text-stone-400">
                {t("waterGlassesHint", {
                  suggested: WATER_GLASSES_SUGGESTED,
                  max: WATER_GLASSES_MAX
                })}
              </p>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setGlassesInput(String(WATER_GLASSES_SUGGESTED))}
                  className={cn(
                    PARAM_CHIP,
                    "border-[#3D7A9A]/20 bg-[#3D7A9A]/8 text-[#3D7A9A] hover:bg-[#3D7A9A]/12"
                  )}
                >
                  {t("useSuggestion", { count: WATER_GLASSES_SUGGESTED })}
                </button>
                <button
                  type="button"
                  onClick={() => setGlassesInput("")}
                  className={cn(
                    PARAM_CHIP,
                    "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                  )}
                >
                  {t("clearGoal")}
                </button>
              </div>

              {errorMessage ? (
                <p className="text-[11px] font-medium text-red-600" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSaveWater()}
                disabled={isSaving}
                className={PARAM_SAVE_BTN}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {t("saving")}
                  </>
                ) : (
                  t("save")
                )}
              </button>
            </div>
          </section>

          <NotificationPushSettings />
        </div>
      )}

      {toastMessage ? <Toast message={toastMessage} visible variant="success" /> : null}
    </div>
  );
}
