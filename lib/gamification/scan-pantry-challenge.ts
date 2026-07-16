import {
  SCAN_PANTRY_CHALLENGE_ID,
  SYSTEM_DAILY_CHALLENGES
} from "@/lib/gamification/challenges";
import {
  completeDailyChallenge,
  fetchActiveRetoIds,
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
 * Completa el reto "Escanear tu despensa" si el usuario lo tiene activo
 * en Hoy y aún no lo completó hoy. No-op en cualquier otro caso.
 */
export async function completeScanPantryChallengeIfConfigured(
  userId: string
): Promise<boolean> {
  try {
    const [activeIds, completedIds] = await Promise.all([
      fetchActiveRetoIds(userId),
      fetchTodayCompletedChallengeIds(userId)
    ]);

    if (!activeIds.includes(SCAN_PANTRY_CHALLENGE_ID)) {
      return false;
    }

    if (completedIds.includes(SCAN_PANTRY_CHALLENGE_ID)) {
      return false;
    }

    const challenge = SYSTEM_DAILY_CHALLENGES.find(
      (item) => item.id === SCAN_PANTRY_CHALLENGE_ID
    );
    if (!challenge) {
      return false;
    }

    await completeDailyChallenge({
      userId,
      retoId: challenge.id,
      points: challenge.points
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
      "[scan-pantry-challenge] No se pudo completar el reto de escanear despensa:",
      error
    );
    return false;
  }
}
