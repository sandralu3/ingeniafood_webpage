import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_MAX_AGE_SECONDS = 60 * 5; // 5 minutos (el SDK oficial usa solo 5s)

/**
 * Verifica Paddle-Signature con tolerancia razonable para serverless (Vercel).
 * El SDK @paddle/paddle-node-sdk rechaza firmas con >5s de antigüedad, lo que
 * hace fallar retries y cold starts aunque el secret sea correcto.
 */
export function verifyPaddleWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  secret: string;
  maxAgeSeconds?: number;
}): boolean {
  const { rawBody, signatureHeader, secret } = params;
  const maxAgeSeconds = params.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;

  if (!rawBody || !signatureHeader || !secret) {
    return false;
  }

  let ts = "";
  let h1 = "";
  for (const part of signatureHeader.split(";")) {
    const [key, value] = part.split("=");
    if (!value) continue;
    if (key === "ts") ts = value;
    if (key === "h1") h1 = value;
  }

  if (!ts || !h1) {
    return false;
  }

  const timestamp = Number.parseInt(ts, 10);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > maxAgeSeconds) {
    return false;
  }

  const computed = createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`, "utf8")
    .digest("hex");

  try {
    const a = Buffer.from(computed, "utf8");
    const b = Buffer.from(h1, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Limpia secret pegado en Vercel (comillas, saltos de línea, BOM). */
export function sanitizePaddleWebhookSecret(raw: string | undefined | null): string {
  return (raw ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\r?\n/g, "")
    .trim();
}
