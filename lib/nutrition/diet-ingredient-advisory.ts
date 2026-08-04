import { type AppLocale, DEFAULT_LOCALE, parseAppLocale } from "@/i18n/config";
import {
  isRestrictivePreferredDiet,
  preferredDietLabel,
  type PreferredDiet
} from "@/lib/nutrition/preferred-diet";
import {
  normalizeIngredientKey,
  parseIngredientString
} from "@/lib/plan/ingredient-parser";
import { mergeAdvisoryNotes } from "@/lib/recipes/unhealthy-ingredient-advisory";

type DietPatternSet = {
  /** Coincidencias que marcan el alimento como no apto. */
  incompatible: RegExp[];
  /** Excepciones (p. ej. «harina de almendra(s)» en sin gluten). */
  exceptions?: RegExp[];
};

/** Harinas sin gluten (acepta singular/plural). */
const GF_FLOUR_EXCEPTION_RE =
  /\bharina\s+de\s+(almendras?|cocos?|garbanzos?|arroces?|ma[ií]z)\b/i;
const GF_FLOUR_EN_EXCEPTION_RE =
  /\b(almond|coconut|chickpea|rice|corn)\s+flours?\b/i;

/**
 * Heurísticas por dieta: si el usuario aporta estos ingredientes,
 * se genera la receta igual pero se avisa en la recomendación.
 */
const DIET_INCOMPATIBLE_PATTERNS: Record<
  Exclude<PreferredDiet, "estandar">,
  DietPatternSet
> = {
  sin_gluten: {
    incompatible: [
      /\btrigo\b/i,
      /\bwheat\b/i,
      /\bcebada\b/i,
      /\bbarley\b/i,
      /\bcenteno\b/i,
      /\brye\b/i,
      /\bgluten\b/i,
      /\bharina\b/i,
      /\bflour\b/i,
      /\bpan\b/i,
      /\bbread\b/i,
      /\bpasta\b/i,
      /\bfideos?\b/i,
      /\bnoodles?\b/i,
      /\bcusc[uú]s\b/i,
      /\bcouscous\b/i,
      /\bsemola\b/i,
      /\bs[eé]mola\b/i,
      /\bseit[aá]n\b/i,
      /\bseitan\b/i,
      /\bcerveza\b/i,
      /\bbeer\b/i,
      /\bgalletas?\b/i,
      /\bcookies?\b/i,
      /\bempanad/i,
      /\brebozado\b/i,
      /\bbattered\b/i
    ],
    exceptions: [
      /\bsin\s+gluten\b/i,
      /\bgluten[\s-]?free\b/i,
      GF_FLOUR_EXCEPTION_RE,
      GF_FLOUR_EN_EXCEPTION_RE
    ]
  },
  sin_harinas: {
    incompatible: [
      /\bharina\b/i,
      /\bflour\b/i,
      /\bpan\b/i,
      /\bbread\b/i,
      /\bpasta\b/i,
      /\bfideos?\b/i,
      /\bnoodles?\b/i,
      /\btortilla\s+de\s+trigo\b/i,
      /\bbollería\b/i,
      /\bboller[ií]a\b/i,
      /\bmasa\b/i,
      /\bdough\b/i,
      /\brebozado\b/i,
      /\bpan\s+rallado\b/i,
      /\bbreadcrumbs?\b/i
    ],
    exceptions: [
      /\bharina\s+de\s+(almendras?|cocos?|linazas?|avellanas?)\b/i,
      /\balmond\s+flours?\b/i,
      /\bcoconut\s+flours?\b/i
    ]
  },
  keto: {
    incompatible: [
      /\baz[uú]car\b/i,
      /\bsugar\b/i,
      /\barroz\b/i,
      /\brice\b/i,
      /\bpasta\b/i,
      /\bpan\b/i,
      /\bbread\b/i,
      /\bharina\b/i,
      /\bflour\b/i,
      /\bpatata/i,
      /\bpapa\b/i,
      /\bpotato/i,
      /\bavena\b/i,
      /\boat(meal|s)?\b/i,
      /\bpl[aá]tano\b/i,
      /\bbanana\b/i,
      /\bma[ií]z\b/i,
      /\bcorn\b/i,
      /\bgarbanzo/i,
      /\blenteja/i,
      /\bfrijol/i,
      /\bbeans?\b/i,
      /\bquinoa\b/i,
      /\bcusc[uú]s\b/i,
      /\bmiel\b/i,
      /\bhoney\b/i,
      /\bgolosina/i,
      /\brefresco\b/i,
      /\bsirop?e\b/i
    ],
    exceptions: [
      /\bharina\s+de\s+(almendras?|cocos?)\b/i,
      GF_FLOUR_EN_EXCEPTION_RE,
      /\baz[uú]car\s+de\s+coco\b/i
    ]
  },
  vegetariana: {
    incompatible: [
      /\bcarne\b/i,
      /\bmeat\b/i,
      /\bpollo\b/i,
      /\bchicken\b/i,
      /\bpavo\b/i,
      /\bturkey\b/i,
      /\bcerdo\b/i,
      /\bpork\b/i,
      /\bternera\b/i,
      /\bbeef\b/i,
      /\bres\b/i,
      /\bcordero\b/i,
      /\blamb\b/i,
      /\bjam[oó]n\b/i,
      /\bham\b/i,
      /\bbacon\b/i,
      /\bchorizo\b/i,
      /\bsalchicha/i,
      /\bpescado\b/i,
      /\bfish\b/i,
      /\bsalm[oó]n\b/i,
      /\bsalmon\b/i,
      /\bat[uú]n\b/i,
      /\btuna\b/i,
      /\bmarisco/i,
      /\bseafood\b/i,
      /\bgamba/i,
      /\bshrimp\b/i,
      /\bcalamar/i,
      /\bmejill[oó]n/i
    ]
  },
  vegana: {
    incompatible: [
      /\bcarne\b/i,
      /\bmeat\b/i,
      /\bpollo\b/i,
      /\bchicken\b/i,
      /\bpavo\b/i,
      /\bcerdo\b/i,
      /\bternera\b/i,
      /\bbeef\b/i,
      /\bjam[oó]n\b/i,
      /\bbacon\b/i,
      /\bpescado\b/i,
      /\bfish\b/i,
      /\bsalm[oó]n\b/i,
      /\bat[uú]n\b/i,
      /\bmarisco/i,
      /\bgamba/i,
      /\bhuevo/i,
      /\begg\b/i,
      /\bleche\b/i,
      /\bmilk\b/i,
      /\bqueso\b/i,
      /\bcheese\b/i,
      /\byogur/i,
      /\byogurt\b/i,
      /\bnata\b/i,
      /\bcream\b/i,
      /\bmantequilla\b/i,
      /\bbutter\b/i,
      /\bmiel\b/i,
      /\bhoney\b/i,
      /\bwhey\b/i,
      /\bcase[ií]na\b/i
    ],
    exceptions: [
      /\bleche\s+de\s+(almendras?|avenas?|cocos?|sojas?|arroces?)\b/i,
      /\b(almond|oat|coconut|soy|rice)\s+milks?\b/i,
      /\byogur(?:t)?\s+de\s+(sojas?|cocos?|almendras?)\b/i
    ]
  },
  alto_proteina: {
    incompatible: [
      /\bchuches?\b/i,
      /\bgolosina/i,
      /\brefresco\b/i,
      /\bsoda\b/i,
      /\bpatatas?\s+fritas\b/i,
      /\bfrench\s+fries\b/i
    ]
  },
  mediterranea: {
    incompatible: [
      /\bultraproces/i,
      /\bnugget/i,
      /\bhot\s*dog\b/i,
      /\brefresco\b/i,
      /\bsoda\b/i,
      /\bpatatas?\s+fritas\b/i
    ]
  }
};

/** Nombre del alimento sin cantidad («60 g de Harina de Almendras» → «Harina de Almendras»). */
function foodNameForDietCheck(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const parsed = parseIngredientString(trimmed);
  return (parsed?.name ?? trimmed).trim();
}

function isIncompatibleForDiet(name: string, diet: Exclude<PreferredDiet, "estandar">): boolean {
  const set = DIET_INCOMPATIBLE_PATTERNS[diet];
  if (set.exceptions?.some((pattern) => pattern.test(name))) {
    return false;
  }
  return set.incompatible.some((pattern) => pattern.test(name));
}

export function findDietIncompatibleIngredientNames(
  ingredientNames: string[],
  diet: PreferredDiet | null | undefined
): string[] {
  if (!isRestrictivePreferredDiet(diet) || !diet || diet === "estandar") {
    return [];
  }

  const found: string[] = [];
  const seen = new Set<string>();

  for (const raw of ingredientNames) {
    const displayName = foodNameForDietCheck(raw);
    if (!displayName) continue;
    if (!isIncompatibleForDiet(displayName, diet)) continue;
    const key = normalizeIngredientKey(displayName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    found.push(displayName);
  }

  return found;
}

function formatNameList(names: string[], locale: AppLocale): string {
  if (names.length === 1) return names[0]!;
  const head = names.slice(0, -1).join(", ");
  const last = names[names.length - 1]!;
  switch (locale) {
    case "en":
      return `${head} and ${last}`;
    case "de":
      return `${head} und ${last}`;
    case "fr":
      return `${head} et ${last}`;
    case "pt":
      return `${head} e ${last}`;
    case "es":
    default:
      return `${head} y ${last}`;
  }
}

function reasonPhrase(diet: PreferredDiet, locale: AppLocale): string {
  const map: Record<Exclude<PreferredDiet, "estandar">, Record<AppLocale, string>> = {
    sin_gluten: {
      es: "contiene gluten / no es apto sin gluten",
      en: "contains gluten / is not gluten-free",
      fr: "contient du gluten / n'est pas sans gluten",
      pt: "contém glúten / não é sem glúten",
      de: "enthält Gluten / ist nicht glutenfrei"
    },
    sin_harinas: {
      es: "incluye harinas o derivados no aptos para tu dieta sin harinas",
      en: "includes flour or flour-based foods not suited to your flourless diet",
      fr: "contient des farines ou dérivés non adaptés à votre régime sans farine",
      pt: "inclui farinhas ou derivados não adequados à sua dieta sem farinhas",
      de: "enthält Mehl oder Mehlprodukte, die nicht zu deiner mehlfreien Ernährung passen"
    },
    keto: {
      es: "no encaja bien en una dieta keto / low carb (alto en carbohidratos)",
      en: "doesn't fit a keto / low-carb diet (high in carbs)",
      fr: "ne convient pas à un régime keto / low carb (riche en glucides)",
      pt: "não encaixa bem numa dieta keto / low carb (alto em hidratos)",
      de: "passt nicht gut zu einer Keto-/Low-Carb-Ernährung (kohlenhydratreich)"
    },
    vegetariana: {
      es: "es de origen animal y no es vegetariano",
      en: "is animal-based and not vegetarian",
      fr: "est d'origine animale et n'est pas végétarien",
      pt: "é de origem animal e não é vegetariano",
      de: "ist tierisch und nicht vegetarisch"
    },
    vegana: {
      es: "es de origen animal y no es vegano",
      en: "is animal-based and not vegan",
      fr: "est d'origine animale et n'est pas végan",
      pt: "é de origem animal e não é vegan",
      de: "ist tierisch und nicht vegan"
    },
    alto_proteina: {
      es: "no aporta proteína útil para tu meta de alto en proteína",
      en: "doesn't support your high-protein goal",
      fr: "n'apporte pas de protéines utiles pour votre objectif hyperprotéiné",
      pt: "não contribui para a sua meta de alto teor proteico",
      de: "unterstützt dein High-Protein-Ziel nicht"
    },
    mediterranea: {
      es: "no encaja con un enfoque mediterráneo equilibrado",
      en: "doesn't fit a balanced Mediterranean approach",
      fr: "ne correspond pas à une approche méditerranéenne équilibrée",
      pt: "não encaixa numa abordagem mediterrânica equilibrada",
      de: "passt nicht zu einem ausgewogenen mediterranen Ansatz"
    }
  };

  if (diet === "estandar") return "";
  return map[diet][locale] ?? map[diet].es;
}

/**
 * Aviso cuando hay ingredientes no aptos para la dieta preferida del usuario.
 */
export function buildDietIncompatibilityAdvisory(
  ingredientNames: string[],
  diet: PreferredDiet | null | undefined,
  localeInput?: unknown
): string | undefined {
  if (!isRestrictivePreferredDiet(diet) || !diet) return undefined;

  const incompatible = findDietIncompatibleIngredientNames(ingredientNames, diet);
  if (incompatible.length === 0) return undefined;

  const locale = parseAppLocale(localeInput, DEFAULT_LOCALE);
  const list = formatNameList(incompatible, locale);
  const reason = reasonPhrase(diet, locale);
  const dietName = preferredDietLabel(diet);

  switch (locale) {
    case "en":
      return incompatible.length === 1
        ? `Diet note (${dietName}): "${list}" ${reason}. We still created the recipe from what you scanned — adjust if you want to stay on plan.`
        : `Diet note (${dietName}): ${list} ${reason}. We still created the recipe from what you scanned — adjust if you want to stay on plan.`;
    case "fr":
      return incompatible.length === 1
        ? `Note régime (${dietName}) : « ${list} » ${reason}. La recette a tout de même été créée à partir de votre scan — adaptez-la si besoin.`
        : `Note régime (${dietName}) : ${list} ${reason}. La recette a tout de même été créée — adaptez-la si besoin.`;
    case "pt":
      return incompatible.length === 1
        ? `Nota de dieta (${dietName}): "${list}" ${reason}. Mesmo assim gerámos a receita a partir do seu scan — ajuste se quiser manter o plano.`
        : `Nota de dieta (${dietName}): ${list} ${reason}. Mesmo assim gerámos a receita — ajuste se quiser manter o plano.`;
    case "de":
      return incompatible.length === 1
        ? `Diät-Hinweis (${dietName}): „${list}“ ${reason}. Das Rezept wurde trotzdem aus deinem Scan erstellt — passe es bei Bedarf an.`
        : `Diät-Hinweis (${dietName}): ${list} ${reason}. Das Rezept wurde trotzdem erstellt — passe es bei Bedarf an.`;
    case "es":
    default:
      return incompatible.length === 1
        ? `Nota de dieta (${dietName}): "${list}" ${reason}. Hemos generado la receta con lo que escaneaste; ajústala si quieres mantener tu plan.`
        : `Nota de dieta (${dietName}): ${list} ${reason}. Hemos generado la receta con lo que escaneaste; ajústala si quieres mantener tu plan.`;
  }
}

/**
 * Quita notas de dieta generadas por la IA (pueden ser falsos positivos).
 * La heurística del servidor es la fuente de verdad del aviso de dieta.
 */
const DIET_ADVISORY_CHUNK_RE =
  /(?:nota\s+de\s+dieta|diet\s+note|note\s+r[eé]gime|di[aä]t[\s-]?hinweis)\s*(?:\([^)]*\))?\s*:[^.?!]+[.?!]?(?:\s*(?:Hemos generado|We still created|La recette a tout|Mesmo assim ger|Das Rezept wurde)[^.?!]+[.?!]?)?/gi;

function stripDietAdvisoryNotes(text: string): string | undefined {
  const cleaned = text
    .replace(DIET_ADVISORY_CHUNK_RE, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Garantiza aviso de incompatibilidad con la dieta según heurística del servidor.
 * No confía en el texto de dieta de Gemini (evita falsos positivos como harina de almendras).
 */
export function ensureDietIncompatibilityAdvisory(input: {
  existingAdvisory?: string | null;
  ingredientNames: string[];
  preferredDiet?: PreferredDiet | null;
  locale?: unknown;
}): string | undefined {
  const existing =
    typeof input.existingAdvisory === "string" && input.existingAdvisory.trim().length > 0
      ? input.existingAdvisory.trim()
      : undefined;

  const withoutAiDietNote = existing ? stripDietAdvisoryNotes(existing) : undefined;
  const fallback = buildDietIncompatibilityAdvisory(
    input.ingredientNames,
    input.preferredDiet,
    input.locale
  );
  return mergeAdvisoryNotes(withoutAiDietNote, fallback);
}

/**
 * Instrucción Gemini: generar receta + avisar si hay ingredientes no aptos para la dieta.
 */
export function buildDietIncompatibilityWarningPromptClause(
  diet: PreferredDiet | null | undefined
): string {
  if (!isRestrictivePreferredDiet(diet) || !diet) return "";

  const dietName = preferredDietLabel(diet);
  return (
    `REGLA AVISO DIETA PREFERIDA (${dietName}) (obligatoria): ` +
    `El usuario sigue una alimentación «${dietName}». ` +
    "Si ALGÚN ingrediente aportado (manual o imagen) O que aparezca en las recetas generadas NO es apto para esa dieta " +
    "(ej. harina de trigo/pan/pasta con gluten en sin gluten; harinas de cereal en sin harinas; arroz/azúcar/pasta en keto; carne/pescado en vegetariana; " +
    "huevo/lácteos/carne en vegana), DEBES: " +
    "(1) GENERAR igualmente las 3 recetas priorizando lo que el usuario aportó — no inventes sustitutos del ingrediente principal del usuario; " +
    "(2) rellenar advertencia_ingredientes nombrando el/los alimento(s) no aptos y por qué " +
    `(ej. 'Nota de dieta (${dietName}): la pasta contiene gluten / no es apta sin gluten.'); ` +
    "(3) puedes sugerir un ajuste en tip_sandra, pero SIN eliminar el ingrediente del usuario. " +
    "IMPORTANTE sin gluten: harina de almendras, de coco, de garbanzo, de arroz o de maíz SÍ son aptas (NO avises gluten por ellas). " +
    "Solo avisa gluten con trigo, cebada, centeno, harina de trigo, pan/pasta convencionales, etc. " +
    "Si todos los ingredientes son compatibles con la dieta, no añadas este aviso de dieta.\n\n"
  );
}
