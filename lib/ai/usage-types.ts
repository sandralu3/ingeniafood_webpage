export const AI_USAGE_FEATURES = [
  "generate_recipe",
  "detect_ingredients",
  "estimate_external_meal",
  "intelligent_dose",
  "premium_stories",
  "meal_suggestion",
  "dish_photo",
  "admin_instagram_structure",
  "admin_sandra_enrich"
] as const;

export type AiUsageFeature = (typeof AI_USAGE_FEATURES)[number];

export type AiUsageProvider = "gemini" | "openai";

export type AiUsageStatus = "success" | "error";

export const AI_USAGE_FEATURE_LABELS: Record<AiUsageFeature, string> = {
  generate_recipe: "Escáner → receta",
  detect_ingredients: "Escáner → ingredientes",
  estimate_external_meal: "Registrar comida / snack",
  intelligent_dose: "Dosis inteligente",
  premium_stories: "Stories Premium",
  meal_suggestion: "Sugerir menú del día",
  dish_photo: "Foto de plato (OpenAI)",
  admin_instagram_structure: "Admin · Instagram → estructura",
  admin_sandra_enrich: "Admin · Enriquecer Sandra"
};

export type LogAiUsageInput = {
  userId?: string | null;
  feature: AiUsageFeature;
  provider: AiUsageProvider;
  model?: string | null;
  status?: AiUsageStatus;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  latencyMs?: number | null;
  meta?: Record<string, unknown>;
};
