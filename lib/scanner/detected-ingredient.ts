/**
 * Ingrediente detectado / confirmable en el flujo escaneo → selección → generación.
 */
export type DetectedIngredient = {
  id: string;
  name: string;
  emoji: string;
  isSelected: boolean;
  /** [ymin, xmin, ymax, xmax] normalizado 0–1000 (estilo Gemini). */
  boundingBox?: [number, number, number, number];
};

const EMOJI_BY_KEYWORD: Array<{ match: RegExp; emoji: string }> = [
  { match: /tomate|tomato/, emoji: "🍅" },
  { match: /huevo|egg/, emoji: "🥚" },
  { match: /lechuga|lettuce|rúcula|rucula|spinach|espinaca/, emoji: "🥬" },
  { match: /brócoli|brocoli|broccoli/, emoji: "🥦" },
  { match: /pollo|chicken/, emoji: "🍗" },
  { match: /carne|beef|res|ternera/, emoji: "🥩" },
  { match: /pescado|fish|salm[oó]n|at[uú]n/, emoji: "🐟" },
  { match: /queso|cheese/, emoji: "🧀" },
  { match: /leche|milk|yogur|yogurt/, emoji: "🥛" },
  { match: /pan|bread/, emoji: "🍞" },
  { match: /arroz|rice/, emoji: "🍚" },
  { match: /pasta|fideo|noodle/, emoji: "🍝" },
  { match: /aguacate|palta|avocado/, emoji: "🥑" },
  { match: /lim[oó]n|lemon|lima|lime/, emoji: "🍋" },
  { match: /cebolla|onion/, emoji: "🧅" },
  { match: /ajo|garlic/, emoji: "🧄" },
  { match: /pimiento|pepper|chile/, emoji: "🫑" },
  { match: /zanahoria|carrot/, emoji: "🥕" },
  { match: /manzana|apple/, emoji: "🍎" },
  { match: /pl[aá]tano|banana/, emoji: "🍌" },
  { match: /fresa|strawberry/, emoji: "🍓" },
  { match: /naranja|orange/, emoji: "🍊" },
  { match: /patata|papa|potato/, emoji: "🥔" },
  { match: /ma[ií]z|corn/, emoji: "🌽" },
  { match: /champi|seta|mushroom/, emoji: "🍄" },
  { match: /aceite|oil/, emoji: "🫒" },
  { match: /sal\b|salt/, emoji: "🧂" },
  { match: /sopa|soup|caldo/, emoji: "🍲" },
  { match: /prote[ií]na/, emoji: "🥩" }
];

export function emojiForIngredientName(name: string): string {
  const n = name.trim().toLowerCase();
  for (const entry of EMOJI_BY_KEYWORD) {
    if (entry.match.test(n)) return entry.emoji;
  }
  return "🥗";
}

export function createDetectedIngredient(
  name: string,
  options?: {
    id?: string;
    emoji?: string;
    isSelected?: boolean;
    boundingBox?: [number, number, number, number];
  }
): DetectedIngredient {
  const trimmed = name.trim();
  return {
    id: options?.id ?? `${trimmed.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    emoji: options?.emoji ?? emojiForIngredientName(trimmed),
    isSelected: options?.isSelected ?? true,
    boundingBox: options?.boundingBox
  };
}

export function selectedIngredientNames(ingredients: DetectedIngredient[]): string[] {
  return ingredients.filter((item) => item.isSelected).map((item) => item.name);
}
