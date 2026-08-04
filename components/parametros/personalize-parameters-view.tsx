"use client";

import { useEffect, useState } from "react";
import { Droplets, Loader2, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
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

  const handleSave = async () => {
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
      // 0 explícito = desactivar
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

  const applySuggestion = () => {
    setGlassesInput(String(WATER_GLASSES_SUGGESTED));
  };

  return (
    <div className="-mx-4 min-h-full bg-[#FAF7F2] px-4 pb-8 pt-3">
      <header className="mb-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex rounded-2xl bg-[#3E5A3A]/10 p-2.5 text-[#3E5A3A]">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#3E5A3A]/70">
              {t("eyebrow")}
            </p>
            <h1 className="text-lg font-bold text-stone-900">{t("title")}</h1>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-stone-500">{t("subtitle")}</p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-[22px] bg-white py-16 text-stone-400 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="text-sm">{t("loading")}</span>
        </div>
      ) : !userId ? (
        <p className="rounded-[22px] bg-white p-5 text-sm text-stone-500 shadow-sm">
          {t("loginRequired")}
        </p>
      ) : (
        <section className="rounded-[22px] border border-stone-200/80 bg-white p-4 shadow-sm shadow-stone-200/40">
          <div className="flex items-start gap-3">
            <span className="inline-flex rounded-xl bg-[#3D7A9A]/12 p-2 text-[#3D7A9A]">
              <Droplets className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-bold text-stone-800">{t("waterTitle")}</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
                {t("waterDescription")}
              </p>

              <label className="mt-4 block">
                <span className="text-[11px] font-medium text-stone-600">
                  {t("waterGlassesLabel")}
                </span>
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
                  className="mt-1.5 h-10 rounded-xl border-stone-200 bg-[#FAF7F2] text-[13px] focus-visible:border-[#3D7A9A]/40 focus-visible:ring-[#3D7A9A]/15"
                />
              </label>

              <p className="mt-2 text-[11px] leading-snug text-stone-400">
                {t("waterGlassesHint", {
                  suggested: WATER_GLASSES_SUGGESTED,
                  max: WATER_GLASSES_MAX
                })}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="rounded-full border border-[#3D7A9A]/20 bg-[#3D7A9A]/8 px-3 py-1.5 text-[11px] font-semibold text-[#3D7A9A] transition hover:bg-[#3D7A9A]/12"
                >
                  {t("useSuggestion", { count: WATER_GLASSES_SUGGESTED })}
                </button>
                <button
                  type="button"
                  onClick={() => setGlassesInput("")}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-500 transition hover:bg-stone-50"
                >
                  {t("clearGoal")}
                </button>
              </div>

              {errorMessage ? (
                <p className="mt-3 text-[12px] font-medium text-red-600" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#5C7A54] via-[#3E5A3A] to-[#2F452C] px-4 py-3 text-[13px] font-bold text-white shadow-sm shadow-[#3E5A3A]/25 transition hover:brightness-110 disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {t("saving")}
                  </>
                ) : (
                  t("save")
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {toastMessage ? (
        <Toast message={toastMessage} visible variant="success" />
      ) : null}
    </div>
  );
}
