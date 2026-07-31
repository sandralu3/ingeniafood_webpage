import { emojiForIngredientName } from "@/lib/scanner/detected-ingredient";

const USAGE_STORAGE_KEY = "ingeniafood.pantry.ingredient-usage.v1";

export type FrequentIngredientVisual = {
  key: string;
  label: string;
  match: string[];
  image: string;
  emoji: string;
};

/** Catálogo visual de ingredientes frecuentes (foto opcional + emoji garantizado). */
export const FREQUENT_INGREDIENT_VISUALS: FrequentIngredientVisual[] = [
  {
    key: "huevos",
    label: "Huevos",
    match: ["huevo", "eggs"],
    emoji: "🥚",
    image:
      "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=180&q=80"
  },
  {
    key: "pollo",
    label: "Pollo",
    match: ["pollo", "pechuga", "chicken"],
    emoji: "🍗",
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=180&q=80"
  },
  {
    key: "tomate",
    label: "Tomate",
    match: ["tomate", "tomato"],
    emoji: "🍅",
    image:
      "https://images.unsplash.com/photo-1592924357228-91a4daeec84c?auto=format&fit=crop&w=180&q=80"
  },
  {
    key: "queso",
    label: "Queso",
    match: ["queso", "cheese"],
    emoji: "🧀",
    image:
      "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=180&q=80"
  },
  {
    key: "arroz",
    label: "Arroz",
    match: ["arroz", "rice"],
    emoji: "🍚",
    image:
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=180&q=80"
  },
  {
    key: "cebolla",
    label: "Cebolla",
    match: ["cebolla", "onion"],
    emoji: "🧅",
    image:
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=180&q=80"
  },
  {
    key: "ajo",
    label: "Ajo",
    match: ["ajo", "garlic"],
    emoji: "🧄",
    image:
      "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=180&q=80"
  },
  {
    key: "aguacate",
    label: "Aguacate",
    match: ["aguacate", "palta", "avocado"],
    emoji: "🥑",
    image:
      "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=180&q=80"
  },
  {
    key: "zanahoria",
    label: "Zanahoria",
    match: ["zanahoria", "carrot"],
    emoji: "🥕",
    image:
      "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=180&q=80"
  },
  {
    key: "carne",
    label: "Carne",
    match: ["carne", "res", "ternera", "beef"],
    emoji: "🥩",
    image:
      "https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=180&q=80"
  }
];

const NON_FOOD_NAME =
  /air\s*fryer|airfryer|freidora|horno|microondas|batidora|licuadora|sarten|sartén|olla\b|robot\b/i;

function readUsageMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeUsageMap(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

/** Incrementa el uso de ingredientes (para ranking de frecuentes). */
export function recordIngredientUsage(names: string[]) {
  if (!names.length) return;
  const map = readUsageMap();
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!key || NON_FOOD_NAME.test(key)) continue;
    map[key] = (map[key] ?? 0) + 1;
  }
  writeUsageMap(map);
}

export function getIngredientUsageMap(): Record<string, number> {
  return readUsageMap();
}

export function visualForIngredientName(name: string): FrequentIngredientVisual | null {
  const n = name.toLowerCase();
  return (
    FREQUENT_INGREDIENT_VISUALS.find((item) => item.match.some((token) => n.includes(token))) ??
    null
  );
}

/** Solo URL curada; sin fallback de pasillo (evita fotos genéricas rotas). */
export function imageForIngredientName(name: string): string | null {
  return visualForIngredientName(name)?.image ?? null;
}

export type FrequentIngredientCard = {
  id: string;
  name: string;
  label: string;
  image: string | null;
  emoji: string;
};

type BuildFrequentArgs = {
  favorites: Array<{ ingredientId: string; name: string }>;
  masterIngredients: Array<{ id: string; name: string }>;
  usage: Record<string, number>;
  limit?: number;
};

/**
 * Top ingredientes reales del usuario: uso local → favoritos.
 * No rellena con defaults inventados del catálogo visual.
 */
export function buildFrequentIngredientCards({
  favorites,
  masterIngredients,
  usage,
  limit = 6
}: BuildFrequentArgs): FrequentIngredientCard[] {
  const cards: FrequentIngredientCard[] = [];
  const seen = new Set<string>();

  const resolveMaster = (query: string) => {
    const q = query.toLowerCase();
    return (
      masterIngredients.find((item) => item.name.toLowerCase() === q) ??
      masterIngredients.find((item) => item.name.toLowerCase().includes(q)) ??
      null
    );
  };

  const push = (name: string, id?: string, label?: string) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized || seen.has(normalized) || NON_FOOD_NAME.test(normalized)) return;
    seen.add(normalized);
    const visual = visualForIngredientName(name);
    cards.push({
      id: id ?? `name:${normalized}`,
      name,
      label: label ?? visual?.label ?? name,
      image: visual?.image ?? null,
      emoji: visual?.emoji ?? emojiForIngredientName(name)
    });
  };

  const usageSorted = Object.entries(usage).sort((a, b) => b[1] - a[1]);
  for (const [usageName] of usageSorted) {
    if (cards.length >= limit) break;
    const master = resolveMaster(usageName);
    push(master?.name ?? usageName, master?.id);
  }

  for (const fav of favorites) {
    if (cards.length >= limit) break;
    push(fav.name, fav.ingredientId);
  }

  return cards.slice(0, limit);
}
