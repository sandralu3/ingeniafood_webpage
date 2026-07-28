import { after } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { resolveDishPhotoAccess } from "@/lib/billing/premium-feature-access";
import {
  generatePremiumDishPhoto,
  type GenerateRecipeImageInput
} from "@/lib/recipes/generate-recipe-image";

export type SchedulePremiumDishPhotoInput = GenerateRecipeImageInput & {
  recipeId: string;
  userEmail?: string | null;
};

/**
 * Programa foto OpenAI en background (solo Premium / Stripe).
 */
export function schedulePremiumDishPhoto(input: SchedulePremiumDishPhotoInput): void {
  const { recipeId, userEmail, ...dishInput } = input;

  after(async () => {
    try {
      const admin = getSupabaseAdminClient();
      const access = await resolveDishPhotoAccess(admin, dishInput.userId, userEmail);

      if (!access.allowed) {
        console.info("[dish-photo:after] OpenAI no llamado", {
          recipeId,
          userId: dishInput.userId,
          reason: access.reason
        });
        return;
      }

      const result = await generatePremiumDishPhoto(dishInput, {
        authorizedPaidPremium: true
      });

      if (result.provider !== "openai" || !result.imageUrl) {
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
        console.error("[dish-photo:after] No se pudo actualizar image_url:", error.message);
      }
    } catch (error) {
      console.error("[dish-photo:after] Fallo en segundo plano:", error);
    }
  });
}
