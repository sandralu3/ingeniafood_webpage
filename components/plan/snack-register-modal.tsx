"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, PenLine, Trash2, X, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import {
  EXTERNAL_MEAL_UNITS,
  applySnackAdvice,
  createExternalMealFoodItem,
  scaleExternalMealFoodItem,
  withEditedSnackFoods,
  type ExternalMealEstimate,
  type ExternalMealFoodItem
} from "@/lib/plan/external-meal";
import { compressImageForUpload } from "@/lib/images/compress-image-for-upload";
import {
  commaSeparationErrorMessage,
  descriptionNeedsCommaSeparation,
  foodDescriptionRejectionMessage,
  isLikelyFoodOrDrinkDescription
} from "@/lib/plan/food-description-validation";
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
type Step = "input" | "review";

type Props = {
  open: boolean;
  dayLabel: WeekDay;
  weekStartISO: string;
  /** Unused for snacks but kept for consistent slot context. */
  mealType?: MealType;
  onClose: () => void;
  onRegistered: (snack: PlanSnack) => void;
  /** true mientras analiza o guarda: el padre no debe desmontar el modal. */
  onBusyChange?: (busy: boolean) => void;
};

type EstimateApiResponse = {
  estimate?: ExternalMealEstimate;
  error?: string;
  message?: string;
  code?: string;
};

export function SnackRegisterModal({
  open,
  dayLabel,
  weekStartISO,
  onClose,
  onRegistered,
  onBusyChange
}: Props) {
  const t = useTranslations("Plan");
  const locale = useLocale();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("menu");
  const [step, setStep] = useState<Step>("input");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyPresetId, setBusyPresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<ExternalMealEstimate | null>(null);
  const [foodItems, setFoodItems] = useState<ExternalMealFoodItem[]>([]);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [dishName, setDishName] = useState("");

  const canRegister = canRegisterExternalMealForPlanDay(weekStartISO, dayLabel);

  const resetState = () => {
    setMode("menu");
    setStep("input");
    setDescription("");
    setSelectedFile(null);
    setEstimate(null);
    setFoodItems([]);
    setQuantityDrafts({});
    setDishName("");
    setError(null);
    setIsAnalyzing(false);
    setIsSaving(false);
    setBusyPresetId(null);
    setShowSourcePicker(true);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  useEffect(() => {
    if (!open) {
      if (isAnalyzing || isSaving || busyPresetId) return;
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open/close
  }, [open]);

  useEffect(() => {
    onBusyChange?.(isAnalyzing || isSaving || Boolean(busyPresetId));
  }, [busyPresetId, isAnalyzing, isSaving, onBusyChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isAnalyzing || isSaving || busyPresetId) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [busyPresetId, isAnalyzing, isSaving, onClose, open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const liveEstimate = useMemo(() => {
    if (!estimate) return null;
    const withName = {
      ...estimate,
      nombre_plato: dishName.trim() || estimate.nombre_plato
    };
    return withEditedSnackFoods(withName, foodItems);
  }, [dishName, estimate, foodItems]);

  if (!open) return null;

  const requestClose = () => {
    if (isAnalyzing || isSaving || busyPresetId) return;
    onClose();
  };

  const handleFileChange = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setEstimate(null);
    setFoodItems([]);
    setQuantityDrafts({});
    setDishName("");
    setError(null);
    setStep("input");
    setPreviewUrl(URL.createObjectURL(file));
    setShowSourcePicker(false);
  };

  const openCamera = () => {
    window.setTimeout(() => cameraInputRef.current?.click(), 0);
  };

  const openGallery = () => {
    window.setTimeout(() => galleryInputRef.current?.click(), 0);
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
    if (isAnalyzing || isSaving || busyPresetId) return;
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

  const estimateSnack = async (
    payloadMode: "text" | "photo"
  ): Promise<ExternalMealEstimate | null> => {
    const payload: Record<string, unknown> = {
      mode: payloadMode,
      context: "snack",
      locale
    };
    if (payloadMode === "text") {
      const trimmed = description.trim();
      if (!isLikelyFoodOrDrinkDescription(trimmed)) {
        setError(foodDescriptionRejectionMessage("snack"));
        return null;
      }
      if (descriptionNeedsCommaSeparation(trimmed)) {
        setError(
          t.has("snackDescriptionCommaError")
            ? t("snackDescriptionCommaError")
            : commaSeparationErrorMessage()
        );
        return null;
      }
      payload.description = trimmed;
    } else {
      if (!selectedFile) {
        setError(
          t.has("externalMealNeedPhoto")
            ? t("externalMealNeedPhoto")
            : "Toma o elige una foto del snack."
        );
        return null;
      }
      const { base64, mimeType } = await compressImageForUpload(selectedFile);
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
      const isNotFood = data.code === "NOT_FOOD" || data.error === "NOT_FOOD";
      setError(
        data.message ??
          (isNotFood
            ? foodDescriptionRejectionMessage("snack")
            : data.error && data.error !== "NOT_FOOD"
              ? data.error
              : t.has("externalMealEstimateError")
                ? t("externalMealEstimateError")
                : "No pudimos estimar el snack.")
      );
      return null;
    }

    const next = applySnackAdvice({
      ...data.estimate,
      alimentos: Array.isArray(data.estimate.alimentos) ? data.estimate.alimentos : [],
      balance: data.estimate.balance ?? "mejorable",
      recomendaciones: Array.isArray(data.estimate.recomendaciones)
        ? data.estimate.recomendaciones
        : []
    });
    if (!next.alimentos.length) {
      next.alimentos = [
        createExternalMealFoodItem({
          nombre: next.nombre_plato,
          cantidad: 1,
          unidad: "porción",
          calorias: next.calorias_est,
          proteinas_g: next.proteinas_est_g
        })
      ];
    }
    return applySnackAdvice(next);
  };

  const handleAnalyze = async () => {
    if (isAnalyzing || isSaving) return;
    if (mode !== "text" && mode !== "photo") return;

    setIsAnalyzing(true);
    setError(null);
    try {
      if (!canRegister) {
        setError(
          t.has("snackFutureDayError")
            ? t("snackFutureDayError")
            : "Solo puedes registrar snacks en hoy o días pasados."
        );
        return;
      }

      const nextEstimate = await estimateSnack(mode);
      if (!nextEstimate) return;

      setEstimate(nextEstimate);
      setFoodItems(nextEstimate.alimentos);
      setQuantityDrafts({});
      setDishName(nextEstimate.nombre_plato);
      setStep("review");
    } catch (err) {
      console.error("[snack-register] analyze", err);
      setError(
        t.has("externalMealEstimateError")
          ? t("externalMealEstimateError")
          : "No pudimos analizar el snack."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateFoodItem = (id: string, patch: Partial<ExternalMealFoodItem>) => {
    setFoodItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (patch.cantidad != null && patch.cantidad !== item.cantidad) {
          const nextQty = Number(patch.cantidad);
          if (!Number.isFinite(nextQty) || nextQty <= 0) return item;
          return scaleExternalMealFoodItem(item, nextQty);
        }
        if (patch.unidad != null || patch.nombre != null) {
          return {
            ...item,
            nombre: patch.nombre?.trim() || item.nombre,
            unidad: patch.unidad?.trim() || item.unidad
          };
        }
        return { ...item, ...patch };
      })
    );
  };

  const handleQuantityDraftChange = (id: string, raw: string) => {
    if (raw !== "" && !/^\d*[.,]?\d*$/.test(raw)) return;
    setQuantityDrafts((current) => ({ ...current, [id]: raw }));

    const normalized = raw.replace(",", ".");
    if (normalized === "" || normalized === "." || normalized.endsWith(".")) return;
    const nextQty = Number(normalized);
    if (!Number.isFinite(nextQty) || nextQty <= 0) return;
    updateFoodItem(id, { cantidad: nextQty });
  };

  const commitQuantityDraft = (id: string) => {
    const raw = quantityDrafts[id];
    setQuantityDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (raw == null) return;
    const nextQty = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(nextQty) || nextQty <= 0) return;
    updateFoodItem(id, { cantidad: nextQty });
  };

  const removeFoodItem = (id: string) => {
    setFoodItems((current) =>
      current.length <= 1 ? current : current.filter((item) => item.id !== id)
    );
  };

  const handleConfirmSave = async () => {
    if (!liveEstimate || isSaving || isAnalyzing || (mode !== "text" && mode !== "photo")) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (!canRegister) {
        setError(
          t.has("snackFutureDayError")
            ? t("snackFutureDayError")
            : "Solo puedes registrar snacks en hoy o días pasados."
        );
        return;
      }

      const user = await requireUser();
      if (!user) return;

      let imageUrl: string | null = null;
      if (mode === "photo") {
        if (!selectedFile) {
          setError(
            t.has("externalMealNeedPhoto")
              ? t("externalMealNeedPhoto")
              : "Toma o elige una foto del snack."
          );
          return;
        }
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
        title: liveEstimate.nombre_plato,
        kcal: liveEstimate.calorias_est,
        proteinGrams: liveEstimate.proteinas_est_g,
        source: mode,
        imageUrl
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onRegistered(result.snack);
      onClose();
    } catch (err) {
      console.error("[snack-register] save", err);
      setError("No pudimos registrar el snack.");
    } finally {
      setIsSaving(false);
    }
  };

  const canAnalyze =
    mode === "text"
      ? description.trim().length >= 3
      : mode === "photo"
        ? Boolean(selectedFile)
        : false;

  const headerTitle =
    step === "review"
      ? t.has("externalMealReviewTitle")
        ? t("externalMealReviewTitle")
        : "Revisa los alimentos"
      : t.has("snackRegisterTitle")
        ? t("snackRegisterTitle")
        : "Registrar snack";

  const headerSubtitle =
    step === "review"
      ? t.has("externalMealReviewSubtitle")
        ? t("externalMealReviewSubtitle")
        : "Ajusta cantidades o pesos antes de guardar en tu plan."
      : t.has("snackRegisterSubtitle")
        ? t("snackRegisterSubtitle")
        : "Añade un tentempié en segundos. Cuenta para el balance del día.";

  return (
    <div
      className="fixed inset-0 z-[180] flex items-end justify-center bg-black/50 px-0 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-[2px] sm:items-center sm:px-4 sm:pt-4"
      onClick={(event) => {
        // Solo cerrar desde el menú vacío. Con texto/revisión un toque al fondo
        // (p. ej. al cerrar el teclado en móvil) perdía el snack sin guardar.
        const canDismissByBackdrop =
          mode === "menu" &&
          step === "input" &&
          !description.trim() &&
          !estimate &&
          !isAnalyzing &&
          !isSaving &&
          !busyPresetId;
        if (event.target === event.currentTarget && canDismissByBackdrop) {
          requestClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="snack-register-title"
        className="flex max-h-[min(88svh,88dvh)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-100 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[85vh] sm:rounded-3xl sm:pb-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="snack-register-title" className="font-serif text-lg font-semibold text-stone-900">
              {headerTitle}
            </h2>
            <p className="mt-1 text-xs text-stone-500">{headerSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={isAnalyzing || isSaving || Boolean(busyPresetId)}
            className="shrink-0 rounded-full p-2 text-stone-400 transition hover:bg-stone-100 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-5 py-4 touch-pan-y [-webkit-overflow-scrolling:touch]">
          {!canRegister ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t.has("snackFutureDayHint")
                ? t("snackFutureDayHint")
                : "Solo puedes registrar snacks en hoy o días pasados."}
            </p>
          ) : null}

          {step === "input" && mode === "menu" ? (
            <>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={!canRegister}
                  onClick={() => {
                    setStep("input");
                    setMode("text");
                  }}
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
                  onClick={() => {
                    setShowSourcePicker(true);
                    setStep("input");
                    setMode("photo");
                  }}
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

          {step === "input" && mode === "text" ? (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                {t.has("snackDescriptionLabel")
                  ? t("snackDescriptionLabel")
                  : "¿Qué snack comiste?"}
              </span>
              <textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setEstimate(null);
                  setFoodItems([]);
                  setQuantityDrafts({});
                  setError(null);
                }}
                rows={3}
                placeholder={
                  t.has("snackDescriptionPlaceholder")
                    ? t("snackDescriptionPlaceholder")
                    : 'Ej.: galletas, café con leche'
                }
                className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-[#4D6638] focus:ring-1 focus:ring-[#4D6638]"
              />
              <p className="text-[11px] leading-snug text-stone-500">
                {t.has("snackDescriptionCommaHint")
                  ? t("snackDescriptionCommaHint")
                  : "Si son varios alimentos, sepáralos por comas para identificarlos mejor."}
              </p>
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="text-xs font-semibold text-stone-500 underline-offset-2 hover:underline"
              >
                Volver
              </button>
            </label>
          ) : null}

          {step === "input" && mode === "photo" ? (
            <div className="space-y-3">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                aria-label={
                  t.has("externalMealTakePhoto") ? t("externalMealTakePhoto") : "Tomar Foto"
                }
                onChange={(event) => {
                  handleFileChange(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                aria-label={
                  t.has("externalMealChooseGallery")
                    ? t("externalMealChooseGallery")
                    : "Elegir de la Galería"
                }
                onChange={(event) => {
                  handleFileChange(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />

              {previewUrl && !showSourcePicker ? (
                <div className="space-y-2">
                  <div className="overflow-hidden rounded-2xl border border-stone-100 bg-stone-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Snack" className="max-h-48 w-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-0.5">
                    <button
                      type="button"
                      onClick={() => setShowSourcePicker(true)}
                      disabled={isAnalyzing}
                      className="text-xs font-semibold text-[#4D6638] underline-offset-2 hover:underline disabled:opacity-60"
                    >
                      {t.has("externalMealChangePhoto")
                        ? t("externalMealChangePhoto")
                        : "Cambiar foto"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("menu")}
                      className="text-xs font-semibold text-stone-500 underline-offset-2 hover:underline"
                    >
                      Volver
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-2xl border border-stone-100 bg-white p-1">
                    <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      {t.has("snackAddPhotoTitle")
                        ? t("snackAddPhotoTitle")
                        : "Añadir foto del snack"}
                    </p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={openCamera}
                        disabled={isAnalyzing}
                        className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3.5 text-left text-sm font-semibold text-stone-800 transition hover:border-[#3E5A3A]/30 hover:bg-[#F4F7F2] disabled:opacity-60"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3E5A3A]/10 text-[#3E5A3A]">
                          <Camera className="h-4 w-4" strokeWidth={2} />
                        </span>
                        {t.has("externalMealTakePhoto")
                          ? t("externalMealTakePhoto")
                          : "Tomar Foto"}
                      </button>
                      <button
                        type="button"
                        onClick={openGallery}
                        disabled={isAnalyzing}
                        className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3.5 text-left text-sm font-semibold text-stone-800 transition hover:border-[#3E5A3A]/30 hover:bg-[#F4F7F2] disabled:opacity-60"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                          <ImageIcon className="h-4 w-4" strokeWidth={2} />
                        </span>
                        {t.has("externalMealChooseGallery")
                          ? t("externalMealChooseGallery")
                          : "Elegir de la Galería"}
                      </button>
                    </div>
                    {previewUrl ? (
                      <button
                        type="button"
                        onClick={() => setShowSourcePicker(false)}
                        disabled={isAnalyzing}
                        className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold text-stone-500 transition hover:bg-stone-50 hover:text-stone-700 disabled:opacity-60"
                      >
                        {t.has("externalMealCancelChangePhoto")
                          ? t("externalMealCancelChangePhoto")
                          : "Cancelar"}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode("menu")}
                    className="px-0.5 text-xs font-semibold text-stone-500 underline-offset-2 hover:underline"
                  >
                    Volver
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {step === "review" && liveEstimate ? (
            <div className="space-y-2">
              {previewUrl ? (
                <div className="overflow-hidden rounded-xl border border-stone-100 bg-stone-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Snack"
                    className="h-36 w-full object-cover sm:h-40"
                  />
                </div>
              ) : null}

              <label className="flex items-center gap-2">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  {t.has("externalMealDishNameLabel")
                    ? t("externalMealDishNameLabel")
                    : "Snack"}
                </span>
                <input
                  type="text"
                  value={dishName}
                  onChange={(event) => setDishName(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[13px] font-semibold text-stone-800 outline-none focus:border-[#4D6638] focus:ring-1 focus:ring-[#4D6638]"
                />
              </label>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                    {t.has("externalMealFoodsLabel")
                      ? t("externalMealFoodsLabel")
                      : "Alimentos"}
                  </p>
                  <p className="text-[10px] font-medium text-stone-400">
                    {t.has("externalMealTotals")
                      ? t("externalMealTotals", {
                          kcal: liveEstimate.calorias_est,
                          protein: liveEstimate.proteinas_est_g
                        })
                      : `~${liveEstimate.calorias_est} kcal · ${liveEstimate.proteinas_est_g}g`}
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
                  {foodItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5",
                        index > 0 ? "border-t border-stone-100" : null
                      )}
                    >
                      <p className="min-w-0 flex-1 truncate px-1.5 py-1 text-[12px] font-medium text-stone-800">
                        {item.nombre}
                      </p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          quantityDrafts[item.id] !== undefined
                            ? quantityDrafts[item.id]
                            : String(item.cantidad)
                        }
                        onChange={(event) =>
                          handleQuantityDraftChange(item.id, event.target.value)
                        }
                        onBlur={() => commitQuantityDraft(item.id)}
                        onFocus={(event) => event.currentTarget.select()}
                        className="w-14 shrink-0 rounded-md border border-stone-200 bg-stone-50 px-1 py-1 text-center text-[12px] text-stone-800 outline-none focus:border-[#4D6638] focus:bg-white"
                        aria-label={
                          t.has("externalMealQuantityAria")
                            ? t("externalMealQuantityAria")
                            : "Cantidad"
                        }
                      />
                      <select
                        value={
                          (EXTERNAL_MEAL_UNITS as readonly string[]).includes(item.unidad)
                            ? item.unidad
                            : "g"
                        }
                        onChange={(event) =>
                          updateFoodItem(item.id, { unidad: event.target.value })
                        }
                        className="w-[4.25rem] shrink-0 rounded-md border border-stone-200 bg-stone-50 px-1 py-1 text-[11px] text-stone-700 outline-none focus:border-[#4D6638] focus:bg-white"
                        aria-label={
                          t.has("externalMealUnitAria")
                            ? t("externalMealUnitAria")
                            : "Unidad"
                        }
                      >
                        {EXTERNAL_MEAL_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                        {!(EXTERNAL_MEAL_UNITS as readonly string[]).includes(item.unidad) ? (
                          <option value={item.unidad}>{item.unidad}</option>
                        ) : null}
                      </select>
                      <span className="hidden w-16 shrink-0 text-right text-[10px] text-stone-400 sm:inline">
                        {item.calorias} kcal
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFoodItem(item.id)}
                        disabled={foodItems.length <= 1}
                        className="shrink-0 rounded-md p-1 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        aria-label={
                          t.has("externalMealRemoveFoodAria")
                            ? t("externalMealRemoveFoodAria")
                            : "Quitar alimento"
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {liveEstimate.recomendaciones.length > 0 ? (
                <div
                  className={cn(
                    "rounded-xl border px-2.5 py-2",
                    liveEstimate.balance === "equilibrado"
                      ? "border-emerald-100 bg-emerald-50/70"
                      : liveEstimate.balance === "poco_saludable"
                        ? "border-amber-200 bg-amber-50/80"
                        : "border-[#C49520]/25 bg-[#C49520]/8"
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide",
                      liveEstimate.balance === "equilibrado"
                        ? "text-emerald-800/80"
                        : liveEstimate.balance === "poco_saludable"
                          ? "text-amber-900/80"
                          : "text-[#8A6A16]"
                    )}
                  >
                    {liveEstimate.balance === "equilibrado"
                      ? t.has("snackBalanceOk")
                        ? t("snackBalanceOk")
                        : "Buen snack"
                      : liveEstimate.balance === "poco_saludable"
                        ? t.has("snackBalancePoor")
                          ? t("snackBalancePoor")
                          : "Snack indulgente"
                        : t.has("snackBalanceFair")
                          ? t("snackBalanceFair")
                          : "Snack mejorable"}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {liveEstimate.recomendaciones.map((tip) => (
                      <li key={tip} className="text-[11px] leading-snug text-stone-700">
                        <span className="mr-1 text-[#4D6638]" aria-hidden>
                          ·
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        {mode === "text" || mode === "photo" || step === "review" ? (
          <div className="shrink-0 border-t border-stone-100 px-5 py-4">
            {step === "input" ? (
              <button
                type="button"
                disabled={isAnalyzing || !canAnalyze || !canRegister}
                onClick={() => void handleAnalyze()}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4D6638] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "photo" ? (
                  <Camera className="h-4 w-4" />
                ) : (
                  <PenLine className="h-4 w-4" />
                )}
                {isAnalyzing
                  ? t.has("externalMealAnalyzing")
                    ? t("externalMealAnalyzing")
                    : "Analizando…"
                  : t.has("externalMealAnalyzeCta")
                    ? t("externalMealAnalyzeCta")
                    : "Analizar alimentos"}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setStep("input");
                    setError(null);
                  }}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
                >
                  {t.has("externalMealBack") ? t("externalMealBack") : "Atrás"}
                </button>
                <button
                  type="button"
                  disabled={isSaving || foodItems.length === 0 || !dishName.trim()}
                  onClick={() => void handleConfirmSave()}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#4D6638] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isSaving
                    ? t.has("externalMealSaving")
                      ? t("externalMealSaving")
                      : "Guardando…"
                    : t.has("snackConfirmSave")
                      ? t("snackConfirmSave")
                      : "Guardar snack"}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
