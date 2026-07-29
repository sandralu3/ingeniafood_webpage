import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import {
  createDetectedIngredient,
  type DetectedIngredient
} from "@/lib/scanner/detected-ingredient";

export const maxDuration = 60;
export const runtime = "nodejs";

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif"
]);

type DetectPayload = {
  imageBase64?: string;
  mimeType?: string;
  locale?: string;
};

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status });
}

function maskApiKeyForDevLog(apiKey: string): string {
  if (apiKey.length < 8) return "***";
  return `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`;
}

function buildModelCandidates(configured?: string): string[] {
  // Misma familia que generate-recipe (evita 404 en modelos retirados / free-tier agotado).
  const defaults = ["gemini-3.1-flash-lite"];
  const all = configured?.trim() ? [configured.trim(), ...defaults] : defaults;
  return Array.from(new Set(all.filter((model) => model.length > 0)));
}

function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("429") ||
    message.toLowerCase().includes("quota") ||
    message.toLowerCase().includes("too many requests") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

function parseBoundingBox(raw: unknown): [number, number, number, number] | undefined {
  if (!Array.isArray(raw) || raw.length !== 4) return undefined;
  const nums = raw.map((v) => Number(v));
  if (nums.some((n) => !Number.isFinite(n))) return undefined;
  const [a, b, c, d] = nums;
  // Accept 0–1 or 0–1000; normalize to 0–1000.
  const scale = Math.max(a, b, c, d) <= 1.5 ? 1000 : 1;
  const box: [number, number, number, number] = [
    Math.min(1000, Math.max(0, a * scale)),
    Math.min(1000, Math.max(0, b * scale)),
    Math.min(1000, Math.max(0, c * scale)),
    Math.min(1000, Math.max(0, d * scale))
  ];
  return box;
}

function normalizeDetectionPayload(raw: unknown): DetectedIngredient[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as { ingredients?: unknown; error?: unknown };
  if (obj.error === "NOT_FOOD") return [];

  const list = Array.isArray(obj.ingredients) ? obj.ingredients : [];
  const seen = new Set<string>();
  const result: DetectedIngredient[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as { name?: unknown; emoji?: unknown; box_2d?: unknown; boundingBox?: unknown };
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const emoji = typeof row.emoji === "string" && row.emoji.trim() ? row.emoji.trim() : undefined;
    const boundingBox = parseBoundingBox(row.box_2d ?? row.boundingBox);
    result.push(
      createDetectedIngredient(name, {
        emoji,
        isSelected: true,
        boundingBox
      })
    );
  }

  return result.slice(0, 24);
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient();
    if (!supabase) {
      return jsonResponse({ error: "No se pudo inicializar la sesión." }, 500);
    }
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonResponse({ error: "No autenticado." }, 401);
    }

    const body = (await request.json()) as DetectPayload;
    const imageBase64 =
      typeof body.imageBase64 === "string" ? body.imageBase64.replace(/^data:[^;]+;base64,/, "") : "";
    const mimeType =
      typeof body.mimeType === "string" && body.mimeType.trim()
        ? body.mimeType.trim().toLowerCase()
        : "image/jpeg";

    if (!imageBase64) {
      return jsonResponse({ error: "Falta la imagen para detectar ingredientes." }, 400);
    }
    if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
      return jsonResponse({ error: "Formato de imagen no soportado." }, 400);
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
    if (!apiKey) {
      return jsonResponse(
        { error: "Falta GOOGLE_GENERATIVE_AI_API_KEY en variables de entorno." },
        500
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.log(`[detect-ingredients] API key: ${maskApiKeyForDevLog(apiKey)}`);
    }

    const localeHint =
      body.locale === "en"
        ? "Return ingredient names in English."
        : "Devuelve los nombres de ingredientes en español.";

    const prompt =
      "Analiza esta foto de nevera/despensa/alimentos. " +
      "Si NO hay comida comestible visible, responde SOLO: {\"error\":\"NOT_FOOD\"}. " +
      "Si hay comida, responde SOLO JSON válido con este formato:\n" +
      '{"ingredients":[{"name":"Tomate","emoji":"🍅","box_2d":[ymin,xmin,ymax,xmax]}]}\n' +
      "Reglas:\n" +
      "- Lista solo ingredientes/alimentos claramente visibles (máx. 16).\n" +
      "- name: corto y concreto (sin cantidades).\n" +
      "- emoji: un emoji representativo.\n" +
      "- box_2d: coordenadas normalizadas 0–1000 [ymin, xmin, ymax, xmax] del objeto en la imagen.\n" +
      "- No inventes productos que no se vean.\n" +
      localeHint;

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = buildModelCandidates(
      process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim()
    );

    let text = "";
    let lastError: unknown = null;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        });
        const result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: imageBase64
            }
          }
        ]);
        text = result.response.text()?.trim() ?? "";
        if (text) break;
      } catch (error) {
        lastError = error;
        console.warn(`[detect-ingredients] modelo ${modelName} falló:`, error);
      }
    }

    if (!text) {
      console.error("[detect-ingredients] sin respuesta:", lastError);
      if (isQuotaError(lastError)) {
        return jsonResponse(
          {
            error:
              "Has alcanzado el límite temporal de la API de Gemini. Espera un momento e inténtalo de nuevo.",
            code: "QUOTA_EXCEEDED"
          },
          429
        );
      }
      return jsonResponse({ error: "No pudimos detectar ingredientes en la imagen." }, 502);
    }

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { error?: string }).error === "NOT_FOOD"
    ) {
      return jsonResponse(
        { error: "NOT_FOOD", code: "NOT_FOOD", ingredients: [] },
        422
      );
    }

    const ingredients = normalizeDetectionPayload(parsed);
    if (ingredients.length === 0) {
      return jsonResponse(
        { error: "No encontramos ingredientes comestibles en la foto.", ingredients: [] },
        422
      );
    }

    return jsonResponse({ ingredients });
  } catch (error) {
    console.error("[detect-ingredients]", error);
    return jsonResponse({ error: "Error interno al detectar ingredientes." }, 500);
  }
}
