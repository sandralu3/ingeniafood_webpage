import { getTodayDateString } from "@/lib/gamification/challenges";

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function pickDailyTipIndex(params: {
  userId?: string | null;
  tipsLength: number;
  date?: string;
}): number {
  if (params.tipsLength <= 0) return 0;

  const date = params.date ?? getTodayDateString();
  const seed = `${params.userId ?? "guest"}:${date}`;

  return hashString(seed) % params.tipsLength;
}
