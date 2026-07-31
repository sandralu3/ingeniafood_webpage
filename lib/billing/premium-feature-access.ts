import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserPremiumAccess } from "@/lib/auth/user-premium";
import { getSubscriptionAccess } from "@/lib/billing/has-valid-subscription";
import type { Database } from "@/types/database.types";

type AppSupabaseClient = SupabaseClient<Database>;

export function isOpenAiDishPhotosEnabled(): boolean {
  const flag = process.env.OPENAI_DISH_PHOTOS_ENABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export type DishPhotoAccess =
  | {
      allowed: false;
      reason: "DISABLED" | "NO_USER" | "PREMIUM_REQUIRED" | "PHOTO_USED";
    }
  | { allowed: true; mode: "unlimited" | "once" };

/**
 * Foto IA del plato:
 * - Stripe / admin / tester → ilimitado
 * - Premium por código (u otro Premium no-Stripe) → 1 foto lifetime
 * - Free → paywall
 * - Si has_generated_real_photo → bloqueo con mensaje de upgrade
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

  const { access, error } = await getUserPremiumAccess(supabase, trimmedUserId, email);
  if (error) {
    return { allowed: false, reason: "PREMIUM_REQUIRED" };
  }

  if (!access.canUsePremiumFeatures) {
    return { allowed: false, reason: "PREMIUM_REQUIRED" };
  }

  const { access: subscription } = await getSubscriptionAccess(supabase, trimmedUserId);
  const unlimited =
    subscription.hasValidSubscription ||
    access.role === "admin" ||
    access.role === "tester";

  if (unlimited) {
    return { allowed: true, mode: "unlimited" };
  }

  if (access.hasGeneratedRealPhoto) {
    return { allowed: false, reason: "PHOTO_USED" };
  }

  return { allowed: true, mode: "once" };
}

export const REAL_PHOTO_USED_MESSAGE =
  "Ya has utilizado tu generación de foto real de prueba. Actualiza a la versión completa para generar fotos ilimitadas.";
