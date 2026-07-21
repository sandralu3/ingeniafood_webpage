import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Cliente Stripe solo servidor (secret key).
 * No importar desde componentes client.
 */
export function getStripe(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY en el entorno.");
  }

  // apiVersion omitida: usa la del SDK instalado (evita drift de tipado).
  stripeClient = new Stripe(secretKey, {
    typescript: true
  });

  return stripeClient;
}

export function getStripePremiumPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID_PREMIUM?.trim();
  if (!priceId) {
    throw new Error("Falta STRIPE_PRICE_ID_PREMIUM en el entorno.");
  }
  return priceId;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Falta STRIPE_WEBHOOK_SECRET en el entorno.");
  }
  return secret;
}
