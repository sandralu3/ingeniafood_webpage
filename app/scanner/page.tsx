"use client";

import { useEffect, useState } from "react";
import { PantrySearchView } from "@/components/scanner/pantry-search-view";
import { RecipeLoadingSkeleton } from "@/components/scanner/recipe-loading-skeleton";
import { RecipeResultView } from "@/components/scanner/recipe-result-view";
import { createSupabaseClient } from "@/lib/supabaseClient";

type GeneratedRecipe = {
  titulo: string;
  tiempo_preparacion: string;
  ingredientes_detallados: string[];
  pasos_ordenados: string[];
};

type ApiPayload = {
  recipe?: GeneratedRecipe;
  error?: string;
  details?: string;
  code?: string;
};

const RECIPE_CACHE_PREFIX = "recipe-cache-v1";

function buildIngredientsCacheKey(ingredients: string[]): string {
  const normalized = ingredients
    .map((ingredient) => ingredient.trim().toLowerCase())
    .filter((ingredient) => ingredient.length > 0)
    .sort();
  return `${RECIPE_CACHE_PREFIX}:${normalized.join("|")}`;
}

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

function resolveErrorMessage(
  status: number,
  payload: ApiPayload,
  isNetworkError: boolean
): string {
  if (isNetworkError) {
    return "No tienes conexión a internet o el servicio no está disponible.";
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
  if (status === 503) {
    return "El servidor de Google está saturado (Demanda alta). Por favor, intenta de nuevo en unos segundos.";
  }
  if (status === 429) {
    return "Has alcanzado el límite de consultas gratuitas. Espera un momento.";
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
  const [addMoreValue, setAddMoreValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [pantryImageFile, setPantryImageFile] = useState<File | null>(null);
  const [recipeFromPhoto, setRecipeFromPhoto] = useState(false);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [showNotFoodGuidance, setShowNotFoodGuidance] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const resetScannerState = () => {
    setSelectedIngredients([]);
    setAddMoreValue("");
    setRecipe(null);
    setPantryImageFile(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
    setRetryMessage(null);
    setIsLoading(false);
    setShowNotFoodGuidance(false);
    setSaveSuccessMessage(null);
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
  };

  const handleToggleFromCategory = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
    setRecipe(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
    setShowNotFoodGuidance(false);
  };

  const handleRemoveIngredient = (name: string) => {
    setSelectedIngredients((prev) => prev.filter((x) => x !== name));
    setRecipe(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
    setShowNotFoodGuidance(false);
  };

  const handleAddMoreSubmit = () => {
    const v = addMoreValue.trim();
    if (!v) return;
    setSelectedIngredients((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setAddMoreValue("");
    setRecipe(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
    setShowNotFoodGuidance(false);
  };

  const generarReceta = async () => {
    if (!selectedIngredients.length && !pantryImageFile) {
      setErrorMessage(
        "Selecciona al menos un ingrediente o añade una foto de tu nevera o despensa."
      );
      return;
    }

    const cacheKey = buildIngredientsCacheKey(selectedIngredients);
    const cachedRecipe =
      !pantryImageFile && selectedIngredients.length
        ? window.localStorage.getItem(cacheKey)
        : null;
    if (cachedRecipe) {
      try {
        const parsedRecipe = JSON.parse(cachedRecipe) as GeneratedRecipe;
        setRecipe(parsedRecipe);
        setRecipeFromPhoto(false);
        setErrorMessage(null);
        setRetryMessage(null);
        return;
      } catch {
        window.localStorage.removeItem(cacheKey);
      }
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
            response: response ?? new Response(null, { status: 0 }),
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

        const retryableStatus = response.status === 429 || response.status === 503;
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
        response: response ?? new Response(null, { status: 0 }),
        payload,
        networkError
      };
    };

    setIsLoading(true);
    setErrorMessage(null);
    setRetryMessage(null);
    setRecipe(null);
    setShowNotFoodGuidance(false);

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
        console.error("[generate-recipe] Error final:", {
          status: response.status,
          code: payload.code,
          error: payload.error,
          details: payload.details
        });
        const isNotFood = payload.code === "NOT_FOOD" || payload.error === "NOT_FOOD";
        if (isNotFood) {
          setShowNotFoodGuidance(true);
          setErrorMessage(null);
          return;
        }
        const friendlyError = resolveErrorMessage(response.status, payload, networkError);
        setErrorMessage(
          payload.error && payload.error !== "NOT_FOOD" ? payload.error : friendlyError
        );
        return;
      }

      setRecipe(payload.recipe);
      setRecipeFromPhoto(Boolean(pantryImageFile));
      setErrorMessage(null);
      if (!pantryImageFile) {
        window.localStorage.setItem(cacheKey, JSON.stringify(payload.recipe));
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

  const handleSaveRecipe = async () => {
    if (!recipe || isSavingRecipe) return;
    setIsSavingRecipe(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("Necesitas iniciar sesión para guardar recetas en tu recetario.");
        setIsSavingRecipe(false);
        return;
      }

      const instructions = recipe.pasos_ordenados
        .map((step, index) => `${index + 1}. ${step}`)
        .join("\n");

      const { error } = await supabase.from("recipes").insert({
        user_id: user.id,
        title: recipe.titulo,
        ingredients: recipe.ingredientes_detallados,
        instructions: instructions || "Sin pasos detallados",
        image_url: null,
        is_airfryer: true,
        is_flourless: true,
        is_public: false
      });

      if (error) {
        setErrorMessage("No pudimos guardar la receta. Inténtalo nuevamente.");
        setIsSavingRecipe(false);
        return;
      }

      setSaveSuccessMessage("¡Receta guardada con éxito!");
      window.setTimeout(() => {
        window.location.assign("/app-recetas");
      }, 600);
    } catch (error) {
      console.error("[save-recipe] Error guardando receta:", error);
      setErrorMessage("No pudimos guardar la receta. Inténtalo nuevamente.");
    } finally {
      setIsSavingRecipe(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-10rem)] bg-sv-surface">
      {isLoading ? (
        <RecipeLoadingSkeleton retryMessage={retryMessage} />
      ) : null}

      {!isLoading && recipe ? (
        <div className="animate-fade-in">
          {saveSuccessMessage ? (
            <div className="mb-3 rounded-xl border border-[#556B2F]/30 bg-[#FDFCFB] px-4 py-2 text-sm font-medium text-[#556B2F]">
              {saveSuccessMessage}
            </div>
          ) : null}
          <RecipeResultView
            recipe={recipe}
            showPhotoBanner={recipeFromPhoto}
            onNewSearch={resetScannerState}
            onSaveFavorites={() => void handleSaveRecipe()}
            isSavingFavorites={isSavingRecipe}
          />
        </div>
      ) : null}

      {!isLoading && !recipe ? (
        <div className="animate-fade-in">
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
            addMoreValue={addMoreValue}
            onAddMoreChange={setAddMoreValue}
            onAddMoreSubmit={handleAddMoreSubmit}
            onRemoveIngredient={handleRemoveIngredient}
            onToggleFromCategory={handleToggleFromCategory}
            onFindRecipes={handleFindRecipes}
            errorMessage={errorMessage}
            onRetry={() => void generarReceta()}
            isBusy={isLoading}
          />
          {securityWarning ? (
            <p className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              {securityWarning}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
