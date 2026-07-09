import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Cake,
  Coffee,
  Cookie,
  Croissant,
  Flame,
  IceCream,
  Salad,
  Soup,
  Utensils,
  UtensilsCrossed
} from "lucide-react";

export type RecipePlaceholderStyle = {
  containerClass: string;
  iconClass: string;
  Icon: LucideIcon;
};

type KeywordPreset = RecipePlaceholderStyle & {
  keywords: string[];
};

const KEYWORD_PRESETS: KeywordPreset[] = [
  {
    keywords: ["bowl", "yogur", "yogurt", "avena", "oat", "desayuno", "overnight", "tostada", "smoothie", "granola"],
    containerClass: "bg-gradient-to-br from-[#F5EDE3] to-[#EDE4D8]",
    iconClass: "text-amber-700",
    Icon: Coffee
  },
  {
    keywords: ["tallarines", "pasta", "albondiga", "albondigas", "risotto", "arroz", "guiso", "lasaña", "lasana", "fideos"],
    containerClass: "bg-gradient-to-br from-[#E8EDE4] to-[#DCE6D6]",
    iconClass: "text-[#5A7350]",
    Icon: Soup
  },
  {
    keywords: ["copa", "postre", "miel", "tarta", "cake", "helado", "brownie", "galleta", "cookie", "chocolate", "dulce"],
    containerClass: "bg-gradient-to-br from-[#F5EBE6] to-[#EDD9CF]",
    iconClass: "text-[#C06A4F]",
    Icon: IceCream
  },
  {
    keywords: ["ensalada", "salad", "verde", "kale", "espinaca", "vegetal", "crudo", "poke"],
    containerClass: "bg-gradient-to-br from-[#EAF2E6] to-[#DDE9D6]",
    iconClass: "text-emerald-700",
    Icon: Salad
  },
  {
    keywords: ["airfryer", "asado", "horno", "plancha", "parrilla", "carne", "pollo", "salmon", "salmón"],
    containerClass: "bg-gradient-to-br from-[#FAE8DC] to-[#F0D4C4]",
    iconClass: "text-orange-700",
    Icon: Flame
  },
  {
    keywords: ["croissant", "pan", "muffin", "bizcocho", "reposteria", "repostería", "bollo"],
    containerClass: "bg-gradient-to-br from-[#F8F0E4] to-[#EDE0CC]",
    iconClass: "text-[#A67C52]",
    Icon: Croissant
  },
  {
    keywords: ["manzana", "apple", "fruta", "frutos", "berry", "mango", "platano", "plátano"],
    containerClass: "bg-gradient-to-br from-[#FCEEE8] to-[#F5DDD3]",
    iconClass: "text-rose-700",
    Icon: Apple
  },
  {
    keywords: ["tarta", "cheesecake", "flan", "mousse", "pastel"],
    containerClass: "bg-gradient-to-br from-[#F3E8F0] to-[#E8D5E4]",
    iconClass: "text-[#9D5C7E]",
    Icon: Cake
  }
];

const DEFAULT_POOL: RecipePlaceholderStyle[] = [
  {
    containerClass: "bg-gradient-to-br from-[#F5EBE6] to-[#EAE3DC]",
    iconClass: "text-[#B8956F]",
    Icon: UtensilsCrossed
  },
  {
    containerClass: "bg-gradient-to-br from-[#E8EDE4] to-[#DCE6D6]",
    iconClass: "text-[#5A7350]",
    Icon: Utensils
  },
  {
    containerClass: "bg-gradient-to-br from-[#F5EDE3] to-[#EDE4D8]",
    iconClass: "text-amber-700",
    Icon: Coffee
  },
  {
    containerClass: "bg-gradient-to-br from-[#EDE8F2] to-[#DDD4E8]",
    iconClass: "text-indigo-700",
    Icon: Cake
  },
  {
    containerClass: "bg-gradient-to-br from-[#FAE8DC] to-[#F0D4C4]",
    iconClass: "text-[#C06A4F]",
    Icon: Cookie
  },
  {
    containerClass: "bg-gradient-to-br from-[#EAF2E6] to-[#DDE9D6]",
    iconClass: "text-emerald-700",
    Icon: Salad
  },
  {
    containerClass: "bg-gradient-to-br from-[#FCEEE8] to-[#F5DDD3]",
    iconClass: "text-rose-700",
    Icon: Apple
  },
  {
    containerClass: "bg-gradient-to-br from-[#F8F0E4] to-[#EDE0CC]",
    iconClass: "text-[#A67C52]",
    Icon: Croissant
  },
  {
    containerClass: "bg-gradient-to-br from-[#F5EBE6] to-[#EDD9CF]",
    iconClass: "text-[#D07D62]",
    Icon: IceCream
  },
  {
    containerClass: "bg-gradient-to-br from-[#E8EDE4] to-[#C8DCBF]",
    iconClass: "text-[#4C6B3F]",
    Icon: Soup
  }
];

function hashRecipeKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getRecipePlaceholder(recipeName: string, recipeKey?: string): RecipePlaceholderStyle {
  const normalized = recipeName.trim().toLowerCase();

  for (const preset of KEYWORD_PRESETS) {
    if (preset.keywords.some((keyword) => normalized.includes(keyword))) {
      return {
        containerClass: preset.containerClass,
        iconClass: preset.iconClass,
        Icon: preset.Icon
      };
    }
  }

  const stableKey = (recipeKey ?? recipeName).trim().toLowerCase();
  const poolIndex = hashRecipeKey(stableKey) % DEFAULT_POOL.length;
  return DEFAULT_POOL[poolIndex];
}
