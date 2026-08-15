import { estimateAiCostUsd } from "@/lib/ai/pricing";
import type { LogAiUsageInput } from "@/lib/ai/usage-types";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

/** Extrae tokens de la respuesta del SDK de Gemini. */
export function extractGeminiTokenUsage(response: {
  usageMetadata?: GeminiUsageMetadata;
} | null | undefined): { inputTokens: number; outputTokens: number } {
  const meta = response?.usageMetadata;
  const input = Number(meta?.promptTokenCount ?? 0);
  const output = Number(meta?.candidatesTokenCount ?? 0);
  return {
    inputTokens: Number.isFinite(input) && input > 0 ? Math.round(input) : 0,
    outputTokens: Number.isFinite(output) && output > 0 ? Math.round(output) : 0
  };
}

/**
 * Registra una llamada a IA (no bloquea UX si falla el insert).
 * Solo servidor; usa service role.
 */
export async function logAiUsage(input: LogAiUsageInput): Promise<void> {
  try {
    if (
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    ) {
      return;
    }

    const inputTokens = Math.max(0, Math.round(input.inputTokens ?? 0));
    const outputTokens = Math.max(0, Math.round(input.outputTokens ?? 0));
    const imageCount = Math.max(0, Math.round(input.imageCount ?? 0));
    const estimatedCostUsd = estimateAiCostUsd({
      provider: input.provider,
      inputTokens,
      outputTokens,
      imageCount
    });

    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("ai_usage_events").insert({
      user_id: input.userId ?? null,
      feature: input.feature,
      provider: input.provider,
      model: input.model?.trim() || null,
      status: input.status ?? "success",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      image_count: imageCount,
      estimated_cost_usd: estimatedCostUsd,
      latency_ms:
        typeof input.latencyMs === "number" && Number.isFinite(input.latencyMs)
          ? Math.max(0, Math.round(input.latencyMs))
          : null,
      meta: (input.meta ?? {}) as import("@/types/database.types").Json
    });

    if (error) {
      // Tabla aún no migrada u otro fallo: no romper la app.
      if (error.code === "PGRST205" || error.code === "42P01") return;
      console.warn("[ai-usage] No se pudo registrar:", error.message);
    }
  } catch (error) {
    console.warn(
      "[ai-usage] Error al registrar:",
      error instanceof Error ? error.message : error
    );
  }
}
