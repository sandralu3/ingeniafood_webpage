import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type AppSupabase = SupabaseClient<Database>;

/**
 * Ingredientes activos en despensa del usuario (favoritos vigentes).
 * Los eliminados no aparecen porque ya no están en user_pantry_favorites.
 */
export async function getActivePantryIngredients(
  supabase: AppSupabase,
  userId: string
): Promise<{ ids: string[]; names: string[] }> {
  const { data: favRows, error: favError } = await supabase
    .from("user_pantry_favorites")
    .select("ingredient_id")
    .eq("user_id", userId);

  if (favError) {
    console.warn("[premium-stories] favorites:", favError.message);
    return { ids: [], names: [] };
  }

  const ids = Array.from(
    new Set((favRows ?? []).map((row) => row.ingredient_id).filter(Boolean))
  );
  if (ids.length === 0) return { ids: [], names: [] };

  const { data: masters, error: masterError } = await supabase
    .from("master_ingredients")
    .select("id, name")
    .in("id", ids);

  if (masterError) {
    console.warn("[premium-stories] masters:", masterError.message);
    return { ids, names: [] };
  }

  const nameById = new Map((masters ?? []).map((m) => [m.id, m.name] as const));
  const names = ids
    .map((id) => nameById.get(id)?.trim())
    .filter((name): name is string => Boolean(name));

  return { ids, names };
}
