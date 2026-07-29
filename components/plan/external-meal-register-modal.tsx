"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, PenLine, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import type { ExternalMealEstimate } from "@/lib/plan/external-meal";
import { registerExternalMealToPlan } from "@/lib/plan/register-external-meal";
import { uploadExternalMealPhoto } from "@/lib/plan/upload-external-meal-photo";
import { canRegisterExternalMealForPlanDay } from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type Mode = "photo" | "text";

type Props = {
  open: boolean;
  mode: Mode;
  dayLabel: WeekDay;
  mealType: MealType;
  weekStartISO: string;
  onClose: () => void;
  onRegistered: (meal: PlanMeal) => void;
};

type EstimateApiResponse = {
  estimate?: ExternalMealEstimate;
  error?: string;
  message?: string;
  code?: string;
};

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return {
    base64: btoa(binary),
    mimeType: file.type || "image/jpeg"
  };
}

export function ExternalMealRegisterModal({
  open,
  mode,
  dayLabel,
  mealType,
  weekStartISO,
  onClose,
  onRegistered
}: Props) {
  const t = useTranslations("Plan");
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewEstimate, setPreviewEstimate] = useState<ExternalMealEstimate | null>(null);

  useEffect(() => {
    if (!open) {
      setDescription("");
      setSelectedFile(null);
      setPreviewEstimate(null);
      setError(null);
      setIsBusy(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when closing/opening
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  const title =
    mode === "photo"
      ? t.has("externalMealScanTitle")
        ? t("externalMealScanTitle")
        : "📸 Escanear plato servido"
      : t.has("externalMealQuickTitle")
        ? t("externalMealQuickTitle")
        : "✍️ Registrar comida rápida";

  const handleFileChange = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewEstimate(null);
    setError(null);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const estimateMeal = async (): Promise<ExternalMealEstimate | null> => {
    const payload: Record<string, unknown> = { mode, locale };
    if (mode === "text") {
      payload.description = description.trim();
    } else {
      if (!selectedFile) {
        setError(
          t.has("externalMealNeedPhoto")
            ? t("externalMealNeedPhoto")
            : "Toma o elige una foto del plato."
        );
        return null;
      }
      const { base64, mimeType } = await fileToBase64(selectedFile);
      payload.imageBase64 = base64;
      payload.mimeType = mimeType;
    }

    const response = await fetch("/api/estimate-external-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as EstimateApiResponse;
    if (!response.ok || !data.estimate) {
      setError(
        data.message ??
          data.error ??
          (t.has("externalMealEstimateError")
            ? t("externalMealEstimateError")
            : "No pudimos estimar la comida.")
      );
      return null;
    }
    return data.estimate;
  };

  const handleSubmit = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      if (!canRegisterExternalMealForPlanDay(weekStartISO, dayLabel)) {
        setError(
          t.has("externalMealFutureDayError")
            ? t("externalMealFutureDayError")
            : "No puedes registrar una comida fuera en un día futuro: todavía no ha ocurrido."
        );
        return;
      }

      const estimate = previewEstimate ?? (await estimateMeal());
      if (!estimate) return;

      setPreviewEstimate(estimate);

      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        setError(
          t.has("loginToAssign")
            ? t("loginToAssign")
            : "Inicia sesión para registrar la comida."
        );
        return;
      }

      // Foto solo si escaneó el plato; registro por texto = sin imagen (ni stock).
      let plateImageUrl: string | null = null;
      if (mode === "photo") {
        if (!selectedFile) {
          setError(
            t.has("externalMealNeedPhoto")
              ? t("externalMealNeedPhoto")
              : "Toma o elige una foto del plato."
          );
          return;
        }
        const upload = await uploadExternalMealPhoto(user.id, selectedFile);
        if ("error" in upload) {
          setError(upload.error);
          return;
        }
        plateImageUrl = upload.url;
      }

      const result = await registerExternalMealToPlan({
        userId: user.id,
        estimate,
        dayLabel,
        mealType,
        weekStartISO,
        imageUrl: plateImageUrl
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onRegistered(result.meal);
      onClose();
    } catch (err) {
      console.error("[external-meal]", err);
      setError(
        t.has("externalMealEstimateError")
          ? t("externalMealEstimateError")
          : "No pudimos registrar la comida."
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/50 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="external-meal-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-100 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <h2 id="external-meal-title" className="font-serif text-lg font-semibold text-stone-900">
              {title}
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {t.has("externalMealSubtitle")
                ? t("externalMealSubtitle")
                : "Estimamos calorías y proteínas para mantener el balance del día."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {mode === "photo" ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
              {previewUrl ? (
                <div className="overflow-hidden rounded-2xl border border-stone-100 bg-stone-50">
                  <img src={previewUrl} alt="Plato" className="max-h-56 w-full object-cover" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#4D6638]/35 bg-[#4D6638]/5 px-4 py-10 text-sm font-semibold text-[#4D6638] transition hover:bg-[#4D6638]/10"
                >
                  <Camera className="h-6 w-6" />
                  {t.has("externalMealTakePhoto")
                    ? t("externalMealTakePhoto")
                    : "Tomar o elegir foto del plato"}
                </button>
              )}
              {previewUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-[#4D6638] underline-offset-2 hover:underline"
                >
                  Cambiar foto
                </button>
              ) : null}
            </div>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                {t.has("externalMealDescriptionLabel")
                  ? t("externalMealDescriptionLabel")
                  : "¿Qué comiste?"}
              </span>
              <textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setPreviewEstimate(null);
                }}
                rows={3}
                placeholder='Ej. "Pizza margherita y ensalada verde"'
                className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-[#4D6638] focus:ring-1 focus:ring-[#4D6638]"
              />
            </label>
          )}

          {previewEstimate ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-sm text-emerald-950">
              <p className="font-semibold">{previewEstimate.nombre_plato}</p>
              <p className="mt-1 text-xs text-emerald-900/80">
                ~{previewEstimate.calorias_est} kcal · {previewEstimate.proteinas_est_g}g proteína
                {previewEstimate.tiene_vegetales ? " · con vegetales" : ""}
              </p>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-stone-100 px-5 py-4">
          <button
            type="button"
            disabled={
              isBusy ||
              (mode === "text" && description.trim().length < 3) ||
              (mode === "photo" && !selectedFile)
            }
            onClick={() => void handleSubmit()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4D6638] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "photo" ? <Camera className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
            {isBusy
              ? t.has("externalMealSaving")
                ? t("externalMealSaving")
                : "Estimando y guardando…"
              : t.has("externalMealConfirm")
                ? t("externalMealConfirm")
                : "Estimar y asignar al plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
