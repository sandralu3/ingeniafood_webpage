import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type AppSupabaseClient = SupabaseClient<Database>;

/** Marcador en `recipes.description` para opciones auto-guardadas solo para foto OpenAI. */
export const SCANNER_DRAFT_DESCRIPTION = "__ingenia_scanner_draft__";

export function isScannerDraftRecipe(recipe: {
  description?: string | null;
}): boolean {
  return recipe.description === SCANNER_DRAFT_DESCRIPTION;
}

/** Quita el marcador de borrador (la receta pasa a ser “guardada” de verdad). */
export async function promoteScannerDraftRecipe(
  supabase: AppSupabaseClient,
  params: {
    userId: string;
    recipeId: string;
    imageUrl?: string | null;
    referenceImageUrl?: string | null;
  }
): Promise<{ ok: true } | { error: string }> {
  const patch: Database["public"]["Tables"]["recipes"]["Update"] = {
    description: null,
    updated_at: new Date().toISOString()
  };

  if (typeof params.imageUrl === "string" && params.imageUrl.trim()) {
    patch.image_url = params.imageUrl.trim();
  }
  if (typeof params.referenceImageUrl === "string" && params.referenceImageUrl.trim()) {
    patch.reference_image_url = params.referenceImageUrl.trim();
  }

  const { error } = await supabase
    .from("recipes")
    .update(patch)
    .eq("id", params.recipeId)
    .eq("user_id", params.userId)
    .eq("description", SCANNER_DRAFT_DESCRIPTION);

  if (error) {
    // Puede que ya no sea draft (reintento): intentar update solo de imagen.
    const { error: fallbackError } = await supabase
      .from("recipes")
      .update({
        ...(patch.image_url ? { image_url: patch.image_url } : {}),
        ...(patch.reference_image_url
          ? { reference_image_url: patch.reference_image_url }
          : {}),
        updated_at: patch.updated_at
      })
      .eq("id", params.recipeId)
      .eq("user_id", params.userId);

    if (fallbackError) {
      return { error: fallbackError.message };
    }
  }

  return { ok: true };
}

/** Elimina borradores del escáner (opciones no elegidas o sesión abandonada). */
export async function deleteScannerDraftRecipes(
  supabase: AppSupabaseClient,
  params: { userId: string; recipeIds: string[] }
): Promise<void> {
  const ids = [...new Set(params.recipeIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) return;

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("user_id", params.userId)
    .eq("description", SCANNER_DRAFT_DESCRIPTION)
    .in("id", ids);

  if (error) {
    console.warn("[scanner-draft] No se pudieron borrar borradores:", error.message);
  }
}
