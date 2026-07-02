export type DailyChallenge = {
  id: string;
  label: string;
  points: number;
};

export const DEFAULT_DAILY_CHALLENGES: DailyChallenge[] = [
  { id: "water", label: "Beber 2 L de agua", points: 10 },
  { id: "veggies", label: "Añadir vegetales a una comida", points: 15 },
  { id: "walk", label: "Caminar 20 minutos", points: 15 },
  { id: "scan", label: "Escanear tu despensa", points: 20 }
];

export const WEEKLY_HEALTH_SCORE_MAX = 100;

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
