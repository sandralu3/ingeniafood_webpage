import { type AppLocale, DEFAULT_LOCALE, parseAppLocale } from "@/i18n/config";

/** Valores de etiquetas que deben permanecer fijos (UI/filtros). */
export const RECIPE_TAG_CANONICAL_VALUES = [
  "Sin Harinas",
  "Apto para Airfryer",
  "Alto en Proteína"
] as const;

function tagsClause(tagsList: string): string {
  return `etiquetas values MUST stay EXACTLY one of: ${tagsList} (never translate these tag strings). `;
}

/**
 * Instrucción de idioma para Gemini: el contenido de la receta
 * sale en el locale del usuario. Claves JSON y etiquetas canónicas estables.
 */
export function buildRecipeLanguagePromptClause(localeInput: unknown): string {
  const locale = parseAppLocale(localeInput, DEFAULT_LOCALE);
  const tagsList = RECIPE_TAG_CANONICAL_VALUES.map((tag) => `"${tag}"`).join(", ");

  switch (locale) {
    case "en":
      return (
        "OUTPUT LANGUAGE (mandatory): Write ALL user-facing recipe content in clear, natural English (US). " +
        "Includes: titulo, tiempo_preparacion (e.g. \"10 min\"), ingredientes_detallados, " +
        "ingredientes_estructurados.name, pasos_ordenados, tip_sandra, and advertencia_ingredientes. " +
        "JSON field NAMES must stay exactly as specified (do not translate keys). " +
        tagsClause(tagsList) +
        "Ingredient strings: use English with units g, kg, ml, l, tsp, tbsp, cup, piece; seasonings like \"Salt (to taste)\". " +
        "Do NOT mix other languages into titles, steps, tips, or ingredient names. " +
        "Tip tone: professional, warm, and motivating — Sandra’s expert advice in English.\n\n"
      );
    case "fr":
      return (
        "LANGUE DE SORTIE (obligatoire): Rédige TOUT le contenu visible de la recette en français naturel. " +
        "Inclut: titulo, tiempo_preparacion (ex. \"10 min\"), ingredientes_detallados, " +
        "ingredientes_estructurados.name, pasos_ordenados, tip_sandra et advertencia_ingredientes. " +
        "Les NOMS des champs JSON doivent rester exactement tels quels (ne pas traduire les clés). " +
        `Les valeurs de etiquetas DOIVENT être EXACTEMENT: ${tagsList} (ne jamais traduire ces étiquettes). ` +
        "Ingrédients: français avec unités g, kg, ml, l, c. à c., c. à s., tasse, pièce; \"Sel (selon le goût)\". " +
        "Ne mélange pas d'autres langues dans titres, étapes, conseils ou noms d'ingrédients. " +
        "Ton du tip Sandra: professionnel, chaleureux et motivant — en français.\n\n"
      );
    case "pt":
      return (
        "IDIOMA DE SAÍDA (obrigatório): Escreve TODO o conteúdo visível da receita em português natural (Portugal/Brasil, claro e profissional). " +
        "Inclui: titulo, tiempo_preparacion (ex. \"10 min\"), ingredientes_detallados, " +
        "ingredientes_estructurados.name, pasos_ordenados, tip_sandra e advertencia_ingredientes. " +
        "Os NOMES dos campos JSON devem permanecer exatamente como indicados (não traduzas as chaves). " +
        `Os valores de etiquetas DEVEM ser EXATAMENTE: ${tagsList} (nunca traduzas estas etiquetas). ` +
        "Ingredientes: português com unidades g, kg, ml, l, c. de chá, c. de sopa, chávena, un.; \"Sal (a gosto)\". " +
        "Não mistures outras línguas em títulos, passos, dicas ou nomes de ingredientes. " +
        "Tom do tip Sandra: profissional, próximo e motivador — em português.\n\n"
      );
    case "de":
      return (
        "AUSGABESPRACHE (verpflichtend): Schreibe den GESAMTEN sichtbaren Rezeptinhalt in klarem, natürlichem Deutsch. " +
        "Betrifft: titulo, tiempo_preparacion (z. B. \"10 min\"), ingredientes_detallados, " +
        "ingredientes_estructurados.name, pasos_ordenados, tip_sandra und advertencia_ingredientes. " +
        "JSON-FeldNAMEN müssen unverändert bleiben (Schlüssel nicht übersetzen). " +
        `etiquetas-Werte MÜSSEN EXAKT sein: ${tagsList} (diese Tags niemals übersetzen). ` +
        "Zutaten: Deutsch mit Einheiten g, kg, ml, l, TL, EL, Tasse, Stück; Würzung wie \"Salz (nach Geschmack)\". " +
        "Keine anderen Sprachen in Titeln, Schritten, Tipps oder Zutatennamen mischen. " +
        "Ton des Sandra-Tipps: professionell, warm und motivierend — auf Deutsch.\n\n"
      );
    case "es":
    default:
      return (
        "IDIOMA DE SALIDA (obligatorio): Escribe TODO el contenido de la receta en español natural. " +
        "Incluye: titulo, tiempo_preparacion (ej. \"10 min\"), ingredientes_detallados, " +
        "ingredientes_estructurados.name, pasos_ordenados, tip_sandra y advertencia_ingredientes. " +
        "Los NOMBRES de campos JSON deben permanecer exactamente como se indican (no traduzcas las claves). " +
        `Los valores de etiquetas DEBEN ser EXACTAMENTE: ${tagsList} (no inventes otras). ` +
        "Ingredientes: usa unidades g, kg, ml, l, cdita, cda, taza, ud; condimentos como \"Sal (al gusto)\". " +
        "No mezcles otros idiomas en títulos, pasos, tips ni nombres de ingredientes. " +
        "Tip de Sandra: tono profesional, cercano y motivador en español.\n\n"
      );
  }
}

export function resolveRecipeGenerationLocale(options: {
  bodyLocale?: unknown;
  cookieLocale?: unknown;
}): AppLocale {
  if (options.bodyLocale != null && String(options.bodyLocale).trim()) {
    return parseAppLocale(options.bodyLocale, DEFAULT_LOCALE);
  }
  return parseAppLocale(options.cookieLocale, DEFAULT_LOCALE);
}
