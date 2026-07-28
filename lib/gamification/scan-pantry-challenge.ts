import { SCAN_PANTRY_CHALLENGE_ID } from "@/lib/gamification/challenges";
import {
  completeDailyChallenge,
  fetchTodayCompletedChallengeIds
} from "@/lib/gamification/challenge-service";
import { clearHoyCache } from "@/lib/gamification/hoy-cache";
import { prefetchHoyPageData } from "@/lib/gamification/prefetch-hoy-page-data";

function isDuplicateCompletionError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

/**
 * Tras un escaneo exitoso: registra completación oculta para la racha 🔥.
 * No aparece en hábitos.
 */
export async function completeScanPantryChallengeIfConfigured(
  userId: string
): Promise<boolean> {
  try {
    const completedIds = await fetchTodayCompletedChallengeIds(userId);

    if (completedIds.includes(SCAN_PANTRY_CHALLENGE_ID)) {
      return false;
    }

    await completeDailyChallenge({
      userId,
      retoId: SCAN_PANTRY_CHALLENGE_ID,
      points: 0
    });

    clearHoyCache(userId);
    void prefetchHoyPageData({ userId, force: true });
    return true;
  } catch (error) {
    if (isDuplicateCompletionError(error)) {
      clearHoyCache(userId);
      return true;
    }

    console.warn(
      "[scan-pantry-challenge] No se pudo registrar la racha de escaneo:",
      error
    );
    return false;
  }
}
