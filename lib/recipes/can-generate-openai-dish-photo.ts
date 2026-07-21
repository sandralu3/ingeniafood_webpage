import type { SupabaseClient } from "@supabase/supabase-js";
import { hasValidSubscription } from "@/lib/billing/has-valid-subscription";
import { isUserTester } from "@/lib/auth/is-tester";
import { getOpenAiPhotoCredits } from "@/lib/recipes/openai-photo-credits";
import type { Database } from "@/types/database.types";

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Kill-switch: sin `OPENAI_DISH_PHOTOS_ENABLED=true` no se llama a OpenAI nunca.
 */
export function isOpenAiDishPhotosEnabled(): boolean {
  const flag = process.env.OPENAI_DISH_PHOTOS_ENABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

/**
 * Foto OpenAI: kill-switch + tester (o admin) + créditos > 0 + Premium/Stripe.
 * Usuarios normales: 0 créditos → nunca.
 * Testers: 1 crédito (se consume al generar).
 */
export async function canGenerateOpenAiDishPhoto(
  supabase: AppSupabaseClient,
  userId: string,
  email?: string | null
): Promise<boolean> {
  if (!isOpenAiDishPhotosEnabled()) {
    return false;
  }

  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return false;
  }

  const isTester = await isUserTester(supabase, trimmedUserId, email);
  if (!isTester) {
    return false;
  }

  const credits = await getOpenAiPhotoCredits(supabase, trimmedUserId);
  if (credits < 1) {
    return false;
  }

  if (await hasValidSubscription(supabase, trimmedUserId, email)) {
    return true;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_premium, premium_trial_remaining")
    .eq("id", trimmedUserId)
    .maybeSingle();

  if (error) {
    console.warn("[dish-photo] No se pudo validar Premium (fail-closed):", error.message);
    return false;
  }

  const trialRemaining = Math.max(0, profile?.premium_trial_remaining ?? 0);
  if (trialRemaining > 0) {
    return false;
  }

  return profile?.is_premium === true;
}
