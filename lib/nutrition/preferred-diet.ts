/**
 * Preferencia de alimentación del usuario (Personalizar parámetros).
 * Guía sugerencias en Hoy, menú del día y generación de recetas.
 */

export const PREFERRED_DIETS = [
  {
    id: "estandar",
    labelKey: "dietStandard",
    fallbackLabel: "Sin restricciones"
  },
  {
    id: "sin_gluten",
    labelKey: "dietGlutenFree",
    fallbackLabel: "Sin gluten"
  },
  {
    id: "sin_harinas",
    labelKey: "dietFlourless",
    fallbackLabel: "Sin harinas"
  },
  {
    id: "keto",
    labelKey: "dietKeto",
    fallbackLabel: "Keto / low carb"
  },
  {
    id: "vegetariana",
    labelKey: "dietVegetarian",
    fallbackLabel: "Vegetariana"
  },
  {
    id: "vegana",
    labelKey: "dietVegan",
    fallbackLabel: "Vegana"
  },
  {
    id: "alto_proteina",
    labelKey: "dietHighProtein",
    fallbackLabel: "Alto en proteína"
  },
  {
    id: "mediterranea",
    labelKey: "dietMediterranean",
    fallbackLabel: "Mediterránea"
  }
] as const;

export type PreferredDiet = (typeof PREFERRED_DIETS)[number]["id"];

const PREFERRED_DIET_IDS = new Set<string>(PREFERRED_DIETS.map((item) => item.id));

export function parsePreferredDiet(value: unknown): PreferredDiet {
  if (typeof value === "string" && PREFERRED_DIET_IDS.has(value)) {
    return value as PreferredDiet;
  }
  return "estandar";
}

export function isRestrictivePreferredDiet(diet: PreferredDiet | null | undefined): boolean {
  return Boolean(diet && diet !== "estandar");
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function collectTagStrings(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => {
      if (typeof tag === "string") return normalizeText(tag);
      if (tag && typeof tag === "object" && "label" in tag) {
        return normalizeText((tag as { label?: unknown }).label);
      }
      return "";
    })
    .filter(Boolean);
}

export type DietMatchableRecipe = {
  title?: string | null;
  tags?: unknown;
  is_airfryer?: boolean | null;
  is_flourless?: boolean | null;
  cuisine_style?: string | null;
  macros?: unknown;
};

function hasAnyTag(tags: string[], needles: string[]): boolean {
  return needles.some((needle) => tags.some((tag) => tag.includes(needle)));
}

function titleHints(title: string, needles: string[]): boolean {
  return needles.some((needle) => title.includes(needle));
}

/**
 * ¿La receta encaja con la dieta preferida?
 * `unknown` = no hay señales claras (ni a favor ni en contra).
 */
export function recipeMatchesPreferredDiet(
  recipe: DietMatchableRecipe,
  diet: PreferredDiet | null | undefined
): boolean | "unknown" {
  if (!diet || diet === "estandar") return true;

  const tags = collectTagStrings(recipe.tags);
  const title = normalizeText(recipe.title);
  const cuisine = normalizeText(recipe.cuisine_style);

  // Asignación explícita de admin (`diet:vegetariana`, etc.) tiene prioridad.
  const canonicalDietTag = `diet:${diet}`;
  if (tags.some((tag) => tag === canonicalDietTag || tag === diet)) {
    return true;
  }

  switch (diet) {
    case "sin_harinas": {
      if (recipe.is_flourless === true || hasAnyTag(tags, ["sin harina", "flourless", "low carb"])) {
        return true;
      }
      if (hasAnyTag(tags, ["harina", "pasta", "pan ", "bread"])) return false;
      return "unknown";
    }
    case "sin_gluten": {
      if (
        hasAnyTag(tags, ["sin gluten", "gluten free", "gluten-free", "celiac"]) ||
        recipe.is_flourless === true
      ) {
        return true;
      }
      if (hasAnyTag(tags, ["gluten", "trigo", "wheat"]) || titleHints(title, ["pizza", "pasta", "pan "])) {
        return false;
      }
      return "unknown";
    }
    case "keto": {
      if (hasAnyTag(tags, ["keto", "cetogen", "low carb", "bajo en carb"])) return true;
      if (hasAnyTag(tags, ["azucar", "postre", "harina", "pasta", "arroz"])) return false;
      return "unknown";
    }
    case "vegetariana": {
      if (hasAnyTag(tags, ["vegetarian", "veggie", "plant based"])) return true;
      if (
        hasAnyTag(tags, ["carne", "pollo", "pescado", "marisco", "cerdo", "ternera", "jamon"]) ||
        titleHints(title, ["pollo", "carne", "pescado", "salmon", "atun", "cerdo", "ternera"])
      ) {
        return false;
      }
      return "unknown";
    }
    case "vegana": {
      if (hasAnyTag(tags, ["vegan", "vegana", "plant based"])) return true;
      if (
        hasAnyTag(tags, [
          "carne",
          "pollo",
          "pescado",
          "huevo",
          "lacteo",
          "queso",
          "yogur",
          "leche",
          "miel"
        ]) ||
        titleHints(title, ["pollo", "carne", "huevo", "queso", "yogur", "salmon"])
      ) {
        return false;
      }
      return "unknown";
    }
    case "alto_proteina": {
      if (hasAnyTag(tags, ["alto en proteina", "high protein", "proteina"])) return true;
      return "unknown";
    }
    case "mediterranea": {
      if (
        cuisine === "estandar" ||
        hasAnyTag(tags, ["mediterran", "mediterranean"]) ||
        titleHints(title, ["aceite de oliva", "tomate", "garbanzo", "lenteja"])
      ) {
        return true;
      }
      return "unknown";
    }
    default:
      return true;
  }
}

/** Bonus de ranking: menor = mejor. */
export function preferredDietScoreBonus(
  recipe: DietMatchableRecipe,
  diet: PreferredDiet | null | undefined
): number {
  if (!isRestrictivePreferredDiet(diet)) return 0;
  const match = recipeMatchesPreferredDiet(recipe, diet);
  if (match === true) return -28;
  if (match === false) return 45;
  return 8;
}

export function preferredDietLabel(diet: PreferredDiet): string {
  return PREFERRED_DIETS.find((item) => item.id === diet)?.fallbackLabel ?? "Sin restricciones";
}

/** Instrucciones para prompts de IA (generación y ranking). */
export function buildPreferredDietPromptClause(
  diet: PreferredDiet | null | undefined
): string {
  if (!diet || diet === "estandar") {
    return "";
  }

  const clauses: Record<Exclude<PreferredDiet, "estandar">, string> = {
    sin_gluten:
      "DIETA OBLIGATORIA DEL USUARIO: Sin gluten. No uses trigo, cebada, centeno ni derivados con gluten. Prefiere harinas sin gluten o platos naturalmente sin gluten.",
    sin_harinas:
      "DIETA OBLIGATORIA DEL USUARIO: Sin harinas. Evita pan, pasta, bollería y harinas refinadas. Prioriza proteínas, vegetales y grasas buenas.",
    keto:
      "DIETA OBLIGATORIA DEL USUARIO: Keto / low carb. Muy bajos carbohidratos, moderada proteína, grasas saludables. Sin azúcares ni harinas.",
    vegetariana:
      "DIETA OBLIGATORIA DEL USUARIO: Vegetariana. Sin carne ni pescado. Pueden usarse huevos y lácteos.",
    vegana:
      "DIETA OBLIGATORIA DEL USUARIO: Vegana. Sin ningún producto animal (carne, pescado, huevos, lácteos, miel).",
    alto_proteina:
      "DIETA OBLIGATORIA DEL USUARIO: Alto en proteína. Prioriza platos con buena densidad proteica (carne magra, pescado, huevos, legumbres, lácteos).",
    mediterranea:
      "DIETA OBLIGATORIA DEL USUARIO: Mediterránea. Aceite de oliva, vegetales, legumbres, pescado, hierbas; cocina ligera y equilibrada."
  };

  return clauses[diet] ?? "";
}
