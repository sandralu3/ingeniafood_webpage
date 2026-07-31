import { after } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  REAL_PHOTO_USED_MESSAGE,
  resolveDishPhotoAccess
} from "@/lib/billing/premium-feature-access";
import {
  generatePremiumDishPhoto,
  type GenerateRecipeImageInput
} from "@/lib/recipes/generate-recipe-image";
import {
  refundRealPhotoMark,
  tryMarkRealPhotoGenerated
} from "@/lib/recipes/real-photo-quota";

export type SchedulePremiumDishPhotoInput = GenerateRecipeImageInput & {
  recipeId: string;
  userEmail?: string | null;
};

/**
 * Programa foto OpenAI en background (Premium + cuota lifetime si aplica).
 */
export function schedulePremiumDishPhoto(input: SchedulePremiumDishPhotoInput): void {
  const { recipeId, userEmail, ...dishInput } = input;

  after(async () => {
    let markedOnce = false;
    try {
      const admin = getSupabaseAdminClient();
      const access = await resolveDishPhotoAccess(admin, dishInput.userId, userEmail);

      if (!access.allowed) {
        console.info("[dish-photo:after] OpenAI no llamado", {
          recipeId,
          userId: dishInput.userId,
          reason: access.reason,
          hint: access.reason === "PHOTO_USED" ? REAL_PHOTO_USED_MESSAGE : undefined
        });
        return;
      }

      if (access.mode === "once") {
        markedOnce = await tryMarkRealPhotoGenerated(dishInput.userId);
        if (!markedOnce) {
          console.info("[dish-photo:after] Foto lifetime ya usada", {
            recipeId,
            userId: dishInput.userId
          });
          return;
        }
      }

      const result = await generatePremiumDishPhoto(dishInput, {
        authorizedPaidPremium: true
      });

      if (result.provider !== "openai" || !result.imageUrl) {
        if (markedOnce) {
          await refundRealPhotoMark(dishInput.userId);
        }
        console.warn("[dish-photo:after] Sin imagen OpenAI", {
          recipeId,
          provider: result.provider,
          error: result.error
        });
        return;
      }

      const { error } = await admin
        .from("recipes")
        .update({ image_url: result.imageUrl })
        .eq("id", recipeId)
        .eq("user_id", dishInput.userId);

      if (error) {
        if (markedOnce) {
          await refundRealPhotoMark(dishInput.userId);
        }
        console.error("[dish-photo:after] No se pudo actualizar image_url:", error.message);
      }
    } catch (error) {
      if (markedOnce) {
        await refundRealPhotoMark(dishInput.userId);
      }
      console.error("[dish-photo:after] Fallo en segundo plano:", error);
    }
  });
}
