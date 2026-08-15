import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractGeminiTokenUsage, logAiUsage } from "@/lib/ai/log-ai-usage";
import {
  ASSIGNABLE_RECIPE_DIETS,
  parsePreferredDietList,
  type AssignableRecipeDiet
} from "@/lib/recipes/recipe-diet-tags";
import { normalizeRecipeMacros, type RecipeMacros } from "@/lib/recipes/recipe-macros";

const DIET_IDS_FOR_PROMPT = ASSIGNABLE_RECIPE_DIETS.map((item) => item.id).join(", ");

const SYSTEM_PROMPT =
  "Eres nutricionista culinaria de IngeniaFood. Analizas recetas saludables y respondes SOLO JSON válido, sin markdown. " +
  "Estimas dietas aplicables y macronutrientes por 1 porción.";

type EnrichAiResult = {
  diets: AssignableRecipeDiet[];
  macros: RecipeMacros;
};

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
  const defaults = ["gemini-2.0-flash", "gemini-3.1-flash-lite"];
  const all = configured ? [configured, ...defaults] : defaults;
  return Array.from(new Set(all.filter(Boolean)));
}

function buildUserPrompt(params: {
  title: string;
  ingredients: string[];
  steps: string[];
  mealType: string | null;
  servings: number;
}): string {
  return (
    `Receta:\n` +
    `Título: ${params.title}\n` +
    `Tipo de comida: ${params.mealType ?? "desconocido"}\n` +
    `Porciones de la ficha (para dividir totales): ${params.servings}\n\n` +
    `Ingredientes:\n${params.ingredients.map((line) => `- ${line}`).join("\n") || "- (sin lista)"}\n\n` +
    `Preparación:\n${params.steps.map((line, i) => `${i + 1}. ${line}`).join("\n") || "(sin pasos)"}\n\n` +
    `Devuelve JSON con esta forma exacta:\n` +
    `{\n` +
    `  "diets": string[],\n` +
    `  "macronutrientes": {"proteinas_g": number, "carbohidratos_g": number, "grasas_g": number, "calorias": number}\n` +
    `}\n\n` +
    `Reglas diets:\n` +
    `- Solo ids de esta lista (puedes poner varios o []): ${DIET_IDS_FOR_PROMPT}\n` +
    `- Incluye una dieta SOLO si la receta es claramente compatible (ej. vegetariana si no hay carne/pescado).\n` +
    `- No inventes dietas dudosas; si no hay señal clara, usa [].\n\n` +
    `Reglas macronutrientes:\n` +
    `- Estimación REAL por 1 porción (totales de ingredientes ÷ porciones).\n` +
    `- Gramos y kcal enteros; calorias ≈ 4P+4C+9G (±10%).\n`
  );
}

/**
 * IA: dietas aplicables + macros por porción a partir del contenido de la receta.
 */
export async function estimateSandraRecipeDietsAndMacros(params: {
  title: string;
  ingredients: string[];
  steps: string[];
  mealType?: string | null;
  servings?: number | null;
}): Promise<EnrichAiResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Falta GOOGLE_GENERATIVE_AI_API_KEY en variables de entorno.");
  }

  const title = params.title.trim();
  if (!title) {
    throw new Error("La receta no tiene título.");
  }

  const servings =
    typeof params.servings === "number" && params.servings > 0 ? Math.round(params.servings) : 2;

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelCandidates = buildModelCandidates();
  let lastError = "No pudimos estimar dietas y macros con la IA.";

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: "application/json"
        }
      });

      const result = await model.generateContent(
        buildUserPrompt({
          title,
          ingredients: params.ingredients,
          steps: params.steps,
          mealType: params.mealType ?? null,
          servings
        })
      );

      const rawText = result.response.text();
      const tokens = extractGeminiTokenUsage(result.response);
      void logAiUsage({
        feature: "admin_sandra_enrich",
        provider: "gemini",
        model: modelName,
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens
      });
      let parsed: unknown;
      try {
        parsed = JSON.parse(extractJsonObject(rawText));
      } catch {
        lastError = "La IA devolvió un JSON inválido.";
        continue;
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        lastError = "La respuesta de la IA no es un objeto válido.";
        continue;
      }

      const record = parsed as Record<string, unknown>;
      const diets = parsePreferredDietList(record.diets ?? record.dietas);
      const macros = normalizeRecipeMacros(record.macronutrientes ?? record.macros);
      if (!macros) {
        lastError = "La IA no devolvió macronutrientes válidos.";
        continue;
      }

      return { diets, macros };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Error al llamar a Gemini para enriquecer la receta.";
    }
  }

  throw new Error(lastError);
}
