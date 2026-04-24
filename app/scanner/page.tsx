"use client";

import { useEffect, useState } from "react";
import { PantrySearchView } from "@/components/scanner/pantry-search-view";
import { RecipeLoadingSkeleton } from "@/components/scanner/recipe-loading-skeleton";
import { RecipeResultView } from "@/components/scanner/recipe-result-view";

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
  if (status === 503) {
    return "El servidor de Google está saturado (Demanda alta). Por favor, intenta de nuevo en unos segundos.";
  }
  if (status === 429) {
    return "Has alcanzado el límite de consultas gratuitas. Espera un momento.";
  }
  return (
    payload.error ??
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

  const showDebugError = (context: string, error: unknown) => {
    const errorText =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : typeof error === "string"
          ? error
          : JSON.stringify(error);
    console.error(`[generate-recipe] ${context}:`, error);
    if (typeof window !== "undefined") {
      window.alert(`Error de receta (${context}): ${errorText}`);
    }
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
  };

  const handleToggleFromCategory = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
    setRecipe(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
  };

  const handleRemoveIngredient = (name: string) => {
    setSelectedIngredients((prev) => prev.filter((x) => x !== name));
    setRecipe(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
  };

  const handleAddMoreSubmit = () => {
    const v = addMoreValue.trim();
    if (!v) return;
    setSelectedIngredients((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setAddMoreValue("");
    setRecipe(null);
    setRecipeFromPhoto(false);
    setErrorMessage(null);
  };

  const readFileAsBase64Payload = (
    file: File
  ): Promise<{ base64: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Lectura de archivo inválida"));
          return;
        }
        const match = result.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          reject(new Error("Formato de imagen no reconocido"));
          return;
        }
        resolve({ mimeType: match[1], base64: match[2].replace(/\s/g, "") });
      };
      reader.onerror = () => reject(reader.error ?? new Error("Error al leer la imagen"));
      reader.readAsDataURL(file);
    });

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

    const FETCH_TIMEOUT_MS = 240_000;
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
          const { base64, mimeType } = await readFileAsBase64Payload(pantryImageFile);
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
          networkError = true;
          showDebugError("fetch/red", err);
          return {
            response: new Response(null, { status: 0 }),
            payload: {},
            networkError: true
          };
        }

        try {
          payload = (await response.json()) as ApiPayload;
        } catch (parseErr) {
          showDebugError("parseo JSON respuesta", parseErr);
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
        if (payload.details || payload.error) {
          const detailsText = payload.details ?? payload.error ?? "Sin detalle";
          if (typeof window !== "undefined") {
            window.alert(`Diagnóstico receta: ${detailsText}`);
          }
        }
        setErrorMessage(
          payload.error ?? resolveErrorMessage(response.status, payload, networkError)
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

  return (
    <div className="min-h-[calc(100dvh-10rem)] bg-sv-surface">
      {isLoading ? (
        <RecipeLoadingSkeleton retryMessage={retryMessage} />
      ) : null}

      {!isLoading && recipe ? (
        <div className="animate-fade-in">
          <RecipeResultView
            recipe={recipe}
            showPhotoBanner={recipeFromPhoto}
            onNewSearch={() => {
              setRecipe(null);
              setRecipeFromPhoto(false);
              setPantryImageFile(null);
              setErrorMessage(null);
            }}
            onSaveFavorites={() => {
              console.info("[favorites] Guardar en favoritos (pendiente de backend)");
            }}
          />
        </div>
      ) : null}

      {!isLoading && !recipe ? (
        <div className="animate-fade-in">
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
