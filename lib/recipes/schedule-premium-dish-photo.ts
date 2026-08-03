import { after } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { DishPhotoAccess } from "@/lib/billing/premium-feature-access";
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

export type SchedulePremiumDishPhotoBatchItem = GenerateRecipeImageInput & {
  recipeId: string;
};

/**
 * Programa foto OpenAI en background para una receta (Premium + cuota lifetime si aplica).
 */
export function schedulePremiumDishPhoto(input: SchedulePremiumDishPhotoInput): void {
  schedulePremiumDishPhotoBatch({
    userId: input.userId,
    userEmail: input.userEmail,
    items: [
      {
        recipeId: input.recipeId,
        userId: input.userId,
        title: input.title,
        ingredients: input.ingredients,
        tags: input.tags,
        mealType: input.mealType,
        cuisineStyle: input.cuisineStyle,
        tipSandra: input.tipSandra
      }
    ]
  });
}

type ScheduleBatchInput = {
  userId: string;
  userEmail?: string | null;
  /** Acceso ya resuelto en el request (evita re-chequeos / carreras en after). */
  access?: DishPhotoAccess;
  items: SchedulePremiumDishPhotoBatchItem[];
};

/**
 * Genera foto OpenAI para varias opciones de receta (p. ej. las 3 del escáner).
 * En modo "once", consume un único intento lifetime para todo el lote.
 */
export function schedulePremiumDishPhotoBatch(input: ScheduleBatchInput): void {
  const { userId, userEmail, items, access: accessFromRequest } = input;
  if (!items.length) return;

  after(async () => {
    let markedOnce = false;
    try {
      const admin = getSupabaseAdminClient();
      const access =
        accessFromRequest ?? (await resolveDishPhotoAccess(admin, userId, userEmail));

      console.info("[dish-photo:after] Inicio lote OpenAI", {
        userId,
        count: items.length,
        allowed: access.allowed,
        mode: access.allowed ? access.mode : undefined,
        reason: access.allowed ? undefined : access.reason
      });

      if (!access.allowed) {
        console.info("[dish-photo:after] OpenAI no llamado (lote)", {
          userId,
          count: items.length,
          reason: access.reason,
          hint: access.reason === "PHOTO_USED" ? REAL_PHOTO_USED_MESSAGE : undefined
        });
        return;
      }

      if (access.mode === "once") {
        markedOnce = await tryMarkRealPhotoGenerated(userId);
        if (!markedOnce) {
          console.info("[dish-photo:after] Foto lifetime ya usada (lote)", {
            userId,
            count: items.length
          });
          return;
        }
      }

      let anyOpenAiSuccess = false;

      // En paralelo: las 3 fotos terminan antes y el polling del cliente las ve a tiempo.
      const results = await Promise.allSettled(
        items.map(async (item) => {
          const result = await generatePremiumDishPhoto(
            {
              userId: item.userId,
              title: item.title,
              ingredients: item.ingredients,
              tags: item.tags,
              mealType: item.mealType,
              cuisineStyle: item.cuisineStyle,
              tipSandra: item.tipSandra
            },
            { authorizedPaidPremium: true }
          );

          if (result.provider !== "openai" || !result.imageUrl) {
            console.warn("[dish-photo:after] Sin imagen OpenAI", {
              recipeId: item.recipeId,
              title: item.title.slice(0, 80),
              provider: result.provider,
              error: result.error
            });
            return false;
          }

          const { error } = await admin
            .from("recipes")
            .update({ image_url: result.imageUrl })
            .eq("id", item.recipeId)
            .eq("user_id", userId);

          if (error) {
            console.error("[dish-photo:after] No se pudo actualizar image_url:", {
              recipeId: item.recipeId,
              message: error.message
            });
            return false;
          }

          console.info("[dish-photo:after] Foto OpenAI guardada", {
            recipeId: item.recipeId,
            title: item.title.slice(0, 80),
            imageUrl: result.imageUrl.slice(0, 120)
          });
          return true;
        })
      );

      anyOpenAiSuccess = results.some(
        (entry) => entry.status === "fulfilled" && entry.value === true
      );

      for (const entry of results) {
        if (entry.status === "rejected") {
          console.error("[dish-photo:after] Excepción en item del lote:", entry.reason);
        }
      }

      if (markedOnce && !anyOpenAiSuccess) {
        await refundRealPhotoMark(userId);
      }

      console.info("[dish-photo:after] Lote terminado", {
        userId,
        successCount: results.filter(
          (entry) => entry.status === "fulfilled" && entry.value === true
        ).length,
        total: items.length
      });
    } catch (error) {
      if (markedOnce) {
        await refundRealPhotoMark(userId);
      }
      console.error("[dish-photo:after] Fallo en segundo plano (lote):", error);
    }
  });
}
