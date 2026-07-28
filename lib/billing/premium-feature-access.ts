import type { SupabaseClient } from "@supabase/supabase-js";
import { hasValidSubscription } from "@/lib/billing/has-valid-subscription";
import type { Database } from "@/types/database.types";

type AppSupabaseClient = SupabaseClient<Database>;

export function isOpenAiDishPhotosEnabled(): boolean {
  const flag = process.env.OPENAI_DISH_PHOTOS_ENABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export type DishPhotoAccess =
  | { allowed: false; reason: "DISABLED" | "NO_USER" | "PREMIUM_REQUIRED" }
  | { allowed: true; mode: "unlimited" };

/**
 * Foto IA del plato: solo Premium de pago / Stripe válido (sin economía de créditos).
 */
export async function resolveDishPhotoAccess(
  supabase: AppSupabaseClient,
  userId: string,
  email?: string | null
): Promise<DishPhotoAccess> {
  if (!isOpenAiDishPhotosEnabled()) {
    return { allowed: false, reason: "DISABLED" };
  }

  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return { allowed: false, reason: "NO_USER" };
  }

  if (await hasValidSubscription(supabase, trimmedUserId, email)) {
    return { allowed: true, mode: "unlimited" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium, premium_trial_remaining")
    .eq("id", trimmedUserId)
    .maybeSingle();

  const trialRemaining = Math.max(0, profile?.premium_trial_remaining ?? 0);
  if (profile?.is_premium === true && trialRemaining === 0) {
    return { allowed: true, mode: "unlimited" };
  }

  return { allowed: false, reason: "PREMIUM_REQUIRED" };
}
