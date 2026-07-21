import { after } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { canGenerateOpenAiDishPhoto } from "@/lib/recipes/can-generate-openai-dish-photo";
import {
  refundOpenAiPhotoCredit,
  tryConsumeOpenAiPhotoCredit
} from "@/lib/recipes/openai-photo-credits";
import {
  generatePremiumDishPhoto,
  type GenerateRecipeImageInput
} from "@/lib/recipes/generate-recipe-image";

export type SchedulePremiumDishPhotoInput = GenerateRecipeImageInput & {
  recipeId: string;
  userEmail?: string | null;
};

/**
 * Programa foto OpenAI: 1 crédito por tester. Consume antes de llamar; reembolsa si falla.
 */
export function schedulePremiumDishPhoto(input: SchedulePremiumDishPhotoInput): void {
  const { recipeId, userEmail, ...dishInput } = input;

  after(async () => {
    let creditConsumed = false;
    try {
      const admin = getSupabaseAdminClient();
      const allowed = await canGenerateOpenAiDishPhoto(
        admin,
        dishInput.userId,
        userEmail
      );
      if (!allowed) {
        console.info("[dish-photo:after] OpenAI no llamado", {
          recipeId,
          userId: dishInput.userId,
          reason: "sin permiso, sin créditos o kill-switch"
        });
        return;
      }

      creditConsumed = await tryConsumeOpenAiPhotoCredit(dishInput.userId);
      if (!creditConsumed) {
        console.info("[dish-photo:after] Sin créditos OpenAI", {
          recipeId,
          userId: dishInput.userId
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
        await refundOpenAiPhotoCredit(dishInput.userId);
        return;
      }

      const { error } = await admin
        .from("recipes")
        .update({ image_url: result.imageUrl })
        .eq("id", recipeId)
        .eq("user_id", dishInput.userId);

      if (error) {
        console.error("[dish-photo:after] No se pudo actualizar image_url:", error.message);
        await refundOpenAiPhotoCredit(dishInput.userId);
      }
    } catch (error) {
      console.error("[dish-photo:after] Fallo en segundo plano:", error);
      if (creditConsumed) {
        await refundOpenAiPhotoCredit(dishInput.userId);
      }
    }
  });
}
