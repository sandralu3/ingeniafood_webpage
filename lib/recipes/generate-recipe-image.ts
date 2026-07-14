import { resolveDishImageMatch } from "@/lib/recipes/resolve-dish-image-match";
import type { RecipeCuisineStyle, RecipeMealType } from "@/lib/recipes/premium-recipe-filters";
import { randomUUID } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const RECIPE_IMAGES_BUCKET = "recetas-imagenes";
const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const MOCK_DISH_IMAGE_URL =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

const DEFAULT_GEMINI_IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation"
] as const;

export type GenerateRecipeImageInput = {
  userId: string;
  title: string;
  ingredients: string[];
  tags?: string[];
  mealType: RecipeMealType;
  cuisineStyle: RecipeCuisineStyle;
  tipSandra?: string;
};

export type RecipeImageProvider = "bank" | "mock" | "gemini" | "openai";

const OPENAI_KEY_PLACEHOLDERS = new Set([
  "your_openai_api_key",
  "sk-your_openai_api_key",
  "placeholder",
  "changeme"
]);

const GOOGLE_KEY_PLACEHOLDERS = new Set([
  "your_google_generative_ai_api_key",
  "placeholder",
  "changeme"
]);

export function isGoogleGenerativeAiKeyConfigured(): boolean {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) return false;
  if (GOOGLE_KEY_PLACEHOLDERS.has(apiKey.toLowerCase())) return false;
  if (/your[_-]?google/i.test(apiKey)) return false;
  return apiKey.length > 20;
}

export function isOpenAiApiKeyConfigured(): boolean {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return false;
  if (OPENAI_KEY_PLACEHOLDERS.has(apiKey.toLowerCase())) return false;
  if (/your[_-]?openai/i.test(apiKey)) return false;
  return apiKey.startsWith("sk-");
}

export function resolveRecipeImageProvider(): RecipeImageProvider {
  const configured = process.env.RECIPE_IMAGE_PROVIDER?.trim().toLowerCase();
  if (configured === "mock") return "mock";
  if (configured === "openai") return "openai";
  if (configured === "gemini" || configured === "google") return "gemini";
  if (configured === "bank") return "bank";
  return "bank";
}

function buildGeminiImageModelCandidates(): string[] {
  const configured = process.env.GOOGLE_GENERATIVE_AI_IMAGE_MODEL?.trim();
  const candidates = configured ? [configured, ...DEFAULT_GEMINI_IMAGE_MODELS] : [...DEFAULT_GEMINI_IMAGE_MODELS];
  return Array.from(new Set(candidates.filter(Boolean)));
}

function buildDishImagePrompt(input: GenerateRecipeImageInput): string {
  const ingredientSummary = input.ingredients.slice(0, 8).join(", ");
  const tip = input.tipSandra?.trim();

  return [
    "Professional food photography of a finished plated dish.",
    `Dish name: ${input.title}.`,
    ingredientSummary ? `Key ingredients visible on the plate: ${ingredientSummary}.` : "",
    tip ? `Presentation note: ${tip.slice(0, 180)}.` : "",
    "Ultra-realistic, appetizing, natural daylight, shallow depth of field,",
    "restaurant-quality styling on a ceramic plate, no text, no watermark, no people, no hands."
  ]
    .filter(Boolean)
    .join(" ");
}

async function uploadImageBuffer(params: {
  userId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const admin = getSupabaseAdminClient();
  const extension = params.mimeType === "image/png" ? "png" : "jpg";
  const objectPath = `${params.userId}/generated/${randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(RECIPE_IMAGES_BUCKET)
    .upload(objectPath, params.buffer, {
      contentType: params.mimeType,
      cacheControl: "31536000",
      upsert: false
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicData } = admin.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(objectPath);
  return publicData.publicUrl;
}

async function fetchImageAsBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen generada (${response.status}).`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, mimeType };
}

async function generateWithBank(
  input: GenerateRecipeImageInput
): Promise<{ imageUrl: string | null; error?: string }> {
  const match = await resolveDishImageMatch({
    recipeTitle: input.title,
    ingredients: input.ingredients,
    tags: input.tags ?? [],
    mealType: input.mealType,
    cuisineStyle: input.cuisineStyle
  });

  if (match) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[recipe-image] Banco:", match.matchedTitle, "score:", match.score);
    }
    return { imageUrl: match.imageUrl };
  }

  if (shouldFallbackToMockOnGeminiFailure()) {
    return {
      imageUrl: await generateWithMock(input),
      error: "Foto simulada: no hay coincidencia en el banco de imágenes todavía."
    };
  }

  return {
    imageUrl: null,
    error:
      "No encontramos una foto similar en el banco. Añade más imágenes etiquetadas desde el panel admin."
  };
}

async function generateWithMock(input: GenerateRecipeImageInput): Promise<string> {
  if (process.env.NODE_ENV !== "production") {
    console.info("[recipe-image] Usando proveedor mock para:", input.title);
  }

  return MOCK_DISH_IMAGE_URL;
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
  error?: { message?: string; code?: number; status?: string };
};

async function generateWithGeminiImageModel(
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "4:3"
        }
      }
    })
  });

  const payload = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        `El modelo ${model} no pudo generar la imagen. Revisa cuota/facturación en Google AI Studio.`
    );
  }

  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const inlinePart = parts.find((part) => part.inlineData?.data);
  const base64 = inlinePart?.inlineData?.data;

  if (!base64) {
    throw new Error(`El modelo ${model} no devolvió datos de imagen.`);
  }

  const mimeType = inlinePart?.inlineData?.mimeType?.trim() || "image/png";
  return { buffer: Buffer.from(base64, "base64"), mimeType };
}

function shouldFallbackToMockOnGeminiFailure(): boolean {
  const configured = process.env.RECIPE_IMAGE_FALLBACK_MOCK?.trim().toLowerCase();
  if (configured === "true" || configured === "1") return true;
  if (configured === "false" || configured === "0") return false;
  return process.env.NODE_ENV !== "production";
}

function isGeminiQuotaOrBillingError(message: string): boolean {
  return /quota|billing|limit:\s*0|exceeded your current quota|resource_exhausted/i.test(
    message
  );
}

function summarizeGeminiImageFailure(errors: string[]): string {
  if (errors.some(isGeminiQuotaOrBillingError)) {
    return (
      "Google no incluye generación de fotos en tu plan gratuito (cuota 0 para Gemini Image). " +
      "Activa facturación en Google AI Studio o usa RECIPE_IMAGE_PROVIDER=mock para probar la UI."
    );
  }

  return "No pudimos generar la foto del plato con Gemini Image. Revisa tu cuenta en Google AI Studio.";
}

async function generateWithGemini(input: GenerateRecipeImageInput): Promise<string> {
  if (!isGoogleGenerativeAiKeyConfigured()) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY no está configurada. Es la misma clave que usas para generar recetas."
    );
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!.trim();
  const prompt = buildDishImagePrompt(input);
  const modelCandidates = buildGeminiImageModelCandidates();
  const errors: string[] = [];

  for (const model of modelCandidates) {
    try {
      if (process.env.NODE_ENV !== "production") {
        console.info("[recipe-image] Intentando modelo Gemini Image:", model);
      }

      const { buffer, mimeType } = await generateWithGeminiImageModel(apiKey, model, prompt);
      return uploadImageBuffer({ userId: input.userId, buffer, mimeType });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      errors.push(`${model}: ${message}`);
      console.warn("[recipe-image] Modelo fallido:", model, message);
    }
  }

  throw new Error(summarizeGeminiImageFailure(errors));
}

async function generateWithOpenAI(input: GenerateRecipeImageInput): Promise<string> {
  if (!isOpenAiApiKeyConfigured()) {
    throw new Error(
      "OPENAI_API_KEY no está configurada. Sustituye el placeholder por una clave real (sk-...) o usa RECIPE_IMAGE_PROVIDER=gemini."
    );
  }

  const apiKey = process.env.OPENAI_API_KEY!.trim();

  const response = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: buildDishImagePrompt(input),
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url"
    })
  });

  const payload = (await response.json()) as {
    data?: Array<{ url?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "OpenAI no pudo generar la imagen del plato.");
  }

  const temporaryUrl = payload.data?.[0]?.url;
  if (!temporaryUrl) {
    throw new Error("OpenAI devolvió una respuesta de imagen vacía.");
  }

  const { buffer, mimeType } = await fetchImageAsBuffer(temporaryUrl);
  return uploadImageBuffer({ userId: input.userId, buffer, mimeType });
}

function resolveProviderConfigError(provider: RecipeImageProvider): string | null {
  if (provider === "gemini" && !isGoogleGenerativeAiKeyConfigured()) {
    return "RECIPE_IMAGE_PROVIDER=gemini pero GOOGLE_GENERATIVE_AI_API_KEY no es válida.";
  }
  if (provider === "openai" && !isOpenAiApiKeyConfigured()) {
    return "RECIPE_IMAGE_PROVIDER=openai pero OPENAI_API_KEY no es válida. Usa gemini o mock.";
  }
  return null;
}

/**
 * Genera y persiste la foto del plato. Solo debe invocarse para Premium de pago real.
 * Si falla, devuelve null para no bloquear la receta.
 */
export async function generateRecipeDishImage(
  input: GenerateRecipeImageInput
): Promise<{ imageUrl: string | null; error?: string }> {
  const provider = resolveRecipeImageProvider();
  const configError = resolveProviderConfigError(provider);

  if (configError) {
    console.error("[recipe-image]", configError);
    return { imageUrl: null, error: configError };
  }

  try {
    if (provider === "mock") {
      return { imageUrl: await generateWithMock(input) };
    }
    if (provider === "bank") {
      return await generateWithBank(input);
    }
    if (provider === "gemini") {
      try {
        return { imageUrl: await generateWithGemini(input) };
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (shouldFallbackToMockOnGeminiFailure() && isGeminiQuotaOrBillingError(message)) {
          console.warn("[recipe-image] Cuota Gemini Image agotada; usando foto mock en desarrollo.");
          return {
            imageUrl: await generateWithMock(input),
            error:
              "Foto simulada: Gemini Image requiere facturación en Google AI Studio (cuota free tier: 0)."
          };
        }
        throw error;
      }
    }
    return { imageUrl: await generateWithOpenAI(input) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido al generar la imagen del plato.";
    console.error("[recipe-image] Error generando imagen del plato:", error);
    return { imageUrl: null, error: message };
  }
}
