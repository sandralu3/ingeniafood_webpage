"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PantrySearchView } from "@/components/scanner/pantry-search-view";
import { GenerationsLimitModal } from "@/components/scanner/generations-limit-modal";
import { InstagramCuratedCatalog } from "@/components/scanner/instagram-curated-catalog";
import { RecipeGenerationState } from "@/components/scanner/recipe-generation-state";
import { RecipeResultView } from "@/components/scanner/recipe-result-view";
import { ScannerModeTabs, type ScannerMode } from "@/components/scanner/scanner-mode-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { UNLIMITED_GENERATIONS_SENTINEL } from "@/lib/generations/constants";
import { hasUnlimitedGenerations } from "@/lib/generations/admin-unlimited";
import { completePendingPlanAssignment } from "@/lib/plan/complete-pending-assignment";
import {
  clearPendingPlanAssignment,
  consumeScannerInitialMode,
  readPendingPlanAssignment,
  type PendingPlanAssignment
} from "@/lib/plan/plan-pending-assignment";
import {
  FREE_DEFAULT_COMPLEXITY,
  FREE_DEFAULT_CUISINE_STYLE,
  FREE_DEFAULT_MEAL_TYPE,
  FREE_DEFAULT_SERVINGS,
  type AppliedRecipeFilters,
  type RecipeComplexity,
  type RecipeCuisineStyle,
  type RecipeMealType,
  type RecipeServings
} from "@/lib/recipes/premium-recipe-filters";
import { translateMealType } from "@/lib/i18n/filter-labels";
import { formatPendingPlanSlot } from "@/lib/i18n/plan-pending-label";
import { tagsToLegacyFlags } from "@/lib/recipes/recipe-tags";
import {
  formatIngredientLinesForDisplay,
  stringsToStructuredIngredients,
  structuredIngredientsToJson
} from "@/lib/recipes/structured-ingredients";
import { type RecipeMacros } from "@/lib/recipes/recipe-macros";
import { saveGeneratedRecipeToLibrary, parseCookingMinutesFromLabel } from "@/lib/recipes/save-generated-recipe";
import { completeScanPantryChallengeIfConfigured } from "@/lib/gamification/scan-pantry-challenge";
import { usePremium } from "@/hooks/use-premium";
import { useScannerReset } from "@/lib/scanner/scanner-reset-context";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type GeneratedRecipe = {
  titulo: string;
  tiempo_preparacion: string;
  ingredientes_detallados: string[];
  pasos_ordenados: string[];
  tip_sandra: string;
  tags?: string[];
  macronutrientes?: RecipeMacros | null;
  imageUrl?: string | null;
  referenceImageUrl?: string | null;
};

type ApiPayload = {
  recipe?: GeneratedRecipe;
  error?: string;
  details?: string;
  code?: string;
  mensaje?: string;
  generationsLeft?: number;
  appliedFilters?: AppliedRecipeFilters;
  premiumTrialRemaining?: number;
  referenceImageUrl?: string | null;
  imageUrl?: string | null;
  imageGenerationError?: string;
  dishPhotoPending?: boolean;
  savedRecipeId?: string | null;
  savedRecipe?: { id: string } | null;
  mealTypeAdvisory?: string;
};

const DISH_PHOTO_POLL_INTERVAL_MS = 3000;
const DISH_PHOTO_POLL_MAX_ATTEMPTS = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function compressImageForUpload(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Lectura de imagen inválida"));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Error al leer la imagen"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para compresión"));
    img.src = dataUrl;
  });

  const maxDimension = 1200;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo inicializar el canvas");

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.8;
  let compressed = canvas.toDataURL("image/jpeg", quality);
  const maxLength = 3_500_000;
  while (compressed.length > maxLength && quality > 0.45) {
    quality -= 0.1;
    compressed = canvas.toDataURL("image/jpeg", quality);
  }

  const match = compressed.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("No se pudo generar la imagen comprimida");

  return { mimeType: "image/jpeg", base64: match[2].replace(/\s/g, "") };
}

function extractRetrySeconds(details?: string): number {
  if (!details) return 30;
  const retryInMatch = details.match(/retry in\s+([\d.]+)s/i);
  if (retryInMatch?.[1]) {
    return Math.max(1, Math.ceil(Number(retryInMatch[1])));
  }
  const retryDelayMatch = details.match(/"retryDelay":"(\d+)s"/i);
  if (retryDelayMatch?.[1]) {
    return Math.max(1, Number(retryDelayMatch[1]));
  }
  return 30;
}

function isHardQuotaExceeded(details?: string): boolean {
  if (!details) return false;
  return /limit:\s*0/i.test(details) || /quota exceeded/i.test(details);
}

function resolveErrorMessage(
  status: number,
  payload: ApiPayload,
  isNetworkError: boolean,
  rateLimitSeconds?: number
): string {
  if (isNetworkError) {
    return "No tienes conexión a internet o el servicio no está disponible.";
  }
  if (payload.code === "GENERATIONS_EXHAUSTED") {
    return (
      payload.error ??
      "Has completado tus 5 pruebas gratuitas. ¡Gracias por formar parte de IngeniaFood! Muy pronto abriremos la versión premium."
    );
  }
  if (payload.code === "UNAUTHORIZED") {
    return "Debes iniciar sesión para generar recetas.";
  }
  if (payload.code === "INCOMPLETE_RESPONSE") {
    return "Respuesta incompleta del servidor, reintentando...";
  }
  if (payload.code === "PARSING_ERROR") {
    return "La IA respondió pero el formato no es válido. Intenta con otros ingredientes.";
  }
  if (payload.code === "NOT_FOOD" || payload.error === "NOT_FOOD") {
    return "🍎 ¡Ups! No hemos detectado ningún ingrediente en la foto. Por favor, asegúrate de enfocar bien tus alimentos para que pueda ayudarte con una receta.";
  }
  if (payload.code === "INVALID_INGREDIENT" || payload.error === "ingrediente_invalido") {
    return (
      payload.mensaje ??
      "Parece que hay algo en tu despensa que no es un alimento válido. ¡Revisa tus ingredientes seleccionados e inténtalo de nuevo!"
    );
  }
  if (payload.code === "MEAL_TYPE_MISMATCH" || payload.error === "tipo_plato_incompatible") {
    return (
      payload.mensaje ??
      "Los ingredientes no encajan con el tipo de plato seleccionado. Cambia el filtro o prueba con otros alimentos."
    );
  }
  if (status === 503) {
    return "El servidor de Google está saturado (Demanda alta). Por favor, intenta de nuevo en unos segundos.";
  }
  if (status === 429) {
    if (isHardQuotaExceeded(payload.details)) {
      return "Servicio de IA temporalmente sin cuota disponible. Intenta de nuevo más tarde.";
    }
    return rateLimitSeconds && rateLimitSeconds > 0
      ? `Sandra está muy solicitada ahora. Reintenta en ${rateLimitSeconds}s.`
      : "Has alcanzado el límite de consultas gratuitas. Espera un momento.";
  }
  if (payload.code === "HTTP_TEXT_ERROR") {
    return "No se pudo completar la generación de receta por ahora. Inténtalo nuevamente.";
  }
  return (
    (payload.error && payload.error !== "NOT_FOOD" ? payload.error : undefined) ??
    "No pudimos generar la receta con los ingredientes seleccionados. Inténtalo de nuevo."
  );
}

export default function ScannerPage() {
  const t = useTranslations("Scanner");
  const tPlan = useTranslations("Plan");
  const locale = useLocale();
  const scannerReset = useScannerReset();
  const { refresh: refreshPremium, isTester, isPaidPremium, openaiPhotoCredits } = usePremium();
  const dishPhotoChoiceRef = useRef(false);
  const [showPhotoCreditConfirm, setShowPhotoCreditConfirm] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [pantryImageFile, setPantryImageFile] = useState<File | null>(null);
  const [recipeFromPhoto, setRecipeFromPhoto] = useState(false);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [showNotFoodGuidance, setShowNotFoodGuidance] = useState(false);
  const [showInvalidIngredientAlert, setShowInvalidIngredientAlert] = useState(false);
  const [invalidIngredientMessage, setInvalidIngredientMessage] = useState<string | null>(null);
  const [showMealTypeMismatchAlert, setShowMealTypeMismatchAlert] = useState(false);
  const [mealTypeMismatchMessage, setMealTypeMismatchMessage] = useState<string | null>(null);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [isRecipeSaved, setIsRecipeSaved] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);
  const [generationsLeft, setGenerationsLeft] = useState<number | null>(null);
  const [showGenerationsModal, setShowGenerationsModal] = useState(false);
  const [mealTypeFilter, setMealTypeFilter] = useState<RecipeMealType>(FREE_DEFAULT_MEAL_TYPE);
  const [cuisineStyleFilter, setCuisineStyleFilter] = useState<RecipeCuisineStyle>(
    FREE_DEFAULT_CUISINE_STYLE
  );
  const [servingsFilter, setServingsFilter] = useState<RecipeServings>(FREE_DEFAULT_SERVINGS);
  const [complexityFilter, setComplexityFilter] =
    useState<RecipeComplexity>(FREE_DEFAULT_COMPLEXITY);
  const [appliedRecipeFilters, setAppliedRecipeFilters] = useState<AppliedRecipeFilters | null>(
    null
  );
  const [mealTypeAdvisory, setMealTypeAdvisory] = useState<string | null>(null);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);
  const [isGeneratingDishPhoto, setIsGeneratingDishPhoto] = useState(false);
  const [pendingPlanAssignment, setPendingPlanAssignment] = useState<PendingPlanAssignment | null>(
    null
  );
  const [scannerMode, setScannerMode] = useState<ScannerMode>("pantry");

  useEffect(() => {
    setPendingPlanAssignment(readPendingPlanAssignment());

    const initialMode = consumeScannerInitialMode();
    if (initialMode) {
      setScannerMode(initialMode);
    }
  }, []);

  useEffect(() => {
    const loadGenerationsLeft = async () => {
      try {
        const supabase = createSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          setGenerationsLeft(0);
          return;
        }

        if (hasUnlimitedGenerations(user.email)) {
          setGenerationsLeft(UNLIMITED_GENERATIONS_SENTINEL);
          return;
        }

        const response = await fetch("/api/generations/quota");
        const payload = (await response.json()) as {
          generationsLeft?: number;
          error?: string;
        };

        if (!response.ok) {
          console.error("[scanner] Error cargando cuota:", payload.error);
          setGenerationsLeft(null);
          return;
        }

        setGenerationsLeft(payload.generationsLeft ?? 0);
      } catch (error) {
        console.error("[scanner] Error cargando cuota de escaneos:", error);
        setGenerationsLeft(null);
      }
    };

    void loadGenerationsLeft();
  }, []);

  useEffect(() => {
    if (rateLimitSecondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setRateLimitSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimitSecondsLeft]);

  const resetScannerState = useCallback(() => {
    setSelectedIngredients([]);
    setRecipe(null);
    setPantryImageFile(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
    setRetryMessage(null);
    setIsLoading(false);
    setShowNotFoodGuidance(false);
    setShowInvalidIngredientAlert(false);
    setInvalidIngredientMessage(null);
    setShowMealTypeMismatchAlert(false);
    setMealTypeMismatchMessage(null);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    setIsRecipeSaved(false);
    setSavedRecipeId(null);
    setRateLimitSecondsLeft(0);
    setAppliedRecipeFilters(null);
    setMealTypeAdvisory(null);
    setImageGenerationError(null);
    setIsGeneratingDishPhoto(false);
  }, []);

  useEffect(() => {
    if (!scannerReset) return;
    scannerReset.registerScannerReset(resetScannerState);
    return () => scannerReset.registerScannerReset(null);
  }, [scannerReset, resetScannerState]);

  const showDebugError = (context: string, error: unknown) => {
    console.error(`[generate-recipe] ${context}:`, error);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isInsecureContext = !window.isSecureContext;
    const localHosts = new Set(["localhost", "127.0.0.1"]);
    const isLocalhost = localHosts.has(window.location.hostname);
    if (isInsecureContext && !isLocalhost) {
      setSecurityWarning(
        "Entorno inseguro detectado (HTTP/IP local). En Pixel pueden fallar camara o API. Usa HTTPS para pruebas moviles."
      );
    }
  }, []);

  const handlePantryImageChange = (file: File | null) => {
    setPantryImageFile(file);
    setRecipe(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
    setShowNotFoodGuidance(false);
    setIsRecipeSaved(false);
    setSavedRecipeId(null);
    setSaveErrorMessage(null);
    setRateLimitSecondsLeft(0);
  };

  const handleToggleFromCategory = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
    setRecipe(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
    setShowNotFoodGuidance(false);
    setIsRecipeSaved(false);
    setSavedRecipeId(null);
    setSaveErrorMessage(null);
    setRateLimitSecondsLeft(0);
  };

  const handleRemoveIngredient = (name: string) => {
    setSelectedIngredients((prev) => prev.filter((x) => x !== name));
    setRecipe(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
    setShowNotFoodGuidance(false);
    setIsRecipeSaved(false);
    setSavedRecipeId(null);
    setSaveErrorMessage(null);
    setRateLimitSecondsLeft(0);
  };

  const handleAddIngredient = (name: string) => {
    setSelectedIngredients((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setRecipe(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
    setShowNotFoodGuidance(false);
    setIsRecipeSaved(false);
    setSavedRecipeId(null);
    setSaveErrorMessage(null);
    setRateLimitSecondsLeft(0);
  };

  const generarReceta = async (options?: { useDishPhoto?: boolean }) => {
    if (generationsLeft !== null && generationsLeft <= 0) {
      setShowGenerationsModal(true);
      return;
    }

    if (!selectedIngredients.length && !pantryImageFile) {
      setErrorMessage(
        "Selecciona al menos un ingrediente o añade una foto de tu nevera o despensa."
      );
      return;
    }

    if (typeof options?.useDishPhoto === "boolean") {
      dishPhotoChoiceRef.current = options.useDishPhoto;
    }
    const useDishPhoto = dishPhotoChoiceRef.current;

    const FETCH_TIMEOUT_MS = 120_000;
    const createFetchSignal = (): AbortSignal => {
      if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
        return AbortSignal.timeout(FETCH_TIMEOUT_MS);
      }
      const controller = new AbortController();
      setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      return controller.signal;
    };

    const runFetchRound = async (): Promise<{
      response: Response;
      payload: ApiPayload;
      networkError: boolean;
    }> => {
      let response: Response | null = null;
      let payload: ApiPayload = {};
      let networkError = false;
      const maxAttempts = 3;
      const baseDelayMs = 2000;

      let imagePayload: { imageBase64: string; mimeType: string } | undefined;
      if (pantryImageFile) {
        if (pantryImageFile.size > 8 * 1024 * 1024) {
          return {
            response: new Response(null, { status: 400 }),
            payload: {
              error:
                "La imagen supera 8 MB. Elige una foto más pequeña o comprímela antes de subirla."
            },
            networkError: false
          };
        }
        try {
          const { base64, mimeType } = await compressImageForUpload(pantryImageFile);
          imagePayload = { imageBase64: base64, mimeType };
        } catch (err) {
          showDebugError("lectura de imagen", err);
          return {
            response: new Response(null, { status: 400 }),
            payload: {
              error: "No pudimos leer la imagen. Prueba con otra foto."
            },
            networkError: false
          };
        }
      }

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          response = await fetch("/api/generate-recipe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              selectedIngredients,
              mealType: mealTypeFilter,
              cuisineStyle: cuisineStyleFilter,
              servings: servingsFilter,
              complexity: complexityFilter,
              locale,
              useDishPhoto,
              ...(imagePayload ?? {})
            }),
            signal: createFetchSignal()
          });
        } catch (err) {
          networkError = !response || response.status === 0;
          showDebugError("fetch/red", err);
          return {
            response: response ?? new Response(null, { status: 503 }),
            payload: {
              error: "No se pudo completar la solicitud.",
              details: "Error de red",
              code: "HTTP_TEXT_ERROR"
            },
            networkError
          };
        }

        try {
          const contentType = response.headers.get("content-type") ?? "";
          if (contentType.includes("application/json")) {
            payload = (await response.json()) as ApiPayload;
          } else {
            payload = {};
          }
        } catch {
          payload = {};
        }

        const retryableStatus =
          response.status === 503 ||
          (response.status === 429 && !isHardQuotaExceeded(payload.details));
        if (retryableStatus && attempt < maxAttempts - 1) {
          const nextAttempt = attempt + 2;
          setRetryMessage(
            `Estamos conectando con el chef digital... hay mucha gente en la cocina (Intento ${nextAttempt} de 3)`
          );
          const delayMs = baseDelayMs * 2 ** attempt;
          await sleep(delayMs);
          continue;
        }

        break;
      }

      return {
        response: response ?? new Response(null, { status: 503 }),
        payload,
        networkError
      };
    };

    setIsLoading(true);
    setErrorMessage(null);
    setRetryMessage(null);
    setRecipe(null);
    setAppliedRecipeFilters(null);
    setMealTypeAdvisory(null);
    setShowNotFoodGuidance(false);
    setShowInvalidIngredientAlert(false);
    setInvalidIngredientMessage(null);
    setShowMealTypeMismatchAlert(false);
    setMealTypeMismatchMessage(null);
    setIsRecipeSaved(false);
    setSavedRecipeId(null);
    setSaveErrorMessage(null);
    setRateLimitSecondsLeft(0);

    const longWaitTimer = window.setTimeout(() => {
      setRetryMessage(
        "Analizando ingredientes... está tardando más de 15 segundos. Puedes esperar o reintentar."
      );
    }, 15_000);

    let { response, payload, networkError } = await runFetchRound();

    const shouldRetryParse =
      !response.ok &&
      !payload.recipe &&
      (payload.code === "INCOMPLETE_RESPONSE" || payload.code === "PARSING_ERROR");

    if (shouldRetryParse) {
      setRetryMessage("Respuesta incompleta del servidor, reintentando...");
      await sleep(800);
      const second = await runFetchRound();
      response = second.response;
      payload = second.payload;
      networkError = second.networkError;
    }

    window.clearTimeout(longWaitTimer);
    setIsLoading(false);
    setRetryMessage(null);

    try {
      if (!response || response.status === 0) {
        setRecipe(null);
        setErrorMessage(
          networkError
            ? resolveErrorMessage(0, {}, true)
            : "No se pudo completar la solicitud de receta."
        );
        return;
      }

      if (!response.ok || !payload.recipe) {
        setRecipe(null);

        if (payload.code === "GENERATIONS_EXHAUSTED") {
          setGenerationsLeft(0);
          setShowGenerationsModal(true);
          return;
        }

        const isNotFood = payload.code === "NOT_FOOD" || payload.error === "NOT_FOOD";
        if (isNotFood) {
          setShowNotFoodGuidance(true);
          setShowInvalidIngredientAlert(false);
          setErrorMessage(null);
          return;
        }

        const isInvalidIngredient =
          response.status === 400 &&
          (payload.code === "INVALID_INGREDIENT" || payload.error === "ingrediente_invalido");
        if (isInvalidIngredient) {
          setShowInvalidIngredientAlert(true);
          setInvalidIngredientMessage(
            payload.mensaje ??
              resolveErrorMessage(response.status, payload, networkError)
          );
          setShowNotFoodGuidance(false);
          setShowMealTypeMismatchAlert(false);
          setMealTypeMismatchMessage(null);
          setErrorMessage(null);
          return;
        }

        const isMealTypeMismatch =
          response.status === 422 &&
          (payload.code === "MEAL_TYPE_MISMATCH" || payload.error === "tipo_plato_incompatible");
        if (isMealTypeMismatch) {
          setShowMealTypeMismatchAlert(true);
          setMealTypeMismatchMessage(
            payload.mensaje ??
              resolveErrorMessage(response.status, payload, networkError)
          );
          setShowNotFoodGuidance(false);
          setShowInvalidIngredientAlert(false);
          setInvalidIngredientMessage(null);
          setErrorMessage(null);
          return;
        }

        console.error("[generate-recipe] Error final:", {
          status: response.status,
          code: payload.code,
          error: payload.error,
          details: payload.details
        });
        const nextRateLimitSeconds =
          response.status === 429 ? extractRetrySeconds(payload.details) : 0;
        if (nextRateLimitSeconds > 0) {
          setRateLimitSecondsLeft(nextRateLimitSeconds);
        }
        const friendlyError = resolveErrorMessage(
          response.status,
          payload,
          networkError,
          nextRateLimitSeconds
        );
        setErrorMessage(
          payload.error && payload.error !== "NOT_FOOD" ? payload.error : friendlyError
        );
        return;
      }

      setRecipe({
        ...payload.recipe,
        referenceImageUrl: payload.referenceImageUrl ?? null,
        imageUrl: payload.imageUrl ?? null
      });
      setImageGenerationError(null);
      setIsGeneratingDishPhoto(Boolean(payload.dishPhotoPending));
      setAppliedRecipeFilters(
        payload.appliedFilters ?? {
          mealType: mealTypeFilter,
          cuisineStyle: cuisineStyleFilter,
          servings: servingsFilter,
          complexity: complexityFilter
        }
      );
      setMealTypeAdvisory(
        typeof payload.mealTypeAdvisory === "string" && payload.mealTypeAdvisory.trim().length > 0
          ? payload.mealTypeAdvisory.trim()
          : null
      );
      setRecipeFromPhoto(Boolean(pantryImageFile));
      setErrorMessage(null);

      const autoSavedId =
        (typeof payload.savedRecipeId === "string" && payload.savedRecipeId) ||
        (payload.savedRecipe && typeof payload.savedRecipe.id === "string"
          ? payload.savedRecipe.id
          : null);

      // El id auto-guardado solo sirve para el polling de la foto Premium.
      // No marcar como "ya guardada": el usuario debe poder pulsar Guardar.
      setSavedRecipeId(autoSavedId);
      setIsRecipeSaved(false);
      setSaveErrorMessage(null);
      if (typeof payload.generationsLeft === "number") {
        setGenerationsLeft(payload.generationsLeft);
      }
      void refreshPremium();

      // Polling: la foto se genera en after() del servidor y actualiza Supabase.
      if (payload.dishPhotoPending && autoSavedId) {
        const recipeIdToPoll = autoSavedId;
        void (async () => {
          try {
            for (let attempt = 0; attempt < DISH_PHOTO_POLL_MAX_ATTEMPTS; attempt += 1) {
              await sleep(DISH_PHOTO_POLL_INTERVAL_MS);

              const statusResponse = await fetch(
                `/api/recipes/${encodeURIComponent(recipeIdToPoll)}/image-status`,
                { method: "GET", credentials: "include", cache: "no-store" }
              );

              if (!statusResponse.ok) {
                continue;
              }

              const statusPayload = (await statusResponse.json()) as {
                status?: string;
                imageUrl?: string | null;
                error?: string;
              };

              if (statusPayload.status === "ready" && statusPayload.imageUrl) {
                setRecipe((current) =>
                  current
                    ? {
                        ...current,
                        imageUrl: statusPayload.imageUrl
                      }
                    : current
                );
                setImageGenerationError(null);
                setIsGeneratingDishPhoto(false);
                void refreshPremium();
                return;
              }
            }

            setImageGenerationError(
              "La foto del plato está tardando más de lo esperado. Revisa la receta guardada en unos momentos."
            );
          } catch (error) {
            console.warn("[scanner] Polling de foto Premium falló:", error);
            setImageGenerationError(
              error instanceof Error ? error.message : "No pudimos generar la foto del plato."
            );
          } finally {
            setIsGeneratingDishPhoto(false);
          }
        })();
      }
      // Sin fallback a /api/generate-dish-photo: OpenAI solo vía after() con Premium de pago.

      void (async () => {
        try {
          const supabase = createSupabaseClient();
          const {
            data: { user }
          } = await supabase.auth.getUser();
          if (!user) return;
          await completeScanPantryChallengeIfConfigured(user.id);
        } catch (error) {
          console.warn("[scanner] No se pudo sincronizar el reto de escanear despensa:", error);
        }
      })();
    } catch (err) {
      showDebugError("manejo de respuesta", err);
      setRecipe(null);
      setErrorMessage(
        "Ocurrió un error al procesar la respuesta. Revisa la consola para más detalle."
      );
    }
  };

  const handleFindRecipes = () => {
    const shouldAskPhotoCredit =
      isTester && isPaidPremium && openaiPhotoCredits > 0;

    if (shouldAskPhotoCredit) {
      setShowPhotoCreditConfirm(true);
      return;
    }

    dishPhotoChoiceRef.current = false;
    void generarReceta({ useDishPhoto: false });
  };

  const persistGeneratedRecipe = useCallback(async (): Promise<string | null> => {
    if (savedRecipeId) return savedRecipeId;
    if (!recipe) return null;

    const supabase = createSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setSaveErrorMessage("Necesitas iniciar sesión para guardar recetas en tu recetario.");
      return null;
    }

    const instructions = recipe.pasos_ordenados
      .map((step, index) => `${index + 1}. ${step}`)
      .join("\n");

    const recipeTags = recipe.tags ?? [];
    const { is_airfryer, is_flourless } = tagsToLegacyFlags(recipeTags);

    const structuredIngredients = structuredIngredientsToJson(
      stringsToStructuredIngredients(recipe.ingredientes_detallados)
    );

    const saveResult = await saveGeneratedRecipeToLibrary(supabase, {
      userId: user.id,
      title: recipe.titulo,
      ingredients: structuredIngredients,
      steps: recipe.pasos_ordenados,
      instructions: instructions || "Sin pasos detallados",
      tipSandra: recipe.tip_sandra,
      isAirfryer: is_airfryer,
      isFlourless: is_flourless,
      tags: recipeTags,
      macronutrientes: recipe.macronutrientes,
      cookingTimeMinutes: parseCookingMinutesFromLabel(recipe.tiempo_preparacion),
      imageUrl: recipe.imageUrl ?? null,
      referenceImageUrl: recipe.referenceImageUrl ?? null,
      appliedFilters: appliedRecipeFilters,
      mealTypeAdvisory: mealTypeAdvisory
    });

    if ("error" in saveResult) {
      setSaveErrorMessage(saveResult.error);
      return null;
    }

    setSavedRecipeId(saveResult.recipeId);
    setIsRecipeSaved(true);
    return saveResult.recipeId;
  }, [appliedRecipeFilters, mealTypeAdvisory, recipe, savedRecipeId]);

  const handleSaveRecipe = async () => {
    if (!recipe || isSavingRecipe || isRecipeSaved) return;
    setIsSavingRecipe(true);
    setSaveErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setSaveErrorMessage("Necesitas iniciar sesión para guardar recetas en tu recetario.");
        setIsSavingRecipe(false);
        return;
      }

      const recipeId = await persistGeneratedRecipe();
      if (!recipeId) {
        setIsSavingRecipe(false);
        return;
      }

      setIsRecipeSaved(true);

      const pending = readPendingPlanAssignment();
      if (pending) {
        const assignment = await completePendingPlanAssignment(user.id, recipeId);
        setPendingPlanAssignment(null);

        if (assignment.assigned && assignment.pending) {
          setSaveSuccessMessage(
            t("savedAndAssigned", {
              slot: formatPendingPlanSlot(assignment.pending, tPlan, t)
            })
          );
        } else if (assignment.hadPending) {
          setSaveSuccessMessage(t("savedAssignFailed"));
        } else {
          setSaveSuccessMessage(t("savedSuccess"));
        }
        window.setTimeout(() => {
          window.location.assign(assignment.hadPending ? APP_ROUTES.plan : APP_ROUTES.guardadas);
        }, assignment.hadPending ? 700 : 600);
        return;
      }

      setSaveSuccessMessage("¡Receta guardada con éxito!");
      window.setTimeout(() => {
        window.location.assign(APP_ROUTES.guardadas);
      }, 600);
    } catch (error) {
      console.error("[save-recipe] Error guardando receta:", error);
      setSaveErrorMessage("No pudimos guardar la receta. Inténtalo nuevamente.");
    } finally {
      setIsSavingRecipe(false);
    }
  };

  const displayRecipe = useMemo(() => {
    if (!recipe) return null;
    return {
      ...recipe,
      ingredientes_detallados: formatIngredientLinesForDisplay(recipe.ingredientes_detallados)
    };
  }, [recipe]);

  const showGenerationError =
    !isLoading &&
    !recipe &&
    Boolean(errorMessage) &&
    !showInvalidIngredientAlert &&
    !showMealTypeMismatchAlert &&
    !showNotFoodGuidance;

  const handleScanAgain = () => {
    setErrorMessage(null);
    setRetryMessage(null);
  };

  const isPantryIdleView =
    !isLoading && !recipe && !showGenerationError && scannerMode === "pantry";
  const isInstagramIdleView =
    !isLoading && !recipe && !showGenerationError && scannerMode === "instagram";
  const isScannerIdleView = isPantryIdleView || isInstagramIdleView;
  const isRecipeFlowView = isLoading || Boolean(displayRecipe) || showGenerationError;

  return (
    <div
      className={cn(
        isRecipeFlowView
          ? "-mx-4 min-h-0 flex-1 bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pt-1"
          : "bg-[#FBF9F6]",
        isScannerIdleView
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : isRecipeFlowView
            ? "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] pb-[calc(var(--app-bottom-nav-height)+0.75rem)]"
            : "min-h-[calc(100dvh-10rem)]"
      )}
    >
      {pendingPlanAssignment ? (
        <div className="mb-3 shrink-0 rounded-2xl border border-[#556B2F]/20 bg-[#F0F4ED]/80 px-4 py-3">
          <p className="text-sm font-semibold text-[#3e5219]">{t("planningWeekTitle")}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            {t("planningWeekHint", {
              slot: formatPendingPlanSlot(pendingPlanAssignment, tPlan, t)
            })}
          </p>
          <button
            type="button"
            onClick={() => {
              clearPendingPlanAssignment();
              setPendingPlanAssignment(null);
            }}
            className="mt-2 text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-700 hover:underline"
          >
            {t("planningWeekCancel")}
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <section className="space-y-3">
          <RecipeGenerationState variant="loading" retryMessage={retryMessage} />
        </section>
      ) : null}

      {showGenerationError && errorMessage ? (
        <section className="space-y-3">
          <RecipeGenerationState
            variant="error"
            errorMessage={errorMessage}
            onRetry={handleScanAgain}
            rateLimitSecondsLeft={rateLimitSecondsLeft}
          />
        </section>
      ) : null}

      {!isLoading && displayRecipe ? (
        <section className="animate-fade-in space-y-3">
          {saveSuccessMessage ? (
            <div className="rounded-2xl border border-[#556B2F]/20 bg-white/90 px-2.5 py-2 text-xs font-medium text-[#556B2F] shadow-sm shadow-stone-100/30">
              {saveSuccessMessage}
            </div>
          ) : null}
          {saveErrorMessage ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200/80 bg-white/90 px-2.5 py-2 text-xs text-red-800 shadow-sm shadow-stone-100/30"
            >
              {saveErrorMessage}
            </div>
          ) : null}
          {imageGenerationError && !isGeneratingDishPhoto ? (
            <div
              role="status"
              className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-2.5 py-2 text-xs text-amber-900 shadow-sm"
            >
              No se generó la foto del plato: {imageGenerationError}
            </div>
          ) : null}
          <RecipeResultView
            recipe={displayRecipe}
            showPhotoBanner={recipeFromPhoto}
            appliedFilters={appliedRecipeFilters}
            showAppliedFilters={Boolean(appliedRecipeFilters)}
            mealTypeAdvisory={mealTypeAdvisory}
            onNewSearch={resetScannerState}
            onSaveFavorites={() => void handleSaveRecipe()}
            onPersistRecipeId={persistGeneratedRecipe}
            onPlanAssigned={(message) => setSaveSuccessMessage(message)}
            isSavingFavorites={isSavingRecipe}
            isSavedFavorites={isRecipeSaved}
            isGeneratingPhoto={isGeneratingDishPhoto}
          />
        </section>
      ) : null}

      {showMealTypeMismatchAlert ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 px-4">
          <div
            role="alertdialog"
            aria-labelledby="meal-type-mismatch-title"
            className="w-full max-w-md rounded-2xl border border-amber-300/60 bg-[#FDFCFB] p-5 shadow-xl"
          >
            <p id="meal-type-mismatch-title" className="text-lg font-semibold text-[#556B2F]">
              {t("mealMismatchTitle")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              {mealTypeMismatchMessage ?? t("mealMismatchBody")}
            </p>
            <p className="mt-3 rounded-xl border border-[#556B2F]/15 bg-white px-3 py-2 text-xs text-stone-600">
              {t("mealMismatchFilter", { meal: translateMealType(t, mealTypeFilter) })}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowMealTypeMismatchAlert(false);
                setMealTypeMismatchMessage(null);
              }}
              className="mt-4 w-full rounded-full bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {t("mealMismatchClose")}
            </button>
          </div>
        </div>
      ) : null}

      {showInvalidIngredientAlert ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 px-4">
          <div
            role="alertdialog"
            aria-labelledby="invalid-ingredient-title"
            className="w-full max-w-md rounded-2xl border border-amber-300/60 bg-[#FDFCFB] p-5 shadow-xl"
          >
            <p id="invalid-ingredient-title" className="text-lg font-semibold text-[#556B2F]">
              ⚠️ Ingrediente no válido
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              {invalidIngredientMessage ??
                "Parece que hay algo en tu despensa que no es un alimento válido. ¡Revisa tus ingredientes seleccionados e inténtalo de nuevo!"}
            </p>
            {selectedIngredients.length > 0 ? (
              <div className="mt-3 rounded-xl border border-[#556B2F]/15 bg-white px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Revisa tu selección
                </p>
                <ul className="mt-2 space-y-1.5">
                  {selectedIngredients.map((name) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm text-stone-700"
                    >
                      <span>{name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleRemoveIngredient(name);
                          if (selectedIngredients.length <= 1) {
                            setShowInvalidIngredientAlert(false);
                            setInvalidIngredientMessage(null);
                          }
                        }}
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setShowInvalidIngredientAlert(false);
                setInvalidIngredientMessage(null);
              }}
              className="mt-4 w-full rounded-full bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Entendido, revisaré mi despensa
            </button>
          </div>
        </div>
      ) : null}

      {!isLoading && !recipe && !showGenerationError ? (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-3",
            isPantryIdleView && "overflow-hidden",
            isInstagramIdleView &&
              "overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] pb-[calc(var(--app-bottom-nav-height)+0.5rem)]"
          )}
        >
          <div className="shrink-0">
            <ScannerModeTabs mode={scannerMode} onChange={setScannerMode} disabled={isLoading} />
          </div>

          {scannerMode === "instagram" ? (
            <InstagramCuratedCatalog
              className="mt-0"
              pendingPlanAssignment={pendingPlanAssignment}
              onPendingAssignmentComplete={() => setPendingPlanAssignment(null)}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {showNotFoodGuidance ? (
            <div className="mb-3 shrink-0 rounded-2xl border border-[#556B2F]/25 bg-[#FDFCFB] p-4 shadow-sm">
              <p className="text-lg font-semibold text-[#556B2F]">🍎 ¡Vaya! No parece haber comida ahí.</p>
              <p className="mt-2 text-sm text-stone-700">
                Para ayudarte con una receta increíble, asegúrate de que los ingredientes se vean
                claramente en la foto.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPantryImageFile(null);
                  setRecipe(null);
                  setRecipeFromPhoto(false);
                  setErrorMessage(null);
                  setRetryMessage(null);
                  setShowNotFoodGuidance(false);
                }}
                className="mt-3 rounded-full bg-[#556B2F] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                📸 Intentar de nuevo
              </button>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-hidden">
          <PantrySearchView
            selectedIngredients={selectedIngredients}
            pantryImageFile={pantryImageFile}
            onPantryImageChange={handlePantryImageChange}
            onAddIngredient={handleAddIngredient}
            onRemoveIngredient={handleRemoveIngredient}
            onToggleFromCategory={handleToggleFromCategory}
            onFindRecipes={handleFindRecipes}
            errorMessage={null}
            onRetry={() => void generarReceta()}
            isBusy={isLoading || rateLimitSecondsLeft > 0}
            rateLimitSecondsLeft={rateLimitSecondsLeft}
            generationsLeft={generationsLeft}
            onGenerationsExhausted={() => setShowGenerationsModal(true)}
            mealType={mealTypeFilter}
            cuisineStyle={cuisineStyleFilter}
            servings={servingsFilter}
            complexity={complexityFilter}
            onMealTypeChange={setMealTypeFilter}
            onCuisineStyleChange={setCuisineStyleFilter}
            onServingsChange={setServingsFilter}
            onComplexityChange={setComplexityFilter}
          />
          </div>
          <GenerationsLimitModal
            open={showGenerationsModal}
            onClose={() => setShowGenerationsModal(false)}
          />
          <ConfirmDialog
            open={showPhotoCreditConfirm}
            onOpenChange={setShowPhotoCreditConfirm}
            title={t("photoCreditConfirmTitle")}
            description={t("photoCreditConfirmDescription")}
            confirmLabel={t("photoCreditConfirmYes")}
            cancelLabel={t("photoCreditConfirmNo")}
            onConfirm={() => {
              setShowPhotoCreditConfirm(false);
              void generarReceta({ useDishPhoto: true });
            }}
            onCancel={() => {
              setShowPhotoCreditConfirm(false);
              void generarReceta({ useDishPhoto: false });
            }}
          />
            </div>
          )}
        </div>
      ) : null}

      {securityWarning && !isPantryIdleView ? (
        <p className="mt-3 shrink-0 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          {securityWarning}
        </p>
      ) : null}
    </div>
  );
}
