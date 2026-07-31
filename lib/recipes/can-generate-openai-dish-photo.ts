import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isOpenAiDishPhotosEnabled,
  resolveDishPhotoAccess,
  type DishPhotoAccess
} from "@/lib/billing/premium-feature-access";
import type { Database } from "@/types/database.types";

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * True si el usuario puede generar foto OpenAI ahora.
 */
export async function canGenerateOpenAiDishPhoto(
  supabase: AppSupabaseClient,
  userId: string,
  email?: string | null
): Promise<boolean> {
  if (!isOpenAiDishPhotosEnabled()) {
    return false;
  }

  const access = await resolveDishPhotoAccess(supabase, userId, email);
  return access.allowed;
}

export async function getOpenAiDishPhotoAccess(
  supabase: AppSupabaseClient,
  userId: string,
  email?: string | null
): Promise<DishPhotoAccess> {
  return resolveDishPhotoAccess(supabase, userId, email);
}

export { isOpenAiDishPhotosEnabled, REAL_PHOTO_USED_MESSAGE } from "@/lib/billing/premium-feature-access";
