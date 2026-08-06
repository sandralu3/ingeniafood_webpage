import { type AppLocale, DEFAULT_LOCALE, parseAppLocale } from "@/i18n/config";

/**
 * Heurística de alimentos comestibles pero poco saludables / ultraprocesados.
 * Si el usuario los aporta (manual o foto), pueden usarse o descartarse del plato —
 * el aviso debe coherir con lo que realmente entra en ingredientes_detallados.
 */
const UNHEALTHY_FOOD_PATTERNS: RegExp[] = [
  /\bbacon\b/i,
  /\bbeicon\b/i,
  /\btocineta\b/i,
  /\bsalchicha/i,
  /\bsausage\b/i,
  /\bhot\s*dog\b/i,
  /\bfrankfurt\b/i,
  /\bmortadela\b/i,
  /\bchorizo\b/i,
  /\bsalami\b/i,
  /\bpepperoni\b/i,
  /\bjam[oó]n\s+york\b/i,
  /\bembutido/i,
  /\bnugget/i,
  /\bfinger\s*food\b/i,
  /\bpizza\b/i,
  /\bhamburguesa\b/i,
  /\bburger\b/i,
  /\bdonut\b/i,
  /\bdona\b/i,
  /\bbollería\b/i,
  /\bboller[ií]a\b/i,
  /\bcroissant\b/i,
  /\bmagdalena\b/i,
  /\bcupcake\b/i,
  /\bgolosina/i,
  /\bgominola/i,
  /\bgummy\b/i,
  /\bpiruleta/i,
  /\blollipop\b/i,
  /\bnube\b/i,
  /\bmarshmallow\b/i,
  /\bchuche/i,
  /\bcandy\b/i,
  /\bchocolate\s+con\s+leche\b/i,
  /\bhelado\b/i,
  /\bice\s*cream\b/i,
  /\bnata\s+montada\b/i,
  /\bwhipped\s+cream\b/i,
  /\bmayonnaise\b/i,
  /\bmayonesa\b/i,
  /\bketchup\b/i,
  /\bpatatas?\s+fritas\b/i,
  /\bfrench\s+fries\b/i,
  /\bchips\b/i,
  /\bsnack\s+frito/i,
  /\brefresco\b/i,
  /\bsoda\b/i,
  /\bcoca[\s-]?cola\b/i,
  /\bcola\b/i,
  /\benerg[eé]tica\b/i,
  /\benergy\s+drink\b/i,
  /\bcerveza\b/i,
  /\bbeer\b/i,
  /\bvino\b/i,
  /\bwine\b/i,
  /\balcohol\b/i,
  /\blicor\b/i,
  /\bfritura\b/i,
  /\bfrito[as]?\b/i,
  /\brebozado\b/i,
  /\bbattered\b/i,
  /\baz[uú]car\s+refinad/i,
  /\brefined\s+sugar\b/i,
  /\bsirop?e\s+de\s+ma[ií]z\b/i,
  /\bcorn\s+syrup\b/i,
  /\bultraproces/i,
  /\bultra[\s-]?process/i,
  /\bcomida\s+r[aá]pida\b/i,
  /\bfast\s+food\b/i,
  /\bmargarina\b/i,
  /\bmanteca\b/i,
  /\blard\b/i,
  /\bpanceta\b/i,
  /\brinds?\b/i,
  /\bchicharr[oó]n/i
];

/** Evita falsos positivos en grasas/preparaciones habitualmente saludables. */
const HEALTHY_EXCEPTION_RE =
  /\b(aceite\s+de\s+oliva|olive\s+oil|aguacate|avocado|salm[oó]n|salmon|yogur|yogurt|avena|oatmeal|integral|whole\s+grain)\b/i;

export function findUnhealthyIngredientNames(ingredientNames: string[]): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const raw of ingredientNames) {
    const name = raw.trim();
    if (!name || HEALTHY_EXCEPTION_RE.test(name)) continue;
    const isUnhealthy = UNHEALTHY_FOOD_PATTERNS.some((pattern) => pattern.test(name));
    if (!isUnhealthy) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(name);
  }

  return found;
}

export function hasUnhealthyIngredients(ingredientNames: string[]): boolean {
  return findUnhealthyIngredientNames(ingredientNames).length > 0;
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

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True si el nombre del usuario aparece (parcialmente) en los ingredientes usados de la receta. */
export function ingredientAppearsInUsedList(
  candidate: string,
  usedIngredientNames: string[]
): boolean {
  const key = normalizeKey(candidate);
  if (!key) return false;
  return usedIngredientNames.some((used) => {
    const usedKey = normalizeKey(used);
    if (!usedKey) return false;
    return usedKey.includes(key) || key.includes(usedKey);
  });
}

/**
 * Aviso cuando el ultraprocesado SÍ se usó en el plato.
 */
export function buildUnhealthyIncludedAdvisory(
  ingredientNames: string[],
  localeInput?: unknown
): string | undefined {
  const unhealthy = findUnhealthyIngredientNames(ingredientNames);
  if (unhealthy.length === 0) return undefined;

  const locale = parseAppLocale(localeInput, DEFAULT_LOCALE);
  const list = formatNameList(unhealthy, locale);

  switch (locale) {
    case "en":
      return unhealthy.length === 1
        ? `Note: "${list}" is not a healthy food and it is used in this recipe because you asked for it — enjoy in moderation.`
        : `Note: ${list} are not healthy foods and they are used in this recipe because you asked for them — enjoy in moderation.`;
    case "fr":
      return unhealthy.length === 1
        ? `Attention : « ${list} » n'est pas un aliment sain et il est utilisé dans cette recette car vous l'avez demandé — à consommer avec modération.`
        : `Attention : ${list} ne sont pas des aliments sains et ils sont utilisés dans cette recette — à consommer avec modération.`;
    case "pt":
      return unhealthy.length === 1
        ? `Atenção: "${list}" não é um alimento saudável e está nesta receita porque pediu — consuma com moderação.`
        : `Atenção: ${list} não são alimentos saudáveis e estão nesta receita — consuma com moderação.`;
    case "de":
      return unhealthy.length === 1
        ? `Hinweis: „${list}“ ist kein gesundes Lebensmittel und wird in diesem Rezept verwendet, weil du danach gefragt hast — in Maßen genießen.`
        : `Hinweis: ${list} sind keine gesunden Lebensmittel und werden in diesem Rezept verwendet — in Maßen genießen.`;
    case "es":
    default:
      return unhealthy.length === 1
        ? `Ten en cuenta: "${list}" no es un alimento saludable y está en esta receta porque lo pediste; consúmelo con moderación.`
        : `Ten en cuenta: ${list} no son alimentos saludables y están en esta receta porque los pediste; consúmelos con moderación.`;
  }
}

/**
 * Aviso cuando el ultraprocesado/golosina se descartó del plato principal.
 */
export function buildUnhealthyDiscardedAdvisory(
  discardedNames: string[],
  usedNames: string[],
  localeInput?: unknown
): string | undefined {
  const discarded = findUnhealthyIngredientNames(discardedNames);
  if (discarded.length === 0) return undefined;

  const locale = parseAppLocale(localeInput, DEFAULT_LOCALE);
  const discardedList = formatNameList(discarded, locale);
  const usedClean = usedNames.map((n) => n.trim()).filter(Boolean);
  const usedList =
    usedClean.length > 0 ? formatNameList(usedClean.slice(0, 4), locale) : null;

  switch (locale) {
    case "en":
      return usedList
        ? `This recipe uses ${usedList}. ${discardedList} ${discarded.length === 1 ? "was" : "were"} left out as ultra-processed sweets not suitable for a healthy main dish.`
        : `${discardedList} ${discarded.length === 1 ? "was" : "were"} left out as ultra-processed sweets not suitable for a healthy main dish.`;
    case "fr":
      return usedList
        ? `Cette recette utilise ${usedList}. ${discardedList} ${discarded.length === 1 ? "a été écarté" : "ont été écartés"} car ultraprocesés / confiseries, non adaptés à un plat principal sain.`
        : `${discardedList} ${discarded.length === 1 ? "a été écarté" : "ont été écartés"} car ultraprocesés / confiseries.`;
    case "pt":
      return usedList
        ? `Esta receita usa ${usedList}. ${discardedList} ${discarded.length === 1 ? "foi descartado" : "foram descartados"} por serem ultraprocessados / guloseimas, não aptos para um prato principal saudável.`
        : `${discardedList} ${discarded.length === 1 ? "foi descartado" : "foram descartados"} por serem ultraprocessados / guloseimas.`;
    case "de":
      return usedList
        ? `Dieses Rezept verwendet ${usedList}. ${discardedList} ${discarded.length === 1 ? "wurde" : "wurden"} weggelassen, weil ultraprozessierte Süßigkeiten nicht für ein gesundes Hauptgericht geeignet sind.`
        : `${discardedList} ${discarded.length === 1 ? "wurde" : "wurden"} als ultraprozessierte Süßigkeiten weggelassen.`;
    case "es":
    default:
      return usedList
        ? `Se han utilizado ${usedList} para esta preparación. Se descartaron ${discardedList} por ser productos ultraprocesados / dulces no aptos para una receta saludable principal.`
        : `Se descartaron ${discardedList} por ser productos ultraprocesados / dulces no aptos para una receta saludable principal.`;
  }
}

/** @deprecated Prefer buildUnhealthyIncludedAdvisory / buildUnhealthyDiscardedAdvisory. */
export function buildUnhealthyIngredientsAdvisory(
  ingredientNames: string[],
  localeInput?: unknown
): string | undefined {
  return buildUnhealthyIncludedAdvisory(ingredientNames, localeInput);
}

const UNHEALTHY_ADVISORY_ALREADY_RE =
  /poco\s+saludable|no\s+es\s+un\s+alimento\s+saludable|no\s+son\s+alimentos\s+saludables|unhealthy|not\s+a\s+healthy|not\s+healthy|peu\s+sain|n'est\s+pas\s+un\s+aliment\s+sain|pouco\s+saud[aá]vel|n[aã]o\s+[eé]\s+um\s+alimento\s+saud[aá]vel|ungesund|kein\s+gesundes|ultraproces|ultra[\s-]?process|descart|left\s+out|écart|weggelassen/i;

/** Afirma falsamente que se usó/incluyó el ultraprocesado en el plato. */
const FALSE_INCLUSION_CLAIM_RE =
  /incluim|incluimos|incluido|incluida|forma\s+parte\s+de\s+(tu\s+)?(despensa|la\s+receta)|generamos\s+la\s+receta\s+porque|porque\s+lo\s+pediste|porque\s+los\s+pediste|we\s+still\s+generated|because\s+you\s+asked|están?\s+en\s+esta\s+receta|is\s+used\s+in\s+this\s+recipe|are\s+used\s+in\s+this\s+recipe/i;

export function mergeAdvisoryNotes(
  ...parts: Array<string | undefined | null>
): string | undefined {
  const cleaned = parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0);
  if (cleaned.length === 0) return undefined;
  return cleaned.join(" ");
}

/**
 * Garantiza aviso de poco saludable coherente con lo realmente usado en las recetas.
 */
export function ensureUnhealthyIngredientAdvisory(input: {
  existingAdvisory?: string | null;
  /** Ingredientes de la despensa / selección del usuario. */
  ingredientNames: string[];
  /** Ingredientes que aparecen en las recetas generadas (detallados). */
  usedIngredientNames?: string[];
  locale?: unknown;
}): string | undefined {
  const existing =
    typeof input.existingAdvisory === "string" && input.existingAdvisory.trim().length > 0
      ? input.existingAdvisory.trim()
      : undefined;

  const pantryUnhealthy = findUnhealthyIngredientNames(input.ingredientNames);
  if (pantryUnhealthy.length === 0) {
    return existing;
  }

  const usedList = Array.isArray(input.usedIngredientNames)
    ? input.usedIngredientNames
    : input.ingredientNames;

  const included = pantryUnhealthy.filter((name) =>
    ingredientAppearsInUsedList(name, usedList)
  );
  const discarded = pantryUnhealthy.filter(
    (name) => !ingredientAppearsInUsedList(name, usedList)
  );

  // Si Gemini ya explicó bien un descarte y no miente con "lo incluimos", respétalo.
  if (
    existing &&
    UNHEALTHY_ADVISORY_ALREADY_RE.test(existing) &&
    !(discarded.length > 0 && FALSE_INCLUSION_CLAIM_RE.test(existing))
  ) {
    return existing;
  }

  // Quitar afirmación falsa de inclusión cuando hubo descarte.
  let baseExisting = existing;
  if (baseExisting && discarded.length > 0 && FALSE_INCLUSION_CLAIM_RE.test(baseExisting)) {
    baseExisting = undefined;
  }

  const healthyUsedHint = usedList
    .map((n) => n.trim())
    .filter(Boolean)
    .filter((n) => !findUnhealthyIngredientNames([n]).length)
    .slice(0, 4);

  const discardedNote =
    discarded.length > 0
      ? buildUnhealthyDiscardedAdvisory(discarded, healthyUsedHint, input.locale)
      : undefined;
  const includedNote =
    included.length > 0
      ? buildUnhealthyIncludedAdvisory(included, input.locale)
      : undefined;

  return mergeAdvisoryNotes(baseExisting, discardedNote, includedNote);
}

/**
 * Instrucción Gemini: aviso coherente con uso real vs descarte.
 */
export function buildUnhealthyIngredientWarningPromptClause(): string {
  return (
    "REGLA AVISO ALIMENTO POCO SALUDABLE (obligatoria, coherente con el plato):\n" +
    "Si ALGÚN ingrediente del usuario es ultraprocesado, golosina o poco saludable " +
    "(ej. bacon, salchichas, nuggets, gominolas, piruletas, nubes, chuches, dulces industriales, chips, refrescos, alcohol), " +
    "NO lo trates como NOT_FOOD (sí es comida), pero:\n" +
    "A) Si hay ingredientes saludables compatibles, PRIORIZA esos para la receta principal y DESCARTA los ultraprocesados/golosinas del plato. " +
    "En advertencia_ingredientes o ingredientes_omitidos_nota di con claridad qué usaste y qué descartaste y por qué " +
    "(ej. 'Se han utilizado únicamente el aguacate y el ajo. Se descartaron las gominolas y dulces por ser ultraprocesados no aptos para una receta saludable principal.'). " +
    "PROHIBIDO decir que los incluiste o que forman parte de la receta si no están en ingredientes_detallados.\n" +
    "B) Solo si el ultraprocesado es el protagonista necesario (único usable), GENERA la receta CON él y avisa que SÍ está en el plato y no es saludable.\n" +
    "C) tip_sandra puede sugerir el dulce como snack aparte, sin fingir que va cocinado en el plato.\n" +
    "Si todos los ingredientes son razonablemente saludables, advertencia_ingredientes puede ser \"\".\n\n"
  );
}
