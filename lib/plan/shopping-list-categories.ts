import { normalizeIngredientKey } from "@/lib/plan/ingredient-parser";
import type { ShoppingListItem } from "@/lib/plan/shopping-list";

export type ShoppingListCategoryId =
  | "verduras_frutas"
  | "proteinas"
  | "lacteos"
  | "frios"
  | "carbohidratos"
  | "grasas"
  | "despensa"
  | "especias"
  | "otros";

export type ShoppingListCategoryMeta = {
  id: ShoppingListCategoryId;
  label: string;
  emoji: string;
  order: number;
};

export const SHOPPING_LIST_CATEGORIES: ShoppingListCategoryMeta[] = [
  { id: "verduras_frutas", label: "Verduras y frutas", emoji: "🥬", order: 1 },
  { id: "proteinas", label: "Proteínas", emoji: "🥩", order: 2 },
  { id: "lacteos", label: "Lácteos", emoji: "🥛", order: 3 },
  { id: "frios", label: "Fríos y embutidos", emoji: "🧊", order: 4 },
  { id: "carbohidratos", label: "Carbohidratos", emoji: "🍚", order: 5 },
  { id: "grasas", label: "Grasas y aceites", emoji: "🫒", order: 6 },
  { id: "despensa", label: "Despensa", emoji: "🫙", order: 7 },
  { id: "especias", label: "Especias y condimentos", emoji: "🧂", order: 8 },
  { id: "otros", label: "Otros", emoji: "📦", order: 9 }
];

const CATEGORY_ORDER = new Map(
  SHOPPING_LIST_CATEGORIES.map((category) => [category.id, category.order])
);

const CATEGORY_KEYWORDS: Record<Exclude<ShoppingListCategoryId, "otros">, string[]> = {
  proteinas: [
    "pollo",
    "pavo",
    "ternera",
    "cerdo",
    "carne",
    "huevo",
    "huevos",
    "atun",
    "salmon",
    "sardina",
    "pescado",
    "merluza",
    "gambas",
    "langostino",
    "calamar",
    "pulpo",
    "tofu",
    "tempeh",
    "seitan",
    "lenteja",
    "lentejas",
    "garbanzo",
    "garbanzos",
    "judia",
    "judias",
    "alubia",
    "haba",
    "habas",
    "soja",
    "proteina",
    "proteina en polvo",
    "pechuga",
    "muslo",
    "filete",
    "solomillo",
    "bacon",
    "panceta",
    "chorizo",
    "jamon",
    "pavo",
    "cordero",
    "conejo",
    "anchoa",
    "caballa"
  ],
  lacteos: [
    "leche",
    "leche de almendras",
    "leche de avena",
    "leche de soja",
    "leche de coco",
    "yogur",
    "yogurt",
    "queso",
    "mozzarella",
    "parmesano",
    "cheddar",
    "manchego",
    "requeson",
    "ricotta",
    "nata",
    "crema",
    "mantequilla",
    "kefir",
    "cuajada"
  ],
  frios: [
    "jamon york",
    "jamon cocido",
    "fiambre",
    "salchicha",
    "salchichon",
    "mortadela",
    "embutido",
    "pechuga de pavo",
    "surimi"
  ],
  verduras_frutas: [
    "tomate",
    "cebolla",
    "ajo",
    "pimiento",
    "calabacin",
    "calabaza",
    "zanahoria",
    "lechuga",
    "espinaca",
    "espinacas",
    "brocoli",
    "coliflor",
    "pepino",
    "berenjena",
    "apio",
    "puerro",
    "patata",
    "patatas",
    "boniato",
    "batata",
    "champinon",
    "seta",
    "setas",
    "champinones",
    "aguacate",
    "limon",
    "lima",
    "naranja",
    "manzana",
    "pera",
    "platano",
    "banana",
    "fresa",
    "fresas",
    "arandano",
    "arandanos",
    "uva",
    "melon",
    "sandia",
    "kiwi",
    "mango",
    "piña",
    "albahaca",
    "perejil",
    "cilantro",
    "menta",
    "romero",
    "tomillo",
    "canonigos",
    "rucula",
    "endivia",
    "col",
    "repollo",
    "acelga",
    "judia verde",
    "guisante",
    "guisantes",
    "maiz",
    "remolacha",
    "nabo",
    "rabano"
  ],
  carbohidratos: [
    "arroz",
    "pasta",
    "pan",
    "avena",
    "quinoa",
    "cuscus",
    "bulgur",
    "mijo",
    "trigo",
    "harina",
    "pan rallado",
    "tortilla",
    "wrap",
    "fideos",
    "macarrones",
    "espagueti",
    "lasaña",
    "gnocchi",
    "patata",
    "patatas",
    "boniato",
    "batata",
    "maiz",
    "polenta",
    "tapioca"
  ],
  grasas: [
    "aceite",
    "oliva",
    "aguacate",
    "nuez",
    "nueces",
    "almendra",
    "almendras",
    "avellana",
    "avellanas",
    "cacahuete",
    "cacahuetes",
    "mani",
    "pistacho",
    "pistachos",
    "semilla",
    "semillas",
    "chia",
    "linaza",
    "girasol",
    "sesamo",
    "tahini",
    "mantequilla de mani",
    "mantequilla de cacahuete",
    "aceituna",
    "aceitunas"
  ],
  despensa: [
    "sal",
    "azucar",
    "miel",
    "sirope",
    "maple",
    "vinagre",
    "salsa de soja",
    "soja",
    "tomate frito",
    "passata",
    "conserva",
    "lata",
    "caldo",
    "caldito",
    "pure de tomate",
    "mostaza",
    "ketchup",
    "mayonesa",
    "levadura",
    "polvo de hornear",
    "bicarbonato",
    "cacao",
    "chocolate",
    "cafe",
    "te",
    "agua",
    "harina",
    "pan rallado",
    "fideos",
    "legumbre",
    "lenteja",
    "garbanzo",
    "alubia",
    "cafe",
    "avena en hojuelas",
    "copos de avena",
    "frutos secos",
    "pasas",
    "dátiles",
    "datiles",
    "oregano",
    "comino",
    "curry",
    "pimenton",
    "canela",
    "vainilla",
    "esencia"
  ],
  especias: [
    "sal",
    "pimienta",
    "oregano",
    "comino",
    "curry",
    "pimenton",
    "canela",
    "vainilla",
    "esencia",
    "curcuma",
    "jengibre",
    "nuez moscada",
    "clavo",
    "laurel",
    "romero",
    "tomillo",
    "albahaca",
    "perejil",
    "cilantro",
    "menta",
    "azafran",
    "paprika",
    "chile",
    "guindilla",
    "hierbas",
    "condimento",
    "especias"
  ]
};

function matchesKeyword(key: string, keyword: string): boolean {
  if (keyword.includes(" ")) {
    return key.includes(keyword);
  }

  const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return pattern.test(key);
}

export function categorizeShoppingIngredient(name: string): ShoppingListCategoryId {
  const key = normalizeIngredientKey(name);
  let bestMatch: { category: ShoppingListCategoryId; keywordLength: number } | null = null;

  for (const category of SHOPPING_LIST_CATEGORIES) {
    if (category.id === "otros") continue;

    const keywords = CATEGORY_KEYWORDS[category.id];
    for (const keyword of keywords) {
      if (!matchesKeyword(key, keyword)) continue;

      const keywordLength = keyword.length;
      if (!bestMatch || keywordLength > bestMatch.keywordLength) {
        bestMatch = { category: category.id, keywordLength };
      }
    }
  }

  return bestMatch?.category ?? "otros";
}

export type ShoppingListCategoryGroup = {
  category: ShoppingListCategoryMeta;
  items: ShoppingListItem[];
};

export function groupShoppingListByCategory(items: ShoppingListItem[]): ShoppingListCategoryGroup[] {
  const buckets = new Map<ShoppingListCategoryId, ShoppingListItem[]>();

  for (const item of items) {
    const list = buckets.get(item.category) ?? [];
    list.push(item);
    buckets.set(item.category, list);
  }

  return SHOPPING_LIST_CATEGORIES.map((category) => ({
    category,
    items: (buckets.get(category.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "es")
    )
  })).filter((group) => group.items.length > 0);
}

export function compareShoppingListItems(a: ShoppingListItem, b: ShoppingListItem): number {
  const orderA = CATEGORY_ORDER.get(a.category) ?? 99;
  const orderB = CATEGORY_ORDER.get(b.category) ?? 99;

  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "es");
}
