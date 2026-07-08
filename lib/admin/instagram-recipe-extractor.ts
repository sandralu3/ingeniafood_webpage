import { GoogleGenerativeAI } from "@google/generative-ai";
import { normalizeRecipeTags } from "@/lib/recipes/recipe-tags";

export const INSTAGRAM_RECIPE_SYSTEM_PROMPT =
  "Actúas como un extractor de datos culinarios. Vas a recibir una descripción de un post de Instagram de recetas saludables. " +
  "Tu objetivo es devolver estrictamente un objeto JSON con las siguientes claves: " +
  "'titulo' (atractivo y limpio), 'ingredientes' (un array de strings con cantidades), " +
  "'preparacion' (un array con los pasos ordenados secuencialmente) y 'tags' (ej: ['Sin harinas', 'Saludable']). " +
  "No agregues formato Markdown ni explicaciones adicionales, solo el JSON.";

export type StructuredInstagramRecipe = {
  titulo: string;
  ingredientes: string[];
  preparacion: string[];
  tags: string[];
};

type LooseInstagramRecipe = {
  titulo?: unknown;
  ingredientes?: unknown;
  ingredientes_detallados?: unknown;
  preparacion?: unknown;
  pasos?: unknown;
  pasos_ordenados?: unknown;
  tags?: unknown;
  etiquetas?: unknown;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
    .filter((item) => item.length > 0);
}

function parseExtractedRecipe(raw: unknown): StructuredInstagramRecipe | null {
  if (!raw || typeof raw !== "object") return null;

  const recipe = raw as LooseInstagramRecipe;
  const titulo = typeof recipe.titulo === "string" ? recipe.titulo.trim() : "";
  const ingredientes = toStringArray(recipe.ingredientes ?? recipe.ingredientes_detallados);
  const preparacion = toStringArray(recipe.preparacion ?? recipe.pasos_ordenados ?? recipe.pasos);
  const tags = normalizeRecipeTags(recipe.tags ?? recipe.etiquetas);

  if (!titulo || ingredientes.length === 0 || preparacion.length === 0) {
    return null;
  }

  return { titulo, ingredientes, preparacion, tags };
}

function extractJsonObject(rawText: string): string {
  let text = rawText.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    text = fence[1].trim();
  }

  const match = text.match(/\{[\s\S]*\}/);
  return (match ? match[0] : text).replace(/,\s*([}\]])/g, "$1").trim();
}

function buildModelCandidates(): string[] {
  const configured = process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim();
  const defaults = ["gemini-3.1-flash-lite"];
  const all = configured ? [configured, ...defaults] : defaults;
  return Array.from(new Set(all.filter(Boolean)));
}

export async function extractRecipeFromInstagramText(
  texto: string
): Promise<StructuredInstagramRecipe> {
  const trimmed = texto.trim();
  if (!trimmed) {
    throw new Error("Pega la descripción del post de Instagram antes de procesar.");
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Falta GOOGLE_GENERATIVE_AI_API_KEY en variables de entorno.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelCandidates = buildModelCandidates();
  let lastError = "No se pudo procesar la descripción con Gemini.";

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: INSTAGRAM_RECIPE_SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      });

      const result = await model.generateContent(
        `Extrae la receta de este texto de Instagram:\n\n${trimmed}`
      );

      const rawText = result.response.text();
      const jsonString = extractJsonObject(rawText);

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonString);
      } catch {
        lastError = "Gemini devolvió un JSON inválido. Inténtalo de nuevo.";
        continue;
      }

      const normalized = parseExtractedRecipe(parsed);
      if (!normalized) {
        lastError = "La respuesta de Gemini no incluye título, ingredientes y pasos completos.";
        continue;
      }

      return normalized;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError);
}
