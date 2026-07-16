import type { DailyChallenge } from "@/lib/gamification/challenges";

const SYSTEM_LABEL_IDS = new Set(["1", "2", "4", "5", "7", "8", "9", "10"]);
const SYSTEM_IMPORTANCE_IDS = new Set(["1", "2", "4", "5", "7", "8", "9", "10"]);

type RetosTranslate = {
  (key: string, values?: Record<string, string | number>): string;
  has: (key: string) => boolean;
};

/** Translate system challenge titles at the UI layer; custom labels stay as stored. */
export function translateChallengeLabel(
  challenge: Pick<DailyChallenge, "id" | "label" | "source">,
  t: RetosTranslate
): string {
  if (challenge.source === "system" && SYSTEM_LABEL_IDS.has(challenge.id)) {
    const key = `systemLabels.${challenge.id}`;
    if (t.has(key)) return t(key);
  }
  return challenge.label;
}

export function translateChallengeImportance(
  challenge: Pick<DailyChallenge, "id" | "points" | "source">,
  t: RetosTranslate
): string {
  if (challenge.source === "custom") {
    return t("importance.custom");
  }
  if (SYSTEM_IMPORTANCE_IDS.has(challenge.id)) {
    const key = `importance.${challenge.id}`;
    if (t.has(key)) return t(key);
  }
  return t("importance.fallback", { points: challenge.points });
}
