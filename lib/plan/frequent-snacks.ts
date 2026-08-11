import { SNACK_PRESETS, type SnackPreset } from "@/lib/plan/snack-presets";
import { parseMacrosFromJson } from "@/lib/recipes/recipe-macros";
import { resolveSavedRecipeMealFilter } from "@/lib/recipes/saved-recipes-filter";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Json } from "@/types/database.types";

export type SnackSuggestion = {
  id: string;
  emoji: string;
  title: string;
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  origin: "frequent" | "preset" | "sandra";
  /** Veces registrado (solo origin=frequent). */
  timesUsed?: number;
  imageUrl?: string | null;
};

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Clave estable para agrupar el mismo snack con grafías distintas. */
export function normalizeSnackTitle(title: string): string {
  return stripAccents(title)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("plan_snacks") === true
  );
}

type AggregateBucket = {
  key: string;
  title: string;
  emoji: string;
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  timesUsed: number;
  lastAt: string;
};

function presetToSuggestion(preset: SnackPreset): SnackSuggestion {
  return {
    id: `preset:${preset.id}`,
    emoji: preset.emoji,
    title: preset.title,
    kcal: preset.kcal,
    proteinGrams: preset.proteinGrams,
    carbsGrams: preset.carbsGrams,
    fatGrams: preset.fatGrams,
    origin: "preset"
  };
}

/**
 * Une snacks frecuentes del usuario con presets por defecto.
 * Prioriza historial; rellena huecos con presets sin duplicar por título.
 */
export function mergeSnackSuggestions(
  frequent: SnackSuggestion[],
  limit: number,
  presets: SnackPreset[] = SNACK_PRESETS
): SnackSuggestion[] {
  const result: SnackSuggestion[] = [];
  const usedKeys = new Set<string>();

  for (const item of frequent) {
    if (result.length >= limit) break;
    const key = normalizeSnackTitle(item.title);
    if (!key || usedKeys.has(key)) continue;
    usedKeys.add(key);
    result.push(item);
  }

  for (const preset of presets) {
    if (result.length >= limit) break;
    const key = normalizeSnackTitle(preset.title);
    if (!key || usedKeys.has(key)) continue;
    usedKeys.add(key);
    result.push(presetToSuggestion(preset));
  }

  return result;
}

/**
 * Ranking de snacks del usuario por frecuencia (más recientes como desempate).
 * Si no hay historial o falla la tabla, devuelve solo presets.
 */
export async function fetchSnackSuggestionsForUser(
  userId: string,
  options?: { limit?: number; historyLimit?: number }
): Promise<SnackSuggestion[]> {
  const limit = Math.max(1, options?.limit ?? 6);
  const historyLimit = Math.max(limit, options?.historyLimit ?? 200);
  const fallback = mergeSnackSuggestions([], limit);

  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch {
    return fallback;
  }

  const { data, error } = await supabase
    .from("plan_snacks")
    .select("title, emoji, kcal, proteinas_g, carbohidratos_g, grasas_g, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(historyLimit);

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn("[frequent-snacks] no se pudo cargar historial:", error.message);
    }
    return fallback;
  }

  const buckets = new Map<string, AggregateBucket>();

  for (const row of data ?? []) {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const key = normalizeSnackTitle(title);
    if (!key) continue;

    const createdAt =
      typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString();
    const existing = buckets.get(key);

    if (!existing) {
      // Historial ordenado desc: la primera aparición es la más reciente.
      buckets.set(key, {
        key,
        title,
        emoji: (typeof row.emoji === "string" && row.emoji.trim()) || "🍪",
        kcal: Math.max(0, Math.round(Number(row.kcal) || 0)),
        proteinGrams: Math.max(0, Math.round(Number(row.proteinas_g) || 0)),
        carbsGrams: Math.max(0, Math.round(Number(row.carbohidratos_g) || 0)),
        fatGrams: Math.max(0, Math.round(Number(row.grasas_g) || 0)),
        timesUsed: 1,
        lastAt: createdAt
      });
      continue;
    }

    existing.timesUsed += 1;
  }

  const frequent = Array.from(buckets.values())
    .sort((a, b) => {
      if (b.timesUsed !== a.timesUsed) return b.timesUsed - a.timesUsed;
      return b.lastAt.localeCompare(a.lastAt);
    })
    .map(
      (bucket): SnackSuggestion => ({
        id: `freq:${bucket.key}`,
        emoji: bucket.emoji,
        title: bucket.title,
        kcal: bucket.kcal,
        proteinGrams: bucket.proteinGrams,
        carbsGrams: bucket.carbsGrams,
        fatGrams: bucket.fatGrams,
        origin: "frequent",
        timesUsed: bucket.timesUsed
      })
    );

  return mergeSnackSuggestions(frequent, limit);
}

type SandraSnackRow = {
  id: string;
  title: string;
  image_url?: string | null;
  meal_type?: string | null;
  tags?: unknown;
  macros?: Json | null;
  is_system_recipe?: boolean | null;
  is_sandra_recipe?: boolean | null;
};

function isSandraOrSystemSnack(row: SandraSnackRow): boolean {
  const isBank = Boolean(row.is_sandra_recipe) || Boolean(row.is_system_recipe);
  if (!isBank) return false;
  const meal = resolveSavedRecipeMealFilter({
    title: row.title,
    meal_type: row.meal_type,
    tags: row.tags
  });
  return meal === "Snacks" || meal === "Postres";
}

function mapSandraSnackRow(row: SandraSnackRow): SnackSuggestion {
  const macros = parseMacrosFromJson(row.macros ?? null);
  return {
    id: `sandra:${row.id}`,
    emoji: "✨",
    title: row.title.trim() || "Snack",
    kcal: Math.max(0, Math.round(macros?.calorias ?? 0)),
    proteinGrams: Math.max(0, Math.round(macros?.proteinas_g ?? 0)),
    carbsGrams: Math.max(0, Math.round(macros?.carbohidratos_g ?? 0)),
    fatGrams: Math.max(0, Math.round(macros?.grasas_g ?? 0)),
    origin: "sandra",
    imageUrl: row.image_url ?? null
  };
}

/**
 * Snacks (y postres) del banco Sandra / sistema para el modal de registro.
 */
export async function fetchSandraSnackSuggestions(options?: {
  limit?: number;
}): Promise<SnackSuggestion[]> {
  const limit = Math.max(1, options?.limit ?? 24);

  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch {
    return [];
  }

  const selectWithSandra =
    "id, title, image_url, meal_type, tags, macros, is_system_recipe, is_sandra_recipe";
  const selectSystemOnly =
    "id, title, image_url, meal_type, tags, macros, is_system_recipe";

  const load = async (select: string, sandraAware: boolean) => {
    let query = supabase
      .from("recipes")
      .select(select)
      .order("created_at", { ascending: true })
      .limit(120);

    if (sandraAware) {
      query = query.or("is_sandra_recipe.eq.true,is_system_recipe.eq.true");
    } else {
      query = query.eq("is_system_recipe", true);
    }

    return query;
  };

  try {
    const { data, error } = await load(selectWithSandra, true);
    if (error) throw error;
    return ((data ?? []) as unknown as SandraSnackRow[])
      .filter(isSandraOrSystemSnack)
      .map(mapSandraSnackRow)
      .slice(0, limit);
  } catch {
    try {
      const { data, error } = await load(selectSystemOnly, false);
      if (error) throw error;
      return ((data ?? []) as unknown as SandraSnackRow[])
        .filter((row) =>
          isSandraOrSystemSnack({ ...row, is_sandra_recipe: row.is_system_recipe })
        )
        .map(mapSandraSnackRow)
        .slice(0, limit);
    } catch (err) {
      console.warn("[sandra-snacks] no se pudo cargar el banco:", err);
      return [];
    }
  }
}
