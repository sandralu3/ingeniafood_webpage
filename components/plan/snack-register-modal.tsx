"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, PenLine, X, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import type { ExternalMealEstimate } from "@/lib/plan/external-meal";
import { SNACK_PRESETS, type PlanSnack } from "@/lib/plan/snack-presets";
import {
  addEstimatedSnackToPlan,
  addQuickSnackToPlan
} from "@/lib/plan/snack-service";
import { uploadExternalMealPhoto } from "@/lib/plan/upload-external-meal-photo";
import { canRegisterExternalMealForPlanDay } from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type Mode = "menu" | "text" | "photo";

type Props = {
  open: boolean;
  dayLabel: WeekDay;
  weekStartISO: string;
  /** Unused for snacks but kept for consistent slot context. */
  mealType?: MealType;
  onClose: () => void;
  onRegistered: (snack: PlanSnack) => void;
};

type EstimateApiResponse = {
  estimate?: ExternalMealEstimate;
  error?: string;
  message?: string;
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

export function SnackRegisterModal({
  open,
  dayLabel,
  weekStartISO,
  onClose,
  onRegistered
}: Props) {
  const t = useTranslations("Plan");
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("menu");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [busyPresetId, setBusyPresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRegister = canRegisterExternalMealForPlanDay(weekStartISO, dayLabel);

  useEffect(() => {
    if (!open) {
      setMode("menu");
      setDescription("");
      setSelectedFile(null);
      setError(null);
      setIsBusy(false);
      setBusyPresetId(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open/close
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  const handleFileChange = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setError(null);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const requireUser = async () => {
    const supabase = createSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setError(
        t.has("loginToAssign") ? t("loginToAssign") : "Inicia sesión para registrar el snack."
      );
      return null;
    }
    return user;
  };

  const handleQuickPreset = async (presetId: string) => {
    if (isBusy || busyPresetId) return;
    if (!canRegister) {
      setError(
        t.has("snackFutureDayError")
          ? t("snackFutureDayError")
          : "Solo puedes registrar snacks en hoy o días pasados."
      );
      return;
    }

    setBusyPresetId(presetId);
    setError(null);
    try {
      const user = await requireUser();
      if (!user) return;

      const result = await addQuickSnackToPlan({
        userId: user.id,
        dayLabel,
        weekStartISO,
        presetId
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onRegistered(result.snack);
      onClose();
    } catch (err) {
      console.error("[snack-register]", err);
      setError("No pudimos guardar el snack.");
    } finally {
      setBusyPresetId(null);
    }
  };

  const estimateSnack = async (payloadMode: "text" | "photo") => {
    const payload: Record<string, unknown> = { mode: payloadMode, locale };
    if (payloadMode === "text") {
      payload.description = description.trim();
    } else {
      if (!selectedFile) {
        setError("Toma o elige una foto del snack.");
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
      setError(data.message ?? data.error ?? "No pudimos estimar el snack.");
      return null;
    }
    return data.estimate;
  };

  const handleEstimateSubmit = async () => {
    if (isBusy) return;
    if (!canRegister) {
      setError(
        t.has("snackFutureDayError")
          ? t("snackFutureDayError")
          : "Solo puedes registrar snacks en hoy o días pasados."
      );
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const user = await requireUser();
      if (!user) return;

      const estimateMode = mode === "photo" ? "photo" : "text";
      const estimate = await estimateSnack(estimateMode);
      if (!estimate) return;

      let imageUrl: string | null = null;
      if (estimateMode === "photo" && selectedFile) {
        const upload = await uploadExternalMealPhoto(user.id, selectedFile);
        if ("error" in upload) {
          setError(upload.error);
          return;
        }
        imageUrl = upload.url;
      }

      const result = await addEstimatedSnackToPlan({
        userId: user.id,
        dayLabel,
        weekStartISO,
        title: estimate.nombre_plato,
        kcal: estimate.calorias_est,
        proteinGrams: estimate.proteinas_est_g,
        source: estimateMode,
        imageUrl
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onRegistered(result.snack);
      onClose();
    } catch (err) {
      console.error("[snack-register]", err);
      setError("No pudimos registrar el snack.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/50 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="snack-register-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-100 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <h2 id="snack-register-title" className="font-serif text-lg font-semibold text-stone-900">
              {t.has("snackRegisterTitle") ? t("snackRegisterTitle") : "Registrar snack"}
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {t.has("snackRegisterSubtitle")
                ? t("snackRegisterSubtitle")
                : "Añade un tentempié en segundos. Cuenta para el balance del día."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy || Boolean(busyPresetId)}
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {!canRegister ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t.has("snackFutureDayHint")
                ? t("snackFutureDayHint")
                : "Solo puedes registrar snacks en hoy o días pasados."}
            </p>
          ) : null}

          {mode === "menu" ? (
            <>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={!canRegister}
                  onClick={() => setMode("text")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-violet-200/80 bg-violet-50/50 px-3 py-3 text-left text-sm font-semibold text-violet-950 transition hover:bg-violet-50 disabled:opacity-50"
                >
                  <PenLine className="h-4 w-4 shrink-0" />
                  {t.has("snackOptionText")
                    ? t("snackOptionText")
                    : "✍️ Registro por texto"}
                </button>
                <button
                  type="button"
                  disabled={!canRegister}
                  onClick={() => setMode("photo")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-sky-200/80 bg-sky-50/50 px-3 py-3 text-left text-sm font-semibold text-sky-950 transition hover:bg-sky-50 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4 shrink-0" />
                  {t.has("snackOptionPhoto")
                    ? t("snackOptionPhoto")
                    : "📸 Foto instantánea"}
                </button>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400">
                  <Zap className="h-3.5 w-3.5" />
                  {t.has("snackOptionQuick")
                    ? t("snackOptionQuick")
                    : "Sugerencias frecuentes"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SNACK_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={!canRegister || busyPresetId !== null}
                      onClick={() => void handleQuickPreset(preset.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition",
                        "hover:border-[#4D6638]/35 hover:bg-[#4D6638]/5 disabled:opacity-50"
                      )}
                    >
                      {busyPresetId === preset.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span aria-hidden>{preset.emoji}</span>
                      )}
                      + {preset.title}
                      <span className="text-[10px] font-medium text-stone-400">
                        {preset.kcal} kcal
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {mode === "text" ? (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                ¿Qué snack comiste?
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder='Ej. "Un café con leche y 1 banana"'
                className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-[#4D6638] focus:ring-1 focus:ring-[#4D6638]"
              />
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="text-xs font-semibold text-stone-500 underline-offset-2 hover:underline"
              >
                Volver
              </button>
            </label>
          ) : null}

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
                  <img src={previewUrl} alt="Snack" className="max-h-48 w-full object-cover" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#4D6638]/35 bg-[#4D6638]/5 px-4 py-10 text-sm font-semibold text-[#4D6638]"
                >
                  <Camera className="h-6 w-6" />
                  Tomar o elegir foto
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="text-xs font-semibold text-stone-500 underline-offset-2 hover:underline"
              >
                Volver
              </button>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        {mode === "text" || mode === "photo" ? (
          <div className="border-t border-stone-100 px-5 py-4">
            <button
              type="button"
              disabled={
                isBusy ||
                !canRegister ||
                (mode === "text" && description.trim().length < 2) ||
                (mode === "photo" && !selectedFile)
              }
              onClick={() => void handleEstimateSubmit()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4D6638] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isBusy ? "Estimando…" : "Estimar y añadir"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
