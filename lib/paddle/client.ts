import { Environment, Paddle } from "@paddle/paddle-node-sdk";

let paddleClient: Paddle | null = null;

function readEnv(name: string): string {
  const raw = process.env[name]?.trim() ?? "";
  return raw.replace(/^["']|["']$/g, "").trim();
}

function resolvePaddleEnvironment(): Environment {
  const raw = readEnv("NEXT_PUBLIC_PADDLE_ENVIRONMENT").toLowerCase();
  if (raw === "production") {
    return Environment.production;
  }
  return Environment.sandbox;
}

/**
 * Cliente Paddle Billing solo servidor (API key).
 * No importar desde componentes client.
 */
export function getPaddle(): Paddle {
  if (paddleClient) {
    return paddleClient;
  }

  const apiKey = readEnv("PADDLE_API_KEY");
  if (!apiKey) {
    throw new Error("Falta PADDLE_API_KEY en el entorno.");
  }

  paddleClient = new Paddle(apiKey, {
    environment: resolvePaddleEnvironment()
  });

  return paddleClient;
}

export function getPaddleWebhookSecret(): string {
  const secret = readEnv("PADDLE_WEBHOOK_SECRET");
  if (!secret) {
    throw new Error("Falta PADDLE_WEBHOOK_SECRET en el entorno.");
  }
  return secret;
}

export type PaddlePriceInterval = "month" | "year";

export function getPaddlePriceId(interval: PaddlePriceInterval = "month"): string {
  const envKey =
    interval === "year" ? "PADDLE_PRICE_ID_YEARLY" : "PADDLE_PRICE_ID_MONTHLY";
  const priceId = readEnv(envKey);
  if (!priceId) {
    throw new Error(`Falta ${envKey} en el entorno.`);
  }
  return priceId;
}

export function getPaddleClientToken(): string {
  const token = readEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
  if (!token) {
    throw new Error("Falta NEXT_PUBLIC_PADDLE_CLIENT_TOKEN en el entorno.");
  }
  return token;
}

export function getPaddlePublicEnvironment(): "sandbox" | "production" {
  return resolvePaddleEnvironment() === Environment.production
    ? "production"
    : "sandbox";
}
