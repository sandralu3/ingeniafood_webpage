import { type AppLocale, DEFAULT_LOCALE, parseAppLocale } from "@/i18n/config";

/**
 * Heurística de alimentos comestibles pero poco saludables / ultraprocesados.
 * Si el usuario los aporta (manual o foto), se genera receta + aviso — no son NOT_FOOD.
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

/**
 * Aviso localizado cuando hay alimentos poco saludables en la entrada del usuario.
 */
export function buildUnhealthyIngredientsAdvisory(
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
        ? `Note: "${list}" is not a healthy food. We still generated the recipe because you asked for it — enjoy it in moderation.`
        : `Note: ${list} are not healthy foods. We still generated the recipe because you asked for them — enjoy in moderation.`;
    case "fr":
      return unhealthy.length === 1
        ? `Attention : « ${list} » n'est pas un aliment sain. La recette a tout de même été générée car vous l'avez demandé — à consommer avec modération.`
        : `Attention : ${list} ne sont pas des aliments sains. La recette a tout de même été générée — à consommer avec modération.`;
    case "pt":
      return unhealthy.length === 1
        ? `Atenção: "${list}" não é um alimento saudável. Mesmo assim gerámos a receita porque pediu — consuma com moderação.`
        : `Atenção: ${list} não são alimentos saudáveis. Mesmo assim gerámos a receita — consuma com moderação.`;
    case "de":
      return unhealthy.length === 1
        ? `Hinweis: „${list}“ ist kein gesundes Lebensmittel. Das Rezept wurde trotzdem erstellt, weil du danach gefragt hast — in Maßen genießen.`
        : `Hinweis: ${list} sind keine gesunden Lebensmittel. Das Rezept wurde trotzdem erstellt — in Maßen genießen.`;
    case "es":
    default:
      return unhealthy.length === 1
        ? `Ten en cuenta: "${list}" no es un alimento saludable. Hemos generado la receta porque lo pediste; consúmelo con moderación.`
        : `Ten en cuenta: ${list} no son alimentos saludables. Hemos generado la receta porque los pediste; consúmelos con moderación.`;
  }
}

const UNHEALTHY_ADVISORY_ALREADY_RE =
  /poco\s+saludable|no\s+es\s+un\s+alimento\s+saludable|no\s+son\s+alimentos\s+saludables|unhealthy|not\s+a\s+healthy|not\s+healthy|peu\s+sain|n'est\s+pas\s+un\s+aliment\s+sain|pouco\s+saud[aá]vel|n[aã]o\s+[eé]\s+um\s+alimento\s+saud[aá]vel|ungesund|kein\s+gesundes|ultraproces|ultra[\s-]?process/i;

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
 * Garantiza aviso de poco saludable si la heurística lo detecta y Gemini no lo dijo.
 */
export function ensureUnhealthyIngredientAdvisory(input: {
  existingAdvisory?: string | null;
  ingredientNames: string[];
  locale?: unknown;
}): string | undefined {
  const existing =
    typeof input.existingAdvisory === "string" && input.existingAdvisory.trim().length > 0
      ? input.existingAdvisory.trim()
      : undefined;

  if (existing && UNHEALTHY_ADVISORY_ALREADY_RE.test(existing)) {
    return existing;
  }

  const fallback = buildUnhealthyIngredientsAdvisory(input.ingredientNames, input.locale);
  return mergeAdvisoryNotes(existing, fallback);
}

/**
 * Instrucción Gemini: generar receta + avisar si hay comida poco saludable.
 */
export function buildUnhealthyIngredientWarningPromptClause(): string {
  return (
    "REGLA AVISO ALIMENTO POCO SALUDABLE (obligatoria): " +
    "Si ALGÚN ingrediente del usuario (seleccionado manualmente o detectado en la imagen) es ultraprocesado, " +
    "muy calórico o poco saludable (ej. bacon, beicon, salchichas, embutidos grasos, nuggets, pizza industrial, " +
    "hamburguesa ultraprocesada, patatas fritas, chips, refrescos, alcohol, dulces industriales, frituras abundantes), " +
    "DEBES: (1) GENERAR igualmente las 3 recetas usando ese alimento — NO lo trates como NOT_FOOD, SÍ es comida; " +
    "(2) rellenar advertencia_ingredientes con un aviso claro en el idioma de salida que NOMBRE el/los alimento(s) " +
    "poco saludable(s) (ej. 'Ten en cuenta: el bacon no es un alimento saludable; generamos la receta porque lo pediste.'); " +
    "(3) puedes sugerir un ajuste más ligero en tip_sandra, pero SIN eliminar el ingrediente del usuario. " +
    "Si todos los ingredientes son razonablemente saludables, advertencia_ingredientes debe ser \"\".\n\n"
  );
}
