import type { RecipeMealType } from "@/lib/recipes/premium-recipe-filters";
import { parseRecipeMealType } from "@/lib/recipes/premium-recipe-filters";

const STORAGE_KEY = "ingeniafood_scanner_generation_seed";

export type ScannerGenerationSeed = {
  idea: string;
  ingredients: string[];
  recipeMealType: RecipeMealType;
  autoGenerate: boolean;
  source?: "intelligent-dose" | string;
};

export function saveScannerGenerationSeed(seed: ScannerGenerationSeed): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      idea: seed.idea.trim(),
      ingredients: seed.ingredients.map((item) => item.trim()).filter(Boolean).slice(0, 8),
      recipeMealType: seed.recipeMealType,
      autoGenerate: Boolean(seed.autoGenerate),
      source: seed.source ?? "intelligent-dose"
    })
  );
}

/** Lee y elimina el seed (consumo único, como el modo inicial del escáner). */
export function consumeScannerGenerationSeed(): ScannerGenerationSeed | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ScannerGenerationSeed>;
    const idea = typeof parsed.idea === "string" ? parsed.idea.trim() : "";
    const ingredients = Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 8)
      : [];
    const recipeMealType = parseRecipeMealType(parsed.recipeMealType) ?? "almuerzo";

    if (!idea && ingredients.length === 0) return null;

    return {
      idea: idea || ingredients.join(" con "),
      ingredients:
        ingredients.length > 0 ? ingredients : idea.split(/\s+y\s+|\s+con\s+/i).slice(0, 4),
      recipeMealType,
      autoGenerate: parsed.autoGenerate !== false,
      source: typeof parsed.source === "string" ? parsed.source : "intelligent-dose"
    };
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
