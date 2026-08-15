/**
 * Límites del plan gratuito de Gemini (API Google AI),
 * alineados con la consola de IngeniaFood (Flash Lite / free tier).
 * Ajustables si Google cambia las cuotas.
 */
export const GEMINI_FREE_TIER = {
  tierLabel: "Nivel gratuito",
  modelLabel: "Gemini 3.1 Flash Lite",
  /** Solicitudes máximas por minuto (RPM). */
  rpmLimit: 15,
  /** Tokens de entrada máximos por minuto (TPM), como en la consola de Google. */
  tpmLimit: 250_000,
  /** Solicitudes máximas por día (RPD). */
  rpdLimit: 500,
  /** Aviso al superar este % del límite. */
  warnRatio: 0.8
} as const;

export type GeminiLimitStatus = "ok" | "warning" | "exceeded";

export type GeminiQuotaMetric = {
  key: "rpm" | "tpm" | "rpd";
  label: string;
  used: number;
  limit: number;
  /** Pico del día (RPM/TPM) o total del día (RPD). */
  status: GeminiLimitStatus;
  detail: string;
};

export type GeminiQuotaSnapshot = {
  tierLabel: string;
  modelLabel: string;
  selectedDate: string;
  metrics: GeminiQuotaMetric[];
  anyExceeded: boolean;
  anyWarning: boolean;
  /** Errores registrados con motivo de cuota en ese día. */
  quotaErrorCount: number;
  headline: string;
};

export function resolveGeminiLimitStatus(
  used: number,
  limit: number,
  warnRatio = GEMINI_FREE_TIER.warnRatio
): GeminiLimitStatus {
  if (limit <= 0) return "ok";
  if (used > limit) return "exceeded";
  if (used >= limit * warnRatio) return "warning";
  return "ok";
}

/** Agrupa eventos Gemini por minuto UTC (YYYY-MM-DDTHH:MM). */
export function minuteBucketKey(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return "invalid";
  return date.toISOString().slice(0, 16);
}

export function buildGeminiQuotaSnapshot(params: {
  selectedDate: string;
  geminiEvents: Array<{
    created_at: string;
    input_tokens: number;
    output_tokens: number;
    status: string;
    meta?: unknown;
  }>;
}): GeminiQuotaSnapshot {
  const { selectedDate, geminiEvents } = params;
  const rpmByMinute = new Map<string, number>();
  const tpmByMinute = new Map<string, number>();
  let quotaErrorCount = 0;

  for (const event of geminiEvents) {
    const bucket = minuteBucketKey(event.created_at);
    rpmByMinute.set(bucket, (rpmByMinute.get(bucket) ?? 0) + 1);
    // Consola Google: TPM = tokens de entrada por minuto.
    const inputTokens = Math.max(0, event.input_tokens);
    tpmByMinute.set(bucket, (tpmByMinute.get(bucket) ?? 0) + inputTokens);
    if (event.status === "error" && isQuotaMeta(event.meta)) {
      quotaErrorCount += 1;
    }
  }

  let peakRpm = 0;
  let peakRpmAt: string | null = null;
  for (const [bucket, count] of Array.from(rpmByMinute.entries())) {
    if (count > peakRpm) {
      peakRpm = count;
      peakRpmAt = bucket;
    }
  }

  let peakTpm = 0;
  let peakTpmAt: string | null = null;
  for (const [bucket, tokens] of Array.from(tpmByMinute.entries())) {
    if (tokens > peakTpm) {
      peakTpm = tokens;
      peakTpmAt = bucket;
    }
  }

  const rpd = geminiEvents.length;
  const rpmStatus = resolveGeminiLimitStatus(peakRpm, GEMINI_FREE_TIER.rpmLimit);
  const tpmStatus = resolveGeminiLimitStatus(peakTpm, GEMINI_FREE_TIER.tpmLimit);
  const rpdStatus = resolveGeminiLimitStatus(rpd, GEMINI_FREE_TIER.rpdLimit);

  const metrics: GeminiQuotaMetric[] = [
    {
      key: "rpm",
      label: "RPM · máx. por minuto",
      used: peakRpm,
      limit: GEMINI_FREE_TIER.rpmLimit,
      status: rpmStatus,
      detail: peakRpmAt
        ? `Pico a las ${formatMinuteLabel(peakRpmAt)}`
        : "Sin llamadas Gemini este día"
    },
    {
      key: "tpm",
      label: "TPM · tokens entrada / min",
      used: peakTpm,
      limit: GEMINI_FREE_TIER.tpmLimit,
      status: tpmStatus,
      detail: peakTpmAt
        ? `Pico a las ${formatMinuteLabel(peakTpmAt)}`
        : "Sin tokens registrados"
    },
    {
      key: "rpd",
      label: "RPD · solicitudes / día",
      used: rpd,
      limit: GEMINI_FREE_TIER.rpdLimit,
      status: rpdStatus,
      detail: `${rpd} de ${GEMINI_FREE_TIER.rpdLimit} en el día`
    }
  ];

  const anyExceeded =
    metrics.some((m) => m.status === "exceeded") || quotaErrorCount > 0;
  const anyWarning = metrics.some((m) => m.status === "warning");

  let headline = "Dentro de los límites del plan gratuito de Gemini.";
  if (anyExceeded) {
    const parts: string[] = [];
    if (rpmStatus === "exceeded") {
      parts.push(
        `RPM ${peakRpm}/${GEMINI_FREE_TIER.rpmLimit} (límite de frecuencia por minuto)`
      );
    }
    if (tpmStatus === "exceeded") {
      parts.push(`TPM ${peakTpm}/${GEMINI_FREE_TIER.tpmLimit}`);
    }
    if (rpdStatus === "exceeded") {
      parts.push(`RPD ${rpd}/${GEMINI_FREE_TIER.rpdLimit}`);
    }
    if (quotaErrorCount > 0) {
      parts.push(`${quotaErrorCount} error(es) de cuota devueltos por Gemini`);
    }
    headline = `Límite alcanzado o superado: ${parts.join(" · ")}.`;
  } else if (anyWarning) {
    headline =
      "Te estás acercando a un límite del plan gratuito (≥ 80 %). Reduce picos o activa facturación si hace falta.";
  }

  return {
    tierLabel: GEMINI_FREE_TIER.tierLabel,
    modelLabel: GEMINI_FREE_TIER.modelLabel,
    selectedDate,
    metrics,
    anyExceeded,
    anyWarning,
    quotaErrorCount,
    headline
  };
}

function isQuotaMeta(meta: unknown): boolean {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  const record = meta as Record<string, unknown>;
  const reason = String(record.reason ?? record.quota ?? "").toLowerCase();
  return (
    reason.includes("quota") ||
    reason.includes("rate") ||
    reason.includes("429") ||
    record.quota === true
  );
}

function formatMinuteLabel(bucket: string): string {
  // bucket: 2026-08-15T14:22
  const date = new Date(`${bucket}:00.000Z`);
  if (Number.isNaN(date.getTime())) return bucket;
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
