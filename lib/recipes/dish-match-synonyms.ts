/** Grupos de sinónimos ES/EN para mejorar el matching de platos */
export const DISH_TOKEN_SYNONYMS: readonly (readonly string[])[] = [
  ["pasta", "tagliatelle", "spaghetti", "fideos", "macarrones", "penne", "rigatoni", "lasagna", "lasana", "fettuccine", "noodle", "noodles"],
  ["tomate", "tomates", "tomato", "tomatoes", "pomodoro"],
  ["albahaca", "basil"],
  ["ajo", "garlic"],
  ["pollo", "chicken", "pechuga"],
  ["salmon", "salmón", "fish", "pescado"],
  ["arroz", "rice", "risotto", "paella"],
  ["curry", "masala", "tikka"],
  ["sopa", "soup", "caldo", "gazpacho", "broth"],
  ["ensalada", "salad", "bowl"],
  ["pizza"],
  ["sushi", "temaki", "maki", "nigiri", "japones", "japanese", "sashimi"],
  ["huevo", "huevos", "egg", "eggs", "tortilla", "revuelto"],
  ["chocolate", "brownie", "postre", "dessert", "tarta", "cake", "cheesecake", "helado"],
  ["carne", "beef", "steak", "ternera", "cerdo", "pork"],
  ["queso", "cheese", "mozzarella", "parmesan"]
];

const TOKEN_TO_GROUP = new Map<string, number>();

for (let groupIndex = 0; groupIndex < DISH_TOKEN_SYNONYMS.length; groupIndex++) {
  for (const token of DISH_TOKEN_SYNONYMS[groupIndex]) {
    TOKEN_TO_GROUP.set(token, groupIndex);
  }
}

export function expandMatchTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens);

  for (const token of tokens) {
    const groupIndex = TOKEN_TO_GROUP.get(token);
    if (groupIndex === undefined) continue;
    for (const synonym of DISH_TOKEN_SYNONYMS[groupIndex]) {
      expanded.add(synonym);
    }
  }

  return Array.from(expanded);
}

export function countSynonymTokenMatches(left: string[], right: string[]): number {
  if (!left.length || !right.length) return 0;

  const rightExpanded = new Set(expandMatchTokens(right));
  let matches = 0;

  for (const token of expandMatchTokens(left)) {
    if (rightExpanded.has(token)) {
      matches++;
    }
  }

  return matches;
}

export function sharesDishCategory(left: string[], right: string[]): boolean {
  return countSynonymTokenMatches(left, right) > 0;
}
