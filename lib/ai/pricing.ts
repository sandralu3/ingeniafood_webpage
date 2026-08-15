import type { AiUsageProvider } from "@/lib/ai/usage-types";

/** Precios orientativos USD (por millón de tokens / por imagen). Ajustables. */
const GEMINI_INPUT_USD_PER_MTOK = 0.1;
const GEMINI_OUTPUT_USD_PER_MTOK = 0.4;
/** Si Gemini no devuelve usageMetadata, coste mínimo por llamada. */
const GEMINI_FALLBACK_CALL_USD = 0.0008;

/**
 * Coste real observado gpt-image-1 (15 ago 2026):
 * $0,39 / 9 imágenes ≈ $0,043 por imagen (incluye salida + texto del prompt).
 */
export const OPENAI_IMAGE_USD = 0.043;

export function estimateAiCostUsd(params: {
  provider: AiUsageProvider;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
}): number {
  const input = Math.max(0, params.inputTokens ?? 0);
  const output = Math.max(0, params.outputTokens ?? 0);
  const images = Math.max(0, params.imageCount ?? 0);

  if (params.provider === "openai") {
    if (images > 0) {
      return roundUsd(images * OPENAI_IMAGE_USD);
    }
    // Texto OpenAI residual (raro en esta app).
    return roundUsd(
      (input / 1_000_000) * 2.5 + (output / 1_000_000) * 10
    );
  }

  if (input === 0 && output === 0) {
    return GEMINI_FALLBACK_CALL_USD;
  }

  return roundUsd(
    (input / 1_000_000) * GEMINI_INPUT_USD_PER_MTOK +
      (output / 1_000_000) * GEMINI_OUTPUT_USD_PER_MTOK
  );
}

function roundUsd(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 1_000_000) / 1_000_000;
}
