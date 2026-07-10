"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PantrySearchView } from "@/components/scanner/pantry-search-view";
import { GenerationsLimitModal } from "@/components/scanner/generations-limit-modal";
import { InstagramCuratedCatalog } from "@/components/scanner/instagram-curated-catalog";
import { RecipeGenerationState } from "@/components/scanner/recipe-generation-state";
import { RecipeResultView } from "@/components/scanner/recipe-result-view";
import { ScannerModeTabs, type ScannerMode } from "@/components/scanner/scanner-mode-tabs";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { UNLIMITED_GENERATIONS_SENTINEL } from "@/lib/generations/constants";
import { hasUnlimitedGenerations } from "@/lib/generations/admin-unlimited";
import { completePendingPlanAssignment } from "@/lib/plan/complete-pending-assignment";
import {
  clearPendingPlanAssignment,
  consumeScannerInitialMode,
  formatPendingPlanAssignmentLabel,
  readPendingPlanAssignment,
  type PendingPlanAssignment
} from "@/lib/plan/plan-pending-assignment";
import { tagsToLegacyFlags } from "@/lib/recipes/recipe-tags";
import {
  formatIngredientLinesForDisplay,
  stringsToStructuredIngredients,
  structuredIngredientsToJson
} from "@/lib/recipes/structured-ingredients";
import { type RecipeMacros } from "@/lib/recipes/recipe-macros";
import { saveGeneratedRecipeToLibrary } from "@/lib/recipes/save-generated-recipe";
import { createSupabaseClient } from "@/lib/supabaseClient";

type GeneratedRecipe = {
  titulo: string;
  tiempo_preparacion: string;
  ingredientes_detallados: string[];
  pasos_ordenados: string[];
  tip_sandra: string;
  tags?: string[];
  macronutrientes?: RecipeMacros | null;
};

type ApiPayload = {
  recipe?: GeneratedRecipe;
  error?: string;
  details?: string;
  code?: string;
  mensaje?: string;
  generationsLeft?: number;
};

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
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [isRecipeSaved, setIsRecipeSaved] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);
  const [generationsLeft, setGenerationsLeft] = useState<number | null>(null);
  const [showGenerationsModal, setShowGenerationsModal] = useState(false);
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

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("generations_left")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("[scanner] Error cargando generations_left:", error);
          setGenerationsLeft(null);
          return;
        }

        setGenerationsLeft(profile?.generations_left ?? 0);
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

  const resetScannerState = () => {
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
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    setIsRecipeSaved(false);
    setSavedRecipeId(null);
    setSavedRecipeId(null);
    setRateLimitSecondsLeft(0);
  };

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

  const generarReceta = async () => {
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
    setShowNotFoodGuidance(false);
    setShowInvalidIngredientAlert(false);
    setInvalidIngredientMessage(null);
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

      setRecipe(payload.recipe);
      setRecipeFromPhoto(Boolean(pantryImageFile));
      setErrorMessage(null);
      setIsRecipeSaved(false);
    setSavedRecipeId(null);
    setSaveErrorMessage(null);
      if (typeof payload.generationsLeft === "number") {
        setGenerationsLeft(payload.generationsLeft);
      }
    } catch (err) {
      showDebugError("manejo de respuesta", err);
      setRecipe(null);
      setErrorMessage(
        "Ocurrió un error al procesar la respuesta. Revisa la consola para más detalle."
      );
    }
  };

  const handleFindRecipes = () => {
    void generarReceta();
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
      macronutrientes: recipe.macronutrientes
    });

    if ("error" in saveResult) {
      setSaveErrorMessage(saveResult.error);
      return null;
    }

    setSavedRecipeId(saveResult.recipeId);
    setIsRecipeSaved(true);
    return saveResult.recipeId;
  }, [recipe, savedRecipeId]);

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

      const pending = readPendingPlanAssignment();
      if (pending) {
        const assignment = await completePendingPlanAssignment(user.id, recipeId);
        setPendingPlanAssignment(null);

        if (assignment.message) {
          setSaveSuccessMessage(assignment.message);
        } else {
          setSaveSuccessMessage("¡Receta guardada con éxito!");
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
    !showNotFoodGuidance;

  const handleScanAgain = () => {
    setErrorMessage(null);
    setRetryMessage(null);
  };

  return (
    <div className="min-h-[calc(100dvh-10rem)] bg-[#FBF9F6]">
      {pendingPlanAssignment ? (
        <div className="mb-4 rounded-2xl border border-[#556B2F]/20 bg-[#F0F4ED]/80 px-4 py-3">
          <p className="text-sm font-semibold text-[#3e5219]">Planificando tu semana</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            Al guardar la receta, se asignará al{" "}
            <span className="font-medium text-stone-800">
              {formatPendingPlanAssignmentLabel(pendingPlanAssignment)}
            </span>
            .
          </p>
          <button
            type="button"
            onClick={() => {
              clearPendingPlanAssignment();
              setPendingPlanAssignment(null);
            }}
            className="mt-2 text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-700 hover:underline"
          >
            Cancelar asignación al plan
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <RecipeGenerationState variant="loading" retryMessage={retryMessage} />
      ) : null}

      {showGenerationError && errorMessage ? (
        <RecipeGenerationState
          variant="error"
          errorMessage={errorMessage}
          onRetry={handleScanAgain}
          rateLimitSecondsLeft={rateLimitSecondsLeft}
        />
      ) : null}

      {!isLoading && displayRecipe ? (
        <div className="animate-fade-in">
          {saveSuccessMessage ? (
            <div className="mb-3 rounded-xl border border-[#556B2F]/30 bg-[#FDFCFB] px-4 py-2 text-sm font-medium text-[#556B2F]">
              {saveSuccessMessage}
            </div>
          ) : null}
          {saveErrorMessage ? (
            <div
              role="alert"
              className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
            >
              {saveErrorMessage}
            </div>
          ) : null}
          <RecipeResultView
            recipe={displayRecipe}
            showPhotoBanner={recipeFromPhoto}
            onNewSearch={resetScannerState}
            onSaveFavorites={() => void handleSaveRecipe()}
            onPersistRecipeId={persistGeneratedRecipe}
            onPlanAssigned={(message) => setSaveSuccessMessage(message)}
            isSavingFavorites={isSavingRecipe}
            isSavedFavorites={isRecipeSaved}
          />
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
        <div className="animate-fade-in space-y-4">
          <ScannerModeTabs mode={scannerMode} onChange={setScannerMode} disabled={isLoading} />

          {scannerMode === "instagram" ? (
            <InstagramCuratedCatalog
              pendingPlanAssignment={pendingPlanAssignment}
              onPendingAssignmentComplete={() => setPendingPlanAssignment(null)}
            />
          ) : (
            <>
          {showNotFoodGuidance ? (
            <div className="mb-4 rounded-2xl border border-[#556B2F]/25 bg-[#FDFCFB] p-4 shadow-sm">
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
          />
          <GenerationsLimitModal
            open={showGenerationsModal}
            onClose={() => setShowGenerationsModal(false)}
          />
          {securityWarning ? (
            <p className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              {securityWarning}
            </p>
          ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
