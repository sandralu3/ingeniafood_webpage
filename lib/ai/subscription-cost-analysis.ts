import { OPENAI_IMAGE_USD } from "@/lib/ai/pricing";
import {
  FREE_DAILY_SCAN_LIMIT,
  PREMIUM_DAILY_SCAN_LIMIT
} from "@/lib/generations/constants";

/**
 * Análisis orientativo para fijar precio de suscripción y cuotas
 * Free vs Premium, cubriendo sobre todo el gasto OpenAI (fotos).
 * Gemini en plan gratuito ≈ $0 (el riesgo es cuota RPM/RPD, no factura).
 */
export type PlanQuotaRecommendation = {
  plan: "free" | "premium";
  label: string;
  /** Escaneos de despensa / día (límite de producto actual). */
  scansPerDay: number;
  /**
   * Llamadas Gemini estimadas / día si usa el tope de escaneos
   * (cada escaneo ≈ 2 llamadas: ingredientes + receta).
   */
  geminiCallsPerDayEstimate: number;
  /** Fotos OpenAI (gpt-image-1) por mes. */
  openaiImagesPerMonth: number;
  /** Coste OpenAI estimado USD / mes / usuario al usar el tope de fotos. */
  openaiCostUsdPerMonth: number;
  notes: string[];
};

export type SubscriptionPriceSuggestion = {
  /** Coste IA puro por Premium al mes (tope de fotos). */
  aiCostUsdPerPremiumUserMonth: number;
  /** Precio mínimo solo para empatar IA (sin margen). */
  breakEvenUsd: number;
  /** Precio sugerido con margen ×5 (Paddle, soporte, Gemini futuro…). */
  suggestedUsd: number;
  /** Precio cómodo con margen ×8. */
  comfortableUsd: number;
  /** Escenarios de fotos Premium / mes → coste y precio sugerido ×5. */
  photoScenarios: Array<{
    imagesPerMonth: number;
    aiCostUsd: number;
    suggestedUsd: number;
  }>;
  assumptions: string[];
};

export type SubscriptionCostAnalysis = {
  openaiImageUsd: number;
  selectedDay: {
    openaiImages: number;
    openaiCostUsd: number;
    openaiCalls: number;
    costPerImageUsd: number | null;
  };
  free: PlanQuotaRecommendation;
  premium: PlanQuotaRecommendation;
  pricing: SubscriptionPriceSuggestion;
  headline: string;
};

const PREMIUM_IMAGES_RECOMMENDED = 8;
const MARGIN_SUGGESTED = 5;
const MARGIN_COMFORTABLE = 8;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMoney4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function buildSubscriptionCostAnalysis(params: {
  selectedDate: string;
  openaiImagesSelectedDay: number;
  openaiCostUsdSelectedDay: number;
  openaiCallsSelectedDay: number;
}): SubscriptionCostAnalysis {
  const openaiImages = Math.max(0, params.openaiImagesSelectedDay);
  const openaiCost = Math.max(0, params.openaiCostUsdSelectedDay);
  const openaiCalls = Math.max(0, params.openaiCallsSelectedDay);
  const observedPerImage =
    openaiImages > 0 ? roundMoney4(openaiCost / openaiImages) : null;

  const freeCost = 0;
  const premiumAiCost = roundMoney4(
    PREMIUM_IMAGES_RECOMMENDED * OPENAI_IMAGE_USD
  );

  const free: PlanQuotaRecommendation = {
    plan: "free",
    label: "Gratis",
    scansPerDay: FREE_DAILY_SCAN_LIMIT,
    geminiCallsPerDayEstimate: FREE_DAILY_SCAN_LIMIT * 2,
    openaiImagesPerMonth: 0,
    openaiCostUsdPerMonth: freeCost,
    notes: [
      `${FREE_DAILY_SCAN_LIMIT} escaneos/día (Gemini free; ~${FREE_DAILY_SCAN_LIMIT * 2} llamadas si usa el tope).`,
      "Sin fotos OpenAI de plato (o 1 de prueba lifetime si ya lo ofreces).",
      "Registrar comida / snack por texto: bajo coste Gemini; no sumar OpenAI."
    ]
  };

  const premium: PlanQuotaRecommendation = {
    plan: "premium",
    label: "Premium",
    scansPerDay: PREMIUM_DAILY_SCAN_LIMIT,
    geminiCallsPerDayEstimate: PREMIUM_DAILY_SCAN_LIMIT * 2,
    openaiImagesPerMonth: PREMIUM_IMAGES_RECOMMENDED,
    openaiCostUsdPerMonth: premiumAiCost,
    notes: [
      `${PREMIUM_DAILY_SCAN_LIMIT} escaneos/día (~${PREMIUM_DAILY_SCAN_LIMIT * 2} llamadas Gemini al tope).`,
      `${PREMIUM_IMAGES_RECOMMENDED} fotos reales OpenAI / mes ≈ $${premiumAiCost.toFixed(2)} IA/usuario.`,
      "Si Gemini sigue en free, el gasto de dinero es casi solo OpenAI."
    ]
  };

  const photoScenarios = [4, 8, 12, 20].map((imagesPerMonth) => {
    const aiCostUsd = roundMoney4(imagesPerMonth * OPENAI_IMAGE_USD);
    return {
      imagesPerMonth,
      aiCostUsd,
      suggestedUsd: roundMoney(Math.max(2.99, aiCostUsd * MARGIN_SUGGESTED))
    };
  });

  const pricing: SubscriptionPriceSuggestion = {
    aiCostUsdPerPremiumUserMonth: premiumAiCost,
    breakEvenUsd: roundMoney(Math.max(0.99, premiumAiCost)),
    suggestedUsd: roundMoney(
      Math.max(4.99, premiumAiCost * MARGIN_SUGGESTED)
    ),
    comfortableUsd: roundMoney(
      Math.max(6.99, premiumAiCost * MARGIN_COMFORTABLE)
    ),
    photoScenarios,
    assumptions: [
      `Foto OpenAI a $${OPENAI_IMAGE_USD.toFixed(3)} (calibrado con tu factura real).`,
      "Gemini plan gratuito ≈ $0; al pasar a facturación Google, sube el coste por escaneo.",
      `Margen sugerido ×${MARGIN_SUGGESTED} (comisión Paddle, soporte, picos, errores).`,
      "Los precios son en USD orientativos; en Paddle puedes fijar EUR equivalente."
    ]
  };

  let headline =
    "Con Gemini gratis, el gasto a cubrir con la suscripción es sobre todo OpenAI (fotos).";
  if (openaiImages > 0) {
    headline = `Hoy (${params.selectedDate}): ${openaiImages} foto(s) OpenAI ≈ $${openaiCost.toFixed(2)}. A ~$${OPENAI_IMAGE_USD.toFixed(3)}/img, ${PREMIUM_IMAGES_RECOMMENDED} fotos/mes Premium cuestan ≈ $${premiumAiCost.toFixed(2)} IA → suscripción sugerida ~$${pricing.suggestedUsd.toFixed(2)}/mes.`;
  }

  return {
    openaiImageUsd: OPENAI_IMAGE_USD,
    selectedDay: {
      openaiImages,
      openaiCostUsd: roundMoney4(openaiCost),
      openaiCalls,
      costPerImageUsd: observedPerImage
    },
    free,
    premium,
    pricing,
    headline
  };
}
