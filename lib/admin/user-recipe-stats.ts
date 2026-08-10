import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { isExternalMeal, resolveExternalMealBadge } from "@/lib/plan/external-meal";
import { isScannerDraftRecipe } from "@/lib/recipes/scanner-draft";
import { listAdminUsers, type AdminUserListItem } from "@/lib/admin/users-admin";

export type AdminUserRecipeStats = {
  userId: string;
  fullName: string | null;
  email: string;
  isTester: boolean;
  isPremium: boolean;
  hasUsed24hPass: boolean;
  pass24hStatus: AdminUserListItem["pass24hStatus"];
  redeemedCode: string | null;
  /** Recetas propias (para cocinar), sin Fuera ni borradores. */
  ownRecipes: number;
  /** Subconjunto de propias detectadas como generadas desde Escáner (despensa). */
  pantryScannerRecipes: number;
  /** Propias que no parecen del escáner de despensa. */
  otherOwnRecipes: number;
  /** Plato servido escaneado (tag escaneado). */
  plateScannerRecipes: number;
  /** Comida fuera por texto (sin foto). */
  outsideTextRecipes: number;
  /** Borradores del escáner aún no confirmados. */
  scannerDrafts: number;
  /** Total visible en libro (propias + fuera), sin borradores ni Sandra. */
  totalLibraryRecipes: number;
  /** Evidencia de uso del Escáner (despensa, plato, borrador o cuota de hoy). */
  hasUsedScanner: boolean;
  scansUsedToday: number;
};

export type AdminUserRecipeStatsSummary = {
  usersWithRecipes: number;
  usersWhoUsedScanner: number;
  usersWhoUsed24hPass: number;
  totalOwn: number;
  totalPantryScanner: number;
  totalPlateScanner: number;
  totalOutsideText: number;
};

export type AdminUserRecipeStatsResponse = {
  users: AdminUserRecipeStats[];
  summary: AdminUserRecipeStatsSummary;
};

type RecipeStatRow = {
  id: string;
  user_id: string;
  description: string | null;
  tags: unknown;
  is_sandra_recipe: boolean | null;
  cuisine_style: string | null;
  complexity: string | null;
  meal_type_advisory: string | null;
};

function isPantryScannerRecipe(row: RecipeStatRow): boolean {
  if (isExternalMeal(row.tags)) return false;
  if (isScannerDraftRecipe(row)) return false;
  // El flujo de generate-recipe suele persistir filtros de escáner.
  return (
    Boolean(row.cuisine_style?.trim()) ||
    Boolean(row.complexity?.trim()) ||
    Boolean(row.meal_type_advisory?.trim())
  );
}

async function fetchOwnedRecipeRows(
  admin: ReturnType<typeof getSupabaseAdminClient>
): Promise<RecipeStatRow[]> {
  const pageSize = 1000;
  const rows: RecipeStatRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("recipes")
      .select(
        "id,user_id,description,tags,is_sandra_recipe,cuisine_style,complexity,meal_type_advisory"
      )
      .or("is_sandra_recipe.is.null,is_sandra_recipe.eq.false")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`No pudimos cargar recetas: ${error.message}`);
    }

    const batch = (data ?? []) as RecipeStatRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

function emptyCounters() {
  return {
    ownRecipes: 0,
    pantryScannerRecipes: 0,
    otherOwnRecipes: 0,
    plateScannerRecipes: 0,
    outsideTextRecipes: 0,
    scannerDrafts: 0
  };
}

export async function listAdminUserRecipeStats(): Promise<AdminUserRecipeStatsResponse> {
  const admin = getSupabaseAdminClient();
  const [users, recipes] = await Promise.all([listAdminUsers(), fetchOwnedRecipeRows(admin)]);

  const counters = new Map<string, ReturnType<typeof emptyCounters>>();

  for (const row of recipes) {
    const userId = row.user_id;
    if (!userId) continue;
    if (row.is_sandra_recipe) continue;

    const bucket = counters.get(userId) ?? emptyCounters();

    if (isScannerDraftRecipe(row)) {
      bucket.scannerDrafts += 1;
      counters.set(userId, bucket);
      continue;
    }

    const badge = resolveExternalMealBadge(row.tags);
    if (badge === "escaneado") {
      bucket.plateScannerRecipes += 1;
    } else if (badge === "comida_fuera") {
      bucket.outsideTextRecipes += 1;
    } else if (isPantryScannerRecipe(row)) {
      bucket.ownRecipes += 1;
      bucket.pantryScannerRecipes += 1;
    } else {
      bucket.ownRecipes += 1;
      bucket.otherOwnRecipes += 1;
    }

    counters.set(userId, bucket);
  }

  const stats: AdminUserRecipeStats[] = users.map((user: AdminUserListItem) => {
    const bucket = counters.get(user.id) ?? emptyCounters();
    const hasUsedScanner =
      bucket.pantryScannerRecipes > 0 ||
      bucket.plateScannerRecipes > 0 ||
      bucket.scannerDrafts > 0 ||
      user.scansUsedToday > 0;

    return {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      isTester: user.isTester,
      isPremium: user.isPremium,
      hasUsed24hPass: user.hasUsed24hPass,
      pass24hStatus: user.pass24hStatus,
      redeemedCode: user.redeemedCode,
      ownRecipes: bucket.ownRecipes,
      pantryScannerRecipes: bucket.pantryScannerRecipes,
      otherOwnRecipes: bucket.otherOwnRecipes,
      plateScannerRecipes: bucket.plateScannerRecipes,
      outsideTextRecipes: bucket.outsideTextRecipes,
      scannerDrafts: bucket.scannerDrafts,
      totalLibraryRecipes:
        bucket.ownRecipes + bucket.plateScannerRecipes + bucket.outsideTextRecipes,
      hasUsedScanner,
      scansUsedToday: user.scansUsedToday
    };
  });

  stats.sort((a, b) => {
    if (b.totalLibraryRecipes !== a.totalLibraryRecipes) {
      return b.totalLibraryRecipes - a.totalLibraryRecipes;
    }
    if (Number(b.hasUsedScanner) !== Number(a.hasUsedScanner)) {
      return Number(b.hasUsedScanner) - Number(a.hasUsedScanner);
    }
    return a.email.localeCompare(b.email, "es");
  });

  const summary: AdminUserRecipeStatsSummary = {
    usersWithRecipes: stats.filter((row) => row.totalLibraryRecipes > 0).length,
    usersWhoUsedScanner: stats.filter((row) => row.hasUsedScanner).length,
    usersWhoUsed24hPass: stats.filter((row) => row.hasUsed24hPass).length,
    totalOwn: stats.reduce((sum, row) => sum + row.ownRecipes, 0),
    totalPantryScanner: stats.reduce((sum, row) => sum + row.pantryScannerRecipes, 0),
    totalPlateScanner: stats.reduce((sum, row) => sum + row.plateScannerRecipes, 0),
    totalOutsideText: stats.reduce((sum, row) => sum + row.outsideTextRecipes, 0)
  };

  return { users: stats, summary };
}
