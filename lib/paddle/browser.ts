"use client";

import { initializePaddle, type Paddle, type Environments } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;
let paddleInitKey: string | null = null;

function readPublicEnv(name: string): string {
  const raw = process.env[name]?.trim() ?? "";
  return raw.replace(/^["']|["']$/g, "").trim();
}

function resolveEnvironment(explicit?: Environments | string): Environments {
  if (explicit === "production" || explicit === "sandbox") {
    return explicit;
  }
  const raw = readPublicEnv("NEXT_PUBLIC_PADDLE_ENVIRONMENT").toLowerCase();
  return raw === "production" ? "production" : "sandbox";
}

/** Inicializa Paddle.js con token del servidor (o fallback NEXT_PUBLIC_*). */
export function getBrowserPaddle(options?: {
  clientToken?: string;
  environment?: Environments | string;
}): Promise<Paddle | undefined> {
  const token =
    options?.clientToken?.trim() ||
    readPublicEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
  if (!token) {
    throw new Error(
      "Falta el client token de Paddle. Revisa PADDLE / NEXT_PUBLIC_PADDLE_CLIENT_TOKEN y reinicia el servidor."
    );
  }

  const environment = resolveEnvironment(options?.environment);
  const initKey = `${environment}:${token}`;

  if (!paddlePromise || paddleInitKey !== initKey) {
    paddleInitKey = initKey;
    paddlePromise = initializePaddle({
      token,
      environment,
      eventCallback: (event) => {
        if (event.name?.includes("error") || event.type === "error") {
          console.error("[paddle.js]", event);
        }
      }
    });
  }

  return paddlePromise;
}

export type OpenPaddleCheckoutInput = {
  priceId: string;
  customerEmail: string;
  customData: Record<string, unknown>;
  successUrl?: string;
  /** Client-side token (test_/live_). Preferido desde /api/paddle/checkout-session. */
  clientToken?: string;
  environment?: Environments | string;
};

export async function openPaddleCheckoutOverlay(
  input: OpenPaddleCheckoutInput
): Promise<void> {
  const paddle = await getBrowserPaddle({
    clientToken: input.clientToken,
    environment: input.environment
  });
  if (!paddle) {
    throw new Error("No pudimos cargar Paddle.js.");
  }

  if (!input.priceId.startsWith("pri_")) {
    throw new Error("El priceId de Paddle no es válido (debe empezar por pri_).");
  }

  paddle.Checkout.open({
    items: [{ priceId: input.priceId, quantity: 1 }],
    customer: { email: input.customerEmail },
    customData: input.customData,
    settings: {
      displayMode: "overlay",
      theme: "light",
      successUrl: input.successUrl
    }
  });
}
