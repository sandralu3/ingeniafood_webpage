"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, PenLine, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { PlanMeal } from "@/components/plan/plan-meal-card";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import {
  EXTERNAL_MEAL_UNITS,
  applyExternalMealAdvice,
  createExternalMealFoodItem,
  planMealsToExistingItems,
  scaleExternalMealFoodItem,
  withEditedExternalMealFoods,
  type ExistingMealItem,
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
import { registerExternalMealToPlan } from "@/lib/plan/register-external-meal";
import { uploadExternalMealPhoto } from "@/lib/plan/upload-external-meal-photo";
import { canRegisterExternalMealForPlanDay } from "@/lib/plan/week-utils";
import {
  buildUnhealthyBalanceAdvisory,
  RecipeAdvisoryPulseButton
} from "@/components/recipes/recipe-advisory-alert";
import { ModalSheetBackButton } from "@/components/ui/modal-sheet-back-button";
import { PhotoSourcePicker } from "@/components/ui/photo-source-picker";
import { ScanPhotoSheetStage } from "@/components/ui/scan-photo-sheet-stage";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type Mode = "photo" | "text";
type Step = "input" | "review";

type Props = {
  open: boolean;
  mode: Mode;
  dayLabel: WeekDay;
  mealType: MealType;
  weekStartISO: string;
  /** Si existe, sustituye esta entrada del plan en lugar de añadir. */
  replacePlanEntryId?: string;
  /** Platos ya registrados en este bloque de comida (para consejo acumulado). */
  existingSlotMeals?: PlanMeal[];
  onClose: () => void;
  onRegistered: (meal: PlanMeal) => void;
  /** true mientras analiza o guarda: el padre no debe desmontar el modal. */
  onBusyChange?: (busy: boolean) => void;
};

type EstimateApiResponse = {
  estimate?: ExternalMealEstimate;
  error?: string;
  message?: string;
  code?: string;
};

export function ExternalMealRegisterModal({
  open,
  mode,
  dayLabel,
  mealType,
  weekStartISO,
  replacePlanEntryId,
  existingSlotMeals = [],
  onClose,
  onRegistered,
  onBusyChange
}: Props) {
  const t = useTranslations("Plan");
  const locale = useLocale();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("input");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<ExternalMealEstimate | null>(null);
  const [foodItems, setFoodItems] = useState<ExternalMealFoodItem[]>([]);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [dishName, setDishName] = useState("");

  const existingMealItems = useMemo<ExistingMealItem[]>(
    () =>
      planMealsToExistingItems(existingSlotMeals, {
        excludeId: replacePlanEntryId
      }),
    [existingSlotMeals, replacePlanEntryId]
  );

  const resetState = () => {
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
    setShowSourcePicker(true);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  useEffect(() => {
    if (!open) {
      // Si cerraron el padre por error mientras analizábamos, no perder el draft
      // hasta que deje de estar busy — el padre ya bloquea close; aquí solo reset limpio.
      if (isAnalyzing || isSaving) return;
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when closing/opening
  }, [open]);

  useEffect(() => {
    onBusyChange?.(isAnalyzing || isSaving);
  }, [isAnalyzing, isSaving, onBusyChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isAnalyzing || isSaving) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isAnalyzing, isSaving, onClose, open]);

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
    return withEditedExternalMealFoods(withName, foodItems, { existingMealItems });
  }, [dishName, estimate, existingMealItems, foodItems]);

  const unhealthyAdvisory = useMemo(
    () =>
      buildUnhealthyBalanceAdvisory({
        balance: liveEstimate?.balance,
        tips: liveEstimate?.recomendaciones,
        fairLabel:
          liveEstimate?.recommendation_title?.trim() ||
          (t.has("externalMealBalanceFair")
            ? t("externalMealBalanceFair")
            : "¡Gran combinación de sabores!"),
        poorLabel:
          liveEstimate?.recommendation_title?.trim() ||
          (t.has("externalMealBalancePoor")
            ? t("externalMealBalancePoor")
            : "¡A disfrutarlo!")
      }),
    [liveEstimate, t]
  );

  if (!open) return null;

  const requestClose = () => {
    if (isAnalyzing || isSaving) return;
    onClose();
  };

  const title =
    mode === "photo"
      ? t.has("externalMealScanTitle")
        ? t("externalMealScanTitle")
        : "📸 Escanear plato servido"
      : t.has("externalMealQuickTitle")
        ? t("externalMealQuickTitle")
        : "✍️ Registrar comida rápida";

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

  const estimateMeal = async (): Promise<ExternalMealEstimate | null> => {
    const payload: Record<string, unknown> = { mode, locale, mealType };
    if (existingMealItems.length > 0) {
      payload.existingMealItems = existingMealItems;
    }
    if (mode === "text") {
      const trimmed = description.trim();
      if (!isLikelyFoodOrDrinkDescription(trimmed)) {
        setError(foodDescriptionRejectionMessage("meal"));
        return null;
      }
      if (descriptionNeedsCommaSeparation(trimmed)) {
        setError(
          t.has("externalMealDescriptionCommaError")
            ? t("externalMealDescriptionCommaError")
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
            : "Toma o elige una foto del plato."
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
            ? foodDescriptionRejectionMessage("meal")
            : data.error && data.error !== "NOT_FOOD"
              ? data.error
              : t.has("externalMealEstimateError")
                ? t("externalMealEstimateError")
                : "No pudimos estimar la comida.")
      );
      return null;
    }

    const next = applyExternalMealAdvice(
      {
        ...data.estimate,
        alimentos: Array.isArray(data.estimate.alimentos) ? data.estimate.alimentos : [],
        balance: data.estimate.balance ?? "mejorable",
        recomendaciones: Array.isArray(data.estimate.recomendaciones)
          ? data.estimate.recomendaciones
          : [],
        pasos_ordenados: Array.isArray(data.estimate.pasos_ordenados)
          ? data.estimate.pasos_ordenados
              .filter((step): step is string => typeof step === "string" && step.trim().length > 0)
              .map((step) => step.trim())
          : undefined,
        tiempo_preparacion:
          typeof data.estimate.tiempo_preparacion === "string"
            ? data.estimate.tiempo_preparacion
            : undefined,
        tip_sandra:
          typeof data.estimate.tip_sandra === "string" ? data.estimate.tip_sandra : undefined
      },
      { existingMealItems }
    );
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
    return applyExternalMealAdvice(next, { existingMealItems });
  };

  const handleAnalyze = async () => {
    if (isAnalyzing || isSaving) return;
    setIsAnalyzing(true);
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

      const nextEstimate = await estimateMeal();
      if (!nextEstimate) return;

      setEstimate(nextEstimate);
      setFoodItems(nextEstimate.alimentos);
      setQuantityDrafts({});
      setDishName(nextEstimate.nombre_plato);
      setStep("review");
    } catch (err) {
      console.error("[external-meal] analyze", err);
      setError(
        t.has("externalMealEstimateError")
          ? t("externalMealEstimateError")
          : "No pudimos analizar la comida."
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
    // Permitir borrar / reescribir (coma o punto decimal).
    if (raw !== "" && !/^\d*[.,]?\d*$/.test(raw)) return;
    setQuantityDrafts((current) => ({ ...current, [id]: raw }));

    const normalized = raw.replace(",", ".");
    if (normalized === "" || normalized === "." || normalized.endsWith(".")) return;
    const nextQty = Number(normalized);
    if (!Number.isFinite(nextQty) || nextQty <= 0) return;
    updateFoodItem(id, { cantidad: nextQty });
  };

  const commitQuantityDraft = (id: string, _fallback: number) => {
    const raw = quantityDrafts[id];
    setQuantityDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (raw == null) return;
    const nextQty = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      // Vacío o inválido: se mantiene la cantidad anterior al salir del campo.
      return;
    }
    updateFoodItem(id, { cantidad: nextQty });
  };

  const removeFoodItem = (id: string) => {
    setFoodItems((current) => (current.length <= 1 ? current : current.filter((item) => item.id !== id)));
  };

  const handleConfirmSave = async () => {
    if (!liveEstimate || isSaving || isAnalyzing) return;
    setIsSaving(true);
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
        estimate: liveEstimate,
        dayLabel,
        mealType,
        weekStartISO,
        imageUrl: plateImageUrl,
        replacePlanEntryId
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onRegistered(result.meal);
      onClose();
    } catch (err) {
      console.error("[external-meal] save", err);
      setError(
        t.has("externalMealEstimateError")
          ? t("externalMealEstimateError")
          : "No pudimos registrar la comida."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const canAnalyze =
    mode === "text" ? description.trim().length >= 3 : Boolean(selectedFile);

  const isPhotoSourceStep =
    step === "input" && mode === "photo" && (!previewUrl || showSourcePicker);
  // En modo texto no queremos que el cuerpo se estire (reduce el espacio en blanco).
  const dialogNeedsTallBody =
    step === "review" || (mode === "photo" && !isPhotoSourceStep);

  /** Misma experiencia que el escáner de alimentos (foto redondeada + sheet). */
  const showScanPhotoLayout =
    Boolean(previewUrl) &&
    ((step === "input" && mode === "photo" && !showSourcePicker) || step === "review");

  const photoFileInputs =
    mode === "photo" ? (
      <>
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
      </>
    ) : null;

  const sheetHandle = (
    <div className="shrink-0 px-5 pt-0 pb-0">
      <SwipeToCloseHandle
        onClose={requestClose}
        disabled={isAnalyzing || isSaving}
      />
    </div>
  );

  const sheetHeader = (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 py-3">
      <div>
        <h2 id="external-meal-title" className="font-serif text-lg font-semibold text-stone-900">
          {step === "review"
            ? t.has("externalMealReviewTitle")
              ? t("externalMealReviewTitle")
              : "Revisa los alimentos"
            : title}
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">
          {step === "review"
            ? t.has("externalMealReviewSubtitle")
              ? t("externalMealReviewSubtitle")
              : "Ajusta cantidades o pesos antes de guardar en tu plan."
            : t.has("externalMealSubtitle")
              ? t("externalMealSubtitle")
              : "Estimamos calorías y proteínas para mantener el balance del día."}
        </p>
      </div>
      <button
        type="button"
        onClick={requestClose}
        disabled={isAnalyzing || isSaving}
        className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 disabled:opacity-50"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const sheetFooter = (
    <div
      className={cn(
        "shrink-0 border-t border-stone-100 px-5",
        isPhotoSourceStep ? "py-3" : "py-4"
      )}
    >
      {step === "input" ? (
        <button
          type="button"
          disabled={isAnalyzing || !canAnalyze}
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
              : "Analizando plato…"
            : t.has("externalMealAnalyzeCta")
              ? t("externalMealAnalyzeCta")
              : "Analizar alimentos"}
        </button>
      ) : (
        <div className="flex gap-2">
          <ModalSheetBackButton
            disabled={isSaving}
            label={t.has("externalMealBack") ? t("externalMealBack") : "Atrás"}
            onClick={() => {
              setStep("input");
              setError(null);
            }}
          />
          <button
            type="button"
            disabled={isSaving || foodItems.length === 0 || !dishName.trim()}
            onClick={() => void handleConfirmSave()}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#4D6638] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving
              ? t.has("externalMealSaving")
                ? t("externalMealSaving")
                : "Guardando…"
              : t.has("externalMealConfirm")
                ? t("externalMealConfirm")
                : "Guardar y asignar al plan"}
          </button>
        </div>
      )}
    </div>
  );

  const sheetBody = (
    <div
      className={cn(
        "min-h-0 space-y-3 overflow-y-auto overscroll-y-contain px-5 py-3 touch-pan-y [-webkit-overflow-scrolling:touch]",
        dialogNeedsTallBody || showScanPhotoLayout ? "flex-1" : "shrink-0"
      )}
    >
      {step === "input" && mode === "photo" && !showScanPhotoLayout ? (
        <div className="space-y-3">
          {photoFileInputs}
          <PhotoSourcePicker
            title={
              t.has("externalMealAddPhotoTitle")
                ? t("externalMealAddPhotoTitle")
                : "Añadir foto del plato"
            }
            takePhotoLabel={
              t.has("externalMealTakePhoto") ? t("externalMealTakePhoto") : "Tomar Foto"
            }
            galleryLabel={
              t.has("externalMealChooseGallery")
                ? t("externalMealChooseGallery")
                : "Elegir de la Galería"
            }
            cancelLabel={
              t.has("externalMealCancelChangePhoto")
                ? t("externalMealCancelChangePhoto")
                : "Cancelar"
            }
            showCancel={Boolean(previewUrl)}
            disabled={isAnalyzing}
            onTakePhoto={openCamera}
            onChooseGallery={openGallery}
            onCancel={() => setShowSourcePicker(false)}
          />
        </div>
      ) : null}

      {step === "input" && mode === "photo" && showScanPhotoLayout ? (
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
      ) : null}

      {step === "input" && mode === "text" ? (
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
              setEstimate(null);
              setFoodItems([]);
              setQuantityDrafts({});
              setError(null);
            }}
            rows={3}
            placeholder={
              t.has("externalMealDescriptionPlaceholder")
                ? t("externalMealDescriptionPlaceholder")
                : "Ej.: 200 g pechuga, arroz, ensalada"
            }
            className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-[#4D6638] focus:ring-1 focus:ring-[#4D6638]"
          />
          <p className="text-[11px] leading-snug text-stone-500">
            {t.has("externalMealDescriptionCommaHint")
              ? t("externalMealDescriptionCommaHint")
              : "Si son varios alimentos, sepáralos por comas para identificarlos mejor."}
          </p>
        </label>
      ) : null}

      {step === "review" && liveEstimate ? (
        <div className="space-y-2">
          {!showScanPhotoLayout && unhealthyAdvisory ? (
            <div
              className={
                unhealthyAdvisory.tone === "warning"
                  ? "relative h-14 overflow-hidden rounded-xl border border-amber-100 bg-amber-50/50"
                  : "relative h-14 overflow-hidden rounded-xl border border-sky-100 bg-sky-50/50"
              }
            >
              <RecipeAdvisoryPulseButton
                message={unhealthyAdvisory.message}
                tone={unhealthyAdvisory.tone}
                title={unhealthyAdvisory.title}
                positionClassName="right-3 top-1/2 -translate-y-1/2"
              />
              <p
                className={
                  unhealthyAdvisory.tone === "warning"
                    ? "flex h-full items-center pl-4 pr-14 text-[11px] font-medium text-amber-900/80"
                    : "flex h-full items-center pl-4 pr-14 text-[11px] font-medium text-sky-900/80"
                }
              >
                {unhealthyAdvisory.tone === "warning"
                  ? t.has("externalMealAdviceHint")
                    ? t("externalMealAdviceHint")
                    : "Hay una advertencia sobre este plato"
                  : t.has("externalMealInfoHint")
                    ? t("externalMealInfoHint")
                    : "Hay una sugerencia sobre este plato"}
              </p>
            </div>
          ) : null}

          <label className="flex items-center gap-2">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-stone-400">
              {t.has("externalMealDishNameLabel")
                ? t("externalMealDishNameLabel")
                : "Plato"}
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
                    onBlur={() => commitQuantityDraft(item.id, item.cantidad)}
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

          {liveEstimate.pasos_ordenados && liveEstimate.pasos_ordenados.length >= 2 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#556B2F]">
                  {t.has("externalMealPrepLabel")
                    ? t("externalMealPrepLabel")
                    : "Preparación"}
                </p>
                {liveEstimate.tiempo_preparacion ? (
                  <p className="text-[10px] font-medium text-stone-400">
                    {liveEstimate.tiempo_preparacion}
                  </p>
                ) : null}
              </div>
              <p className="px-0.5 text-[10px] leading-snug text-stone-500">
                {t.has("externalMealPrepHint")
                  ? t("externalMealPrepHint")
                  : "Pasos generados para publicar como Receta de Sandra."}
              </p>
              <ol className="space-y-2 overflow-hidden rounded-xl border border-[#556B2F]/20 bg-[#eef4e6]/40 px-3 py-2.5">
                {liveEstimate.pasos_ordenados.map((paso, index) => (
                  <li key={`prep-${index}`} className="flex gap-2 text-[12px] leading-snug text-stone-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#556B2F] text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5">{paso}</span>
                  </li>
                ))}
              </ol>
              {liveEstimate.tip_sandra?.trim() ? (
                <p className="rounded-lg bg-white/80 px-2.5 py-2 text-[11px] leading-snug text-stone-600 ring-1 ring-stone-200/80">
                  <span className="font-semibold text-[#556B2F]">Tip: </span>
                  {liveEstimate.tip_sandra.trim()}
                </p>
              ) : null}
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
  );

  return (
    <div
      className="fixed inset-0 z-[170] flex items-end justify-center bg-black/50 px-0 backdrop-blur-[2px] sm:items-center sm:px-4"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="external-meal-title"
        className={cn(
          "self-end flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl",
          showScanPhotoLayout
            ? "h-[90dvh] max-h-[90dvh] border-0 bg-black sm:h-[min(90dvh,52rem)]"
            : cn(
                "border border-stone-100 bg-white",
                dialogNeedsTallBody
                  ? "h-[90dvh] max-h-[90dvh] sm:h-auto sm:max-h-[85vh]"
                  : "max-h-[90dvh] sm:max-h-[85vh]"
              )
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {showScanPhotoLayout && previewUrl ? (
          <>
            {photoFileInputs}
            <ScanPhotoSheetStage
              imageUrl={previewUrl}
              imageAlt="Plato"
              className="min-h-0 flex-1"
              sheetMaxClassName="max-h-[min(62dvh,32rem)]"
              overlay={
                step === "review" && unhealthyAdvisory ? (
                  <RecipeAdvisoryPulseButton
                    message={unhealthyAdvisory.message}
                    tone={unhealthyAdvisory.tone}
                    title={unhealthyAdvisory.title}
                  />
                ) : null
              }
            >
              {sheetHandle}
              {sheetHeader}
              {sheetBody}
              {sheetFooter}
            </ScanPhotoSheetStage>
          </>
        ) : (
          <>
            {sheetHandle}
            {sheetHeader}
            {sheetBody}
            {sheetFooter}
          </>
        )}
      </div>
    </div>
  );
}
