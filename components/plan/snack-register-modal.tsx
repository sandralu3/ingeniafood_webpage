"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, PenLine, Search, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PlanRecipePickerCard } from "@/components/plan/plan-recipe-picker-card";
import { ModalSheetBackButton } from "@/components/ui/modal-sheet-back-button";
import { MealPhotoSourceCards } from "@/components/ui/meal-photo-source-cards";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { PlanRecipePickerSkeleton } from "@/components/skeletons/plan-recipe-picker-skeleton";
import { usePremium } from "@/hooks/use-premium";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import {
  EXTERNAL_MEAL_UNITS,
  applySnackAdvice,
  createExternalMealFoodItem,
  recalculateExternalMealFoodItem,
  normalizeEstimateFoodMacrosFromDensities,
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
import type { PlanSnack } from "@/lib/plan/snack-presets";
import {
  fetchSandraSnackSuggestions,
  normalizeSnackTitle,
  type SnackSuggestion
} from "@/lib/plan/frequent-snacks";
import type { RecipePickerItem } from "@/lib/plan/plan-service";
import {
  addEstimatedSnackToPlan,
  addSuggestedSnackToPlan
} from "@/lib/plan/snack-service";
import { uploadExternalMealPhoto } from "@/lib/plan/upload-external-meal-photo";
import { canRegisterExternalMealForPlanDay } from "@/lib/plan/week-utils";
import {
  buildUnhealthyBalanceAdvisory,
  RecipeAdvisoryPulseButton
} from "@/components/recipes/recipe-advisory-alert";
import { ScanPhotoSheetStage } from "@/components/ui/scan-photo-sheet-stage";
import { SwipeToCloseHandle } from "@/components/ui/swipe-to-close-handle";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

function snackSuggestionToPickerItem(suggestion: SnackSuggestion): RecipePickerItem {
  const recipeId = suggestion.id.startsWith("sandra:")
    ? suggestion.id.slice("sandra:".length)
    : suggestion.id;
  return {
    id: recipeId,
    title: suggestion.title,
    image_url: suggestion.imageUrl ?? null,
    instagram_url: null,
    cooking_time: null,
    is_airfryer: false,
    is_flourless: false,
    created_at: "",
    meal_type: "Snack",
    is_system_recipe: true,
    is_sandra_recipe: true,
    macros: {
      calorias: suggestion.kcal,
      proteinas_g: suggestion.proteinGrams,
      carbohidratos_g: suggestion.carbsGrams,
      grasas_g: suggestion.fatGrams
    }
  };
}

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
  const { isPremium, isLoading: isPremiumLoading, refresh: refreshPremium } = usePremium();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("menu");
  const [step, setStep] = useState<Step>("input");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(true);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyPresetId, setBusyPresetId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SnackSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
    setSearchTerm("");
    setError(null);
    setIsAnalyzing(false);
    setIsSaving(false);
    setBusyPresetId(null);
    setShowSourcePicker(true);
    setShowPremiumPaywall(false);
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
    if (!open) return;

    let cancelled = false;
    const loadSuggestions = async () => {
      setSuggestionsLoading(true);
      try {
        const next = await fetchSandraSnackSuggestions({ limit: 24 });
        if (!cancelled) setSuggestions(next);
      } catch (err) {
        console.warn("[snack-register] suggestions", err);
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    };

    void loadSuggestions();
    return () => {
      cancelled = true;
    };
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

  const unhealthyAdvisory = useMemo(
    () =>
      buildUnhealthyBalanceAdvisory({
        balance: liveEstimate?.balance,
        tips: liveEstimate?.recomendaciones,
        fairLabel:
          liveEstimate?.recommendation_title?.trim() ||
          (t.has("snackBalanceFair") ? t("snackBalanceFair") : "¡Gran combinación de sabores!"),
        poorLabel:
          liveEstimate?.recommendation_title?.trim() ||
          (t.has("snackBalancePoor") ? t("snackBalancePoor") : "¡A disfrutarlo!")
      }),
    [liveEstimate, t]
  );

  const filteredSuggestions = useMemo(() => {
    const needle = normalizeSnackTitle(searchTerm);
    if (!needle) return suggestions;
    return suggestions.filter((item) => normalizeSnackTitle(item.title).includes(needle));
  }, [searchTerm, suggestions]);

  if (!open) return null;

  const requestClose = () => {
    if (isAnalyzing || isSaving || busyPresetId) return;
    onClose();
  };

  const handleFileChange = (file: File | null) => {
    if (!isPremium) {
      setShowPremiumPaywall(true);
      return;
    }
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
    if (!isPremium) {
      setShowPremiumPaywall(true);
      return;
    }
    window.setTimeout(() => cameraInputRef.current?.click(), 0);
  };

  const openGallery = () => {
    if (!isPremium) {
      setShowPremiumPaywall(true);
      return;
    }
    window.setTimeout(() => galleryInputRef.current?.click(), 0);
  };

  const handlePhotoOptionClick = () => {
    if (!canRegister || isPremiumLoading) return;
    if (!isPremium) {
      setShowPremiumPaywall(true);
      return;
    }
    setShowSourcePicker(true);
    setStep("input");
    setMode("photo");
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

  const handleQuickSuggestion = async (suggestion: SnackSuggestion) => {
    if (isAnalyzing || isSaving || busyPresetId) return;
    if (!canRegister) {
      setError(
        t.has("snackFutureDayError")
          ? t("snackFutureDayError")
          : "Solo puedes registrar snacks en hoy o días pasados."
      );
      return;
    }

    setBusyPresetId(suggestion.id);
    setError(null);
    try {
      const user = await requireUser();
      if (!user) return;

      const result = await addSuggestedSnackToPlan({
        userId: user.id,
        dayLabel,
        weekStartISO,
        suggestion
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
      mealType: "snack",
      locale
    };
    if (payloadMode === "text") {
      const trimmed = description.trim();
      if (!isLikelyFoodOrDrinkDescription(trimmed)) {
        setError(foodDescriptionRejectionMessage("snack", "text"));
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
      const rawMessage = data.message?.trim() || "";
      const mentionsImage = /imagen|foto/i.test(rawMessage);
      setError(
        isNotFood && mode === "text" && (mentionsImage || !rawMessage)
          ? foodDescriptionRejectionMessage("snack", "text")
          : rawMessage ||
              (isNotFood
                ? foodDescriptionRejectionMessage("snack", mode === "photo" ? "photo" : "text")
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

      const normalized = normalizeEstimateFoodMacrosFromDensities(nextEstimate);
      setEstimate(normalized);
      setFoodItems(normalized.alimentos);
      setQuantityDrafts({});
      setDishName(normalized.nombre_plato);
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
        if (
          (patch.cantidad != null && patch.cantidad !== item.cantidad) ||
          (patch.unidad != null && patch.unidad !== item.unidad) ||
          (patch.nombre != null && patch.nombre !== item.nombre)
        ) {
          if (patch.cantidad != null) {
            const nextQty = Number(patch.cantidad);
            if (!Number.isFinite(nextQty) || nextQty <= 0) return item;
          }
          return recalculateExternalMealFoodItem(item, {
            cantidad: patch.cantidad,
            unidad: patch.unidad,
            nombre: patch.nombre
          });
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

  const isPhotoSourceStep =
    step === "input" && mode === "photo" && (!previewUrl || showSourcePicker);

  const headerTitle =
    step === "review"
      ? t.has("externalMealReviewTitle")
        ? t("externalMealReviewTitle")
        : "Revisa los alimentos"
      : mode === "photo"
        ? t.has("snackPhotoScreenTitle")
          ? t("snackPhotoScreenTitle")
          : t.has("pickerActionScanPlateTitle")
            ? t("pickerActionScanPlateTitle")
            : "Tomar foto del snack"
        : mode === "text"
          ? t.has("pickerActionQuickLogTitle")
            ? t("pickerActionQuickLogTitle")
            : "Describir lo que comí"
          : t.has("snackRegisterTitle")
            ? t("snackRegisterTitle")
            : "Registrar snack";

  const headerSubtitle =
    step === "review"
      ? t.has("externalMealReviewSubtitle")
        ? t("externalMealReviewSubtitle")
        : "Ajusta cantidades o pesos antes de guardar en tu plan."
      : mode === "photo" && isPhotoSourceStep
        ? t.has("snackPhotoScreenSubtitle")
          ? t("snackPhotoScreenSubtitle")
          : "Elige cámara o galería. Después estimamos calorías y proteínas."
        : mode === "photo" && previewUrl
          ? t.has("snackPhotoPreviewSubtitle")
            ? t("snackPhotoPreviewSubtitle")
            : "Revisa la foto y pulsa Analizar alimentos."
          : mode === "text"
            ? t.has("snackDescriptionCommaHint")
              ? t("snackDescriptionCommaHint")
              : "Si son varios alimentos, sepáralos por comas."
            : t.has("snackRegisterSubtitle")
              ? t("snackRegisterSubtitle")
              : "Añade un tentempié en segundos. Cuenta para el balance del día.";

  const dialogNeedsTallBody =
    step === "review" || mode === "menu" || mode === "text" || !isPhotoSourceStep;

  const showScanPhotoLayout =
    Boolean(previewUrl) &&
    ((step === "input" && mode === "photo" && !showSourcePicker) || step === "review");

  // Misma cáscara que PlanRecipePickerModal (items-end + max-h-[88vh]).
  return (
    <>
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center bg-black/45 px-0 backdrop-blur-[2px] sm:items-center sm:px-4"
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
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl",
          showScanPhotoLayout
            ? "h-[90dvh] max-h-[90dvh] max-w-lg border-0 bg-black sm:h-[min(90dvh,52rem)]"
            : mode === "menu" && step === "input"
              ? "max-h-[92vh] max-w-2xl border border-neutral-100 bg-white"
              : "max-h-[88vh] max-w-lg border border-neutral-100 bg-white"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {showScanPhotoLayout && previewUrl ? (
          <ScanPhotoSheetStage
            imageUrl={previewUrl}
            imageAlt="Snack"
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
            <div className="shrink-0 px-5 pt-0 pb-0">
              <SwipeToCloseHandle
                onClose={requestClose}
                disabled={isAnalyzing || isSaving || Boolean(busyPresetId)}
              />
            </div>

            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 py-3">
              <div className="min-w-0">
                <h2
                  id="snack-register-title"
                  className="font-serif text-lg font-semibold text-stone-900"
                >
                  {headerTitle}
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">{headerSubtitle}</p>
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

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-5 py-3 touch-pan-y [-webkit-overflow-scrolling:touch]">
              {step === "input" && mode === "photo" ? (
                <div className="space-y-3">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    aria-label={
                      t.has("externalMealTakePhoto")
                        ? t("externalMealTakePhoto")
                        : "Tomar Foto"
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
                </div>
              ) : null}

              {step === "review" && liveEstimate ? (
                <div className="space-y-2">
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
                </div>
              ) : null}

              {error ? (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </p>
              ) : null}
            </div>

            <div
              className={cn(
                "shrink-0 border-t border-stone-100 px-5",
                isPhotoSourceStep ? "py-3" : "py-4"
              )}
            >
              {step === "input" ? (
                <div className="flex gap-2">
                  <ModalSheetBackButton
                    disabled={isAnalyzing || Boolean(busyPresetId)}
                    label={t.has("externalMealBack") ? t("externalMealBack") : "Atrás"}
                    onClick={() => {
                      setMode("menu");
                      setError(null);
                    }}
                  />
                  <button
                    type="button"
                    disabled={isAnalyzing || !canAnalyze || !canRegister}
                    onClick={() => void handleAnalyze()}
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#4D6638] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105",
                      "disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {isAnalyzing
                      ? t.has("externalMealAnalyzing")
                        ? t("externalMealAnalyzing")
                        : "Analizando…"
                      : t.has("externalMealAnalyzeCta")
                        ? t("externalMealAnalyzeCta")
                        : "Analizar alimentos"}
                  </button>
                </div>
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
                      : t.has("snackConfirmSave")
                        ? t("snackConfirmSave")
                        : "Guardar snack"}
                  </button>
                </div>
              )}
            </div>
          </ScanPhotoSheetStage>
        ) : (
          <>
        <div className="shrink-0 px-5 pt-0 pb-0">
          <SwipeToCloseHandle
            onClose={requestClose}
            disabled={isAnalyzing || isSaving || Boolean(busyPresetId)}
          />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 py-3">
          <div className="min-w-0">
            <h2 id="snack-register-title" className="font-serif text-lg font-semibold text-stone-900">
              {headerTitle}
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">{headerSubtitle}</p>
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

        <div
          className={cn(
            "min-h-0 space-y-3 overflow-y-auto overscroll-y-contain px-5 py-3 touch-pan-y [-webkit-overflow-scrolling:touch]",
            dialogNeedsTallBody ? "flex-1" : "shrink-0"
          )}
        >
          {!canRegister ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t.has("snackFutureDayHint")
                ? t("snackFutureDayHint")
                : "Solo puedes registrar snacks en hoy o días pasados."}
            </p>
          ) : null}

          {step === "input" && mode === "menu" ? (
            <>
              <div className="space-y-2 rounded-2xl border border-stone-200/80 bg-[#FAF8F5] px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-300/70" />
                  <p className="shrink-0 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    {t.has("externalMealAlreadyAteLabel")
                      ? t("externalMealAlreadyAteLabel")
                      : "¿Ya comiste? Regístralo aquí"}
                  </p>
                  <div className="h-px flex-1 bg-stone-300/70" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!canRegister || isPremiumLoading}
                    onClick={handlePhotoOptionClick}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl border border-sky-100 bg-sky-50/70 px-1.5 py-2 text-center transition",
                      "hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <Camera className="h-5 w-5 text-sky-700" strokeWidth={1.75} />
                    <span className="text-[11px] font-semibold leading-snug text-sky-900">
                      {t.has("pickerActionScanPlateTitle")
                        ? t("pickerActionScanPlateTitle")
                        : "Tomar foto del plato"}
                    </span>
                    <span className="text-[9px] leading-snug text-sky-800/80">
                      {t.has("pickerActionScanPlateSubtitle")
                        ? t("pickerActionScanPlateSubtitle")
                        : "Toma una foto y lo registramos por ti"}
                    </span>
                    {!isPremium ? (
                      <span className="text-[9px] font-bold tracking-wide text-amber-800">
                        👑 PRO
                      </span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    disabled={!canRegister}
                    onClick={() => {
                      setStep("input");
                      setMode("text");
                    }}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl border border-violet-100 bg-violet-50/70 px-1.5 py-2 text-center transition",
                      "hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <PenLine className="h-5 w-5 text-violet-700" strokeWidth={1.75} />
                    <span className="text-[11px] font-semibold leading-snug text-violet-900">
                      {t.has("pickerActionQuickLogTitle")
                        ? t("pickerActionQuickLogTitle")
                        : "Describir lo que comí"}
                    </span>
                    <span className="text-[9px] leading-snug text-violet-800/80">
                      {t.has("pickerActionQuickLogSubtitle")
                        ? t("pickerActionQuickLogSubtitle")
                        : "Añade tu comida en segundos"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-200" />
                  <p className="shrink-0 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    {t.has("snackSandraSectionLabel")
                      ? t("snackSandraSectionLabel")
                      : "Snacks de Sandra"}
                  </p>
                  <div className="h-px flex-1 bg-stone-200" />
                </div>

                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={
                      t.has("snackSearchPlaceholder")
                        ? t("snackSearchPlaceholder")
                        : t.has("searchPlaceholder")
                          ? t("searchPlaceholder")
                          : "Buscar snack..."
                    }
                    className="w-full rounded-full border border-stone-200/80 bg-white py-2 pl-9 pr-3 text-[11px] text-stone-700 shadow-sm outline-none placeholder:text-stone-400 transition focus:border-[#4C6B3F] focus:ring-1 focus:ring-[#4C6B3F]"
                  />
                </label>

                {suggestionsLoading && suggestions.length === 0 ? (
                  <PlanRecipePickerSkeleton cards={6} />
                ) : null}

                {!suggestionsLoading && suggestions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-stone-200 bg-white px-3 py-4 text-center text-xs text-stone-500">
                    {t.has("snackSandraEmpty")
                      ? t("snackSandraEmpty")
                      : "Aún no hay snacks publicados en el banco de Sandra."}
                  </p>
                ) : null}

                {!suggestionsLoading &&
                suggestions.length > 0 &&
                filteredSuggestions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-stone-200 bg-white px-3 py-4 text-center text-xs text-stone-500">
                    {t.has("snackSearchEmpty")
                      ? t("snackSearchEmpty")
                      : "No hay snacks con ese nombre."}
                  </p>
                ) : null}

                {filteredSuggestions.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    {filteredSuggestions.map((suggestion) => (
                      <PlanRecipePickerCard
                        key={suggestion.id}
                        recipe={snackSuggestionToPickerItem(suggestion)}
                        disabled={!canRegister || busyPresetId !== null}
                        onSelect={() => void handleQuickSuggestion(suggestion)}
                      />
                    ))}
                  </div>
                ) : null}
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
                </div>
              ) : (
                <MealPhotoSourceCards
                  disabled={isAnalyzing}
                  showCancel={Boolean(previewUrl)}
                  takePhotoLabel={
                    t.has("externalMealTakePhoto")
                      ? t("externalMealTakePhoto")
                      : "Tomar foto"
                  }
                  galleryLabel={
                    t.has("externalMealChooseGallery")
                      ? t("externalMealChooseGallery")
                      : "Elegir de galería"
                  }
                  takePhotoHint={
                    t.has("snackPhotoCameraHint")
                      ? t("snackPhotoCameraHint")
                      : "Abre la cámara ahora"
                  }
                  galleryHint={
                    t.has("snackPhotoGalleryHint")
                      ? t("snackPhotoGalleryHint")
                      : "Usa una foto que ya tengas"
                  }
                  sectionLabel={
                    t.has("snackAddPhotoTitle")
                      ? t("snackAddPhotoTitle")
                      : "Añadir foto del snack"
                  }
                  cancelLabel={
                    t.has("externalMealCancelChangePhoto")
                      ? t("externalMealCancelChangePhoto")
                      : "Cancelar"
                  }
                  onTakePhoto={openCamera}
                  onChooseGallery={openGallery}
                  onCancel={() => setShowSourcePicker(false)}
                />
              )}
            </div>
          ) : null}

          {step === "review" && liveEstimate ? (
            <div className="space-y-2">
              {previewUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-stone-100 bg-stone-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Snack"
                    className="h-36 w-full object-cover sm:h-40"
                  />
                  {unhealthyAdvisory ? (
                    <RecipeAdvisoryPulseButton
                      message={unhealthyAdvisory.message}
                      tone={unhealthyAdvisory.tone}
                      title={unhealthyAdvisory.title}
                    />
                  ) : null}
                </div>
              ) : unhealthyAdvisory ? (
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
                        : "Hay una advertencia sobre este snack"
                      : t.has("externalMealInfoHint")
                        ? t("externalMealInfoHint")
                        : "Hay una sugerencia sobre este snack"}
                  </p>
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

            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        {mode === "text" || mode === "photo" || step === "review" ? (
          <div
            className={cn(
              "shrink-0 border-t border-stone-100 px-5",
              isPhotoSourceStep ? "py-3" : "py-4"
            )}
          >
            {step === "input" ? (
              isPhotoSourceStep ? (
                <ModalSheetBackButton
                  disabled={isAnalyzing || Boolean(busyPresetId)}
                  label={t.has("externalMealBack") ? t("externalMealBack") : "Atrás"}
                  onClick={() => {
                    setMode("menu");
                    setError(null);
                  }}
                  className="w-full justify-center"
                />
              ) : (
                <div className="flex gap-2">
                  <ModalSheetBackButton
                    disabled={isAnalyzing || Boolean(busyPresetId)}
                    label={t.has("externalMealBack") ? t("externalMealBack") : "Atrás"}
                    onClick={() => {
                      setMode("menu");
                      setError(null);
                    }}
                  />
                  <button
                    type="button"
                    disabled={isAnalyzing || !canAnalyze || !canRegister}
                    onClick={() => void handleAnalyze()}
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#4D6638] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105",
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
                </div>
              )
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
                    : t.has("snackConfirmSave")
                      ? t("snackConfirmSave")
                      : "Guardar snack"}
                </button>
              </div>
            )}
          </div>
        ) : null}
          </>
        )}
      </div>
    </div>

      <PremiumUpgradeDialog
        open={showPremiumPaywall}
        onClose={() => setShowPremiumPaywall(false)}
        onUpgraded={() => {
          setShowPremiumPaywall(false);
          void refreshPremium();
        }}
        featureLabel={
          t.has("snackPhotoPremiumFeature")
            ? t("snackPhotoPremiumFeature")
            : "Foto instantánea de snacks"
        }
      />
    </>
  );
}
