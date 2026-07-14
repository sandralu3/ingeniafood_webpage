/**
 * Sinónimos ES/EN para enriquecer keywords del banco de imágenes.
 * Mantener alineado con lib/recipes/dish-match-synonyms.ts
 */

export const DISH_TOKEN_SYNONYMS = [
  ["pasta", "tagliatelle", "spaghetti", "fideos", "macarrones", "penne", "rigatoni", "lasagna", "lasana", "fettuccine", "noodle", "noodles"],
  ["tomate", "tomates", "tomato", "tomatoes", "pomodoro"],
  ["albahaca", "basil"],
  ["ajo", "garlic"],
  ["pollo", "chicken", "pechuga"],
  ["salmon", "salmon", "fish", "pescado"],
  ["arroz", "rice", "risotto", "paella"],
  ["curry", "masla", "tikka"],
  ["sopa", "soup", "caldo", "gazpacho", "broth"],
  ["ensalada", "salad", "bowl"],
  ["pizza"],
  ["sushi", "temaki", "maki", "nigiri", "japones", "japanese", "sashimi"],
  ["huevo", "huevos", "egg", "eggs", "tortilla", "revuelto", "scrambled"],
  ["chocolate", "brownie", "postre", "dessert", "tarta", "cake", "cheesecake", "helado", "ice", "cream"],
  ["carne", "beef", "steak", "ternera", "cerdo", "pork"],
  ["queso", "cheese", "mozzarella", "parmesan"],
  ["breakfast", "desayuno", "brunch", "matinal"],
  ["english", "ingles", "british", "britanico"],
  ["pancake", "pancakes", "crepe", "crepes", "tortita", "tortitas", "hotcake", "flija"],
  ["layered", "capas", "capa"],
  ["sausage", "salchicha", "salchichas", "bacon", "tocino"],
  ["mushroom", "mushrooms", "champinon", "champiñon", "setas", "seta"],
  ["toast", "tostada", "tostadas", "bread", "pan"],
  ["pastry", "pastries", "bolleria", "pastelito"],
  ["fruit", "fruta", "frutas", "berries", "fresas"],
  ["yogurt", "yogur", "yoghurt"],
  ["oat", "oats", "avena"],
  ["grilled", "plancha", "asado", "asada"],
  ["fried", "frito", "frita", "fritura"],
  ["stew", "guiso", "estofado", "ragout"],
  ["shrimp", "gamba", "gambas", "prawn", "prawns", "langostino"],
  ["lamb", "cordero"],
  ["duck", "pato"],
  ["turkey", "pavo"],
  ["vegetable", "vegetables", "verduras", "verdura"],
  ["bean", "beans", "frijoles", "judias", "garbanzo", "garbanzos", "chickpea"],
  ["potato", "potatoes", "patata", "patatas"],
  ["onion", "onions", "cebolla", "cebollas"],
  ["lemon", "limon", "lime"],
  ["honey", "miel"],
  ["cream", "crema", "nata"],
  ["sugar", "azucar"],
  ["vanilla", "vainilla"],
  ["cinnamon", "canela"],
  ["noodle", "noodles", "fideo", "fideos"],
  ["ramen", "udon"],
  ["taco", "tacos"],
  ["burger", "hamburguesa"],
  ["sandwich", "bocadillo"],
  ["pie", "pastel", "tarta"],
  ["pudding", "natillas", "flan"],
  ["smoothie", "batido"],
  ["coffee", "cafe"],
  ["tea", "te"],
  ["wine", "vino"],
  ["seafood", "marisco", "mariscos"],
  ["tuna", "atun"],
  ["cod", "bacalao"],
  ["squid", "calamari", "calamar"],
  ["octopus", "pulpo"],
  ["crab", "cangrejo"],
  ["lobster", "langosta"],
  ["vegetarian", "vegano", "vegan", "veggie"],
  ["spicy", "picante", "chili", "chilli"],
  ["sweet", "dulce"],
  ["salty", "salado"],
  ["roast", "rostizado", "asado"],
  ["baked", "horno", "horneado"],
  ["soup", "sopa"],
  ["salmon", "salmon"],
  ["full", "completo", "completa"]
];

/** Palabras frecuentes en títulos TheMealDB → alias en español */
export const EN_TITLE_HINTS = {
  breakfast: ["desayuno"],
  brunch: ["desayuno"],
  english: ["ingles", "desayuno"],
  full: ["completo"],
  pancake: ["tortita", "tortitas"],
  pancakes: ["tortitas"],
  crepe: ["crepe", "tortita"],
  crepes: ["tortitas"],
  layered: ["capas"],
  pastry: ["bolleria", "pastelito"],
  pastries: ["bolleria"],
  dessert: ["postre"],
  cake: ["tarta", "pastel"],
  pie: ["tarta"],
  pudding: ["natillas", "postre"],
  soup: ["sopa"],
  salad: ["ensalada"],
  stew: ["guiso", "estofado"],
  curry: ["curry"],
  pasta: ["pasta", "fideos"],
  chicken: ["pollo"],
  beef: ["carne", "ternera"],
  pork: ["cerdo"],
  lamb: ["cordero"],
  fish: ["pescado"],
  salmon: ["salmon"],
  tuna: ["atun"],
  shrimp: ["gamba", "gambas"],
  rice: ["arroz"],
  egg: ["huevo"],
  eggs: ["huevos"],
  cheese: ["queso"],
  chocolate: ["chocolate"],
  fruit: ["fruta"],
  cream: ["crema"],
  honey: ["miel"],
  bread: ["pan"],
  toast: ["tostada"],
  mushroom: ["setas", "champiñon"],
  vegetable: ["verduras"],
  vegetables: ["verduras"],
  vegan: ["vegano"],
  vegetarian: ["vegetariano"],
  grilled: ["plancha"],
  fried: ["frito"],
  baked: ["horno"],
  roast: ["asado"],
  spicy: ["picante"],
  sweet: ["dulce"],
  italian: ["italiana"],
  indian: ["india", "indio"],
  japanese: ["japones"],
  chinese: ["chino"],
  thai: ["tailandes"],
  mexican: ["mexicano"],
  french: ["frances"],
  spanish: ["espanol"],
  greek: ["griego"],
  american: ["americano"],
  british: ["britanico", "ingles"]
};

const MEAL_TYPE_KEYWORDS = {
  desayuno: ["desayuno", "brunch", "matinal"],
  postre: ["postre", "dessert", "dulce"],
  almuerzo: ["almuerzo", "comida"],
  cena: ["cena", "cena"]
};

const CUISINE_KEYWORDS = {
  italiana: ["italiana", "italiano"],
  asiatica: ["asiatica", "asiatico"],
  india: ["india", "indio"],
  fusion: ["fusion"],
  estandar: ["mediterranea", "mediterraneo"]
};

export function normalizeToken(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function tokenizeText(text) {
  if (!text) return [];
  return Array.from(
    new Set(
      normalizeToken(text)
        .split(/[^a-z0-9]+/i)
        .map((part) => part.trim())
        .filter((part) => part.length >= 3)
    )
  );
}

function expandWithSynonymGroups(tokens) {
  const expanded = new Set(tokens);

  for (const token of tokens) {
    for (const group of DISH_TOKEN_SYNONYMS) {
      const normalizedGroup = group.map(normalizeToken);
      if (!normalizedGroup.includes(token)) continue;
      for (const synonym of normalizedGroup) {
        expanded.add(synonym);
      }
    }
  }

  return expanded;
}

function addTitleHints(tokens) {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const hints = EN_TITLE_HINTS[token];
    if (!hints) continue;
    for (const hint of hints) {
      expanded.add(normalizeToken(hint));
    }
  }
  return expanded;
}

/**
 * Enriquece keywords con alias en español a partir del título y keywords existentes.
 */
export function enrichDishKeywords(entry) {
  const titleTokens = tokenizeText(entry.title);
  const keywordTokens = (entry.keywords ?? []).flatMap((keyword) => tokenizeText(keyword));
  const baseTokens = Array.from(new Set([...titleTokens, ...keywordTokens]));

  let expanded = expandWithSynonymGroups(baseTokens);
  expanded = addTitleHints(expanded);

  for (const mealType of entry.mealTypes ?? []) {
    for (const hint of MEAL_TYPE_KEYWORDS[mealType] ?? []) {
      expanded.add(normalizeToken(hint));
    }
  }

  for (const cuisine of entry.cuisineStyles ?? []) {
    for (const hint of CUISINE_KEYWORDS[cuisine] ?? []) {
      expanded.add(normalizeToken(hint));
    }
  }

  const keywords = Array.from(expanded)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"))
    .slice(0, 24);

  return keywords;
}

export function enrichCatalogEntry(entry) {
  const keywords = enrichDishKeywords(entry);
  const previous = (entry.keywords ?? []).map(normalizeToken).sort().join("|");
  const next = keywords.map(normalizeToken).sort().join("|");

  return {
    entry: { ...entry, keywords },
    changed: previous !== next
  };
}
