import { listDishImageBankItems, matchDishImageFromBank } from "@/lib/admin/dish-image-bank-admin";
import { getBundledCatalogItems } from "@/lib/recipes/dish-image-bank-catalog";
import type { MatchDishImageInput, MatchDishImageResult } from "@/lib/recipes/dish-image-bank-types";
import { pickTopDishImageMatches } from "@/lib/recipes/match-dish-image";
import { isImageUrlReachable } from "@/lib/recipes/validate-image-url";

function isMissingDishBankTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: string; message?: string };
  return (
    record.code === "PGRST205" ||
    record.message?.includes("dish_image_bank") === true ||
    record.message?.includes("schema cache") === true
  );
}

async function pickReachableMatch(
  candidates: MatchDishImageResult[]
): Promise<MatchDishImageResult | null> {
  for (const candidate of candidates) {
    if (await isImageUrlReachable(candidate.imageUrl)) {
      return candidate;
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[recipe-image] URL rota, probando siguiente:", candidate.matchedTitle);
    }
  }
  return null;
}

export async function resolveDishImageMatch(
  input: MatchDishImageInput
): Promise<MatchDishImageResult | null> {
  let candidates: MatchDishImageResult[] = [];

  try {
    const items = await listDishImageBankItems();
    const activeItems = items.filter((item) => item.isActive);
    if (activeItems.length) {
      candidates = pickTopDishImageMatches(activeItems, input, 10);
    } else {
      const dbMatch = await matchDishImageFromBank(input);
      if (dbMatch) candidates = [dbMatch];
    }
  } catch (error) {
    if (!isMissingDishBankTableError(error)) {
      throw error;
    }
  }

  if (!candidates.length) {
    candidates = pickTopDishImageMatches(getBundledCatalogItems(), input, 10);
  }

  return pickReachableMatch(candidates);
}
