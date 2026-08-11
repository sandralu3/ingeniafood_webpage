import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserPremiumAccess } from "@/lib/auth/user-premium";
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
 * - Free (sin Premium) → NUNCA (ni una sola vez)
 * - admin → ilimitado
 * - Premium (Stripe, código 24h, tester) → 1 foto lifetime
 * - Si has_generated_real_photo → bloqueo (excepto admin)
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

  // Cuenta Free: sin foto real, ni siquiera de prueba.
  const isPremiumUser =
    access.canUsePremiumFeatures ||
    access.isPaidPremium ||
    access.isCodePremium ||
    access.role === "admin";

  if (!isPremiumUser) {
    return { allowed: false, reason: "PREMIUM_REQUIRED" };
  }

  // Solo el administrador tiene generaciones ilimitadas.
  if (access.role === "admin") {
    return { allowed: true, mode: "unlimited" };
  }

  if (access.hasGeneratedRealPhoto) {
    return { allowed: false, reason: "PHOTO_USED" };
  }

  return { allowed: true, mode: "once" };
}

export const REAL_PHOTO_USED_MESSAGE =
  "Ya has utilizado tu único intento de foto real. Las siguientes recetas usarán imagen de referencia.";

export const REAL_PHOTO_PREMIUM_REQUIRED_MESSAGE =
  "La foto real del plato no está disponible en la cuenta Free. Activa Premium para usarla.";
