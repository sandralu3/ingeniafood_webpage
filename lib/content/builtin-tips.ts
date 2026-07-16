import type { AppLocale } from "@/i18n/config";
import type { HealthyTip } from "@/lib/content/tips-cache";

const BUILTIN_TIPS: Record<AppLocale, string[]> = {
  es: [
    "Sustituye la harina de trigo por harina de almendras o coco para lograr texturas increíbles en tus panqueques sin alterar tu índice glucémico.",
    "Para un snack salado rápido, tuesta semillas de calabaza y girasol en una sartén sin aceite con una pizca de curry en polvo y sal marina.",
    "Añade un puñado de espinacas o rúcula al final de casi cualquier salteado: apenas se cocinan y suman fibra y micronutrientes.",
    "Cocina proteínas a fuego medio-alto y deja reposar un minuto antes de servir para que los jugos se redistribuyan.",
    "Prepara un batch de verduras asadas el domingo: agilizan bowls, tortillas y cenas de entre semana.",
    "Usa yogur natural o kéfir en lugar de cremas pesadas para salsas frescas con más proteína.",
    "Congela hierbas frescas picadas en cubitos de aceite de oliva: tendrás aroma listo sin desperdiciar el manojo.",
    "Empieza el día con proteína (huevo, yogur, legumbres): ayuda a mantener la saciedad y estabilizar la energía."
  ],
  en: [
    "Swap wheat flour for almond or coconut flour to get great pancake texture without spiking your glycemic load.",
    "For a quick savory snack, toast pumpkin and sunflower seeds in a dry pan with a pinch of curry powder and sea salt.",
    "Toss in a handful of spinach or arugula at the end of almost any stir-fry — they barely cook and add fiber and micronutrients.",
    "Cook proteins over medium-high heat and let them rest a minute before serving so the juices redistribute.",
    "Batch-roast vegetables on Sunday to speed up bowls, omelets, and weeknight dinners.",
    "Use plain yogurt or kefir instead of heavy cream for fresher sauces with more protein.",
    "Freeze chopped fresh herbs in olive-oil ice cubes so you always have aroma ready without wasting the bunch.",
    "Start the day with protein (eggs, yogurt, legumes) to stay fuller longer and keep energy steadier."
  ],
  fr: [
    "Remplace la farine de blé par de la farine d’amande ou de coco pour des pancakes savoureux sans faire grimper ta charge glycémique.",
    "Pour un encas salé rapide, torréfie des graines de courge et de tournesol à sec avec une pincée de curry et de sel marin.",
    "Ajoute une poignée d’épinards ou de roquette en fin de cuisson à presque tous tes sautés : elles cuisent à peine et apportent fibres et micronutriments.",
    "Cuire les protéines à feu moyen-vif et laisse-les reposer une minute avant de servir pour que les jus se redistribuent.",
    "Prépare un batch de légumes rôtis le dimanche : ils accélèrent bowls, omelettes et dîners de semaine.",
    "Utilise du yaourt nature ou du kéfir à la place des crèmes lourdes pour des sauces fraîches plus riches en protéines.",
    "Congèle des herbes fraîches ciselées dans des glaçons d’huile d’olive : tu auras l’arôme prêt sans gâcher la botte.",
    "Commence la journée avec des protéines (œuf, yaourt, légumineuses) pour rester rassasié plus longtemps et stabiliser ton énergie."
  ],
  pt: [
    "Substitui a farinha de trigo por farinha de amêndoa ou de coco para panquecas com ótima textura sem disparar a carga glicémica.",
    "Para um snack salgado rápido, tosta sementes de abóbora e girassol numa frigideira sem óleo com uma pitada de caril e sal marinho.",
    "Junta um punhado de espinafres ou rúcula no final de quase qualquer salteado: mal cozem e acrescentam fibra e micronutrientes.",
    "Cozinha as proteínas em lume médio-alto e deixa repousar um minuto antes de servir para os sucos se redistribuírem.",
    "Prepara um batch de legumes assados ao domingo: agilizam bowls, omeletes e jantares da semana.",
    "Usa iogurte natural ou kefir em vez de natas pesadas para molhos frescos com mais proteína.",
    "Congela ervas frescas picadas em cubos de azeite: terás aroma pronto sem desperdiçar o molho.",
    "Começa o dia com proteína (ovo, iogurte, leguminosas): ajuda a manter a saciedade e a estabilizar a energia."
  ],
  de: [
    "Tausche Weizenmehl gegen Mandel- oder Kokosmehl für tolle Pancake-Textur ohne hohen glykämischen Load.",
    "Für einen schnellen herzhaften Snack röstest du Kürbis- und Sonnenblumenkerne ohne Öl mit einer Prise Curry und Meersalz.",
    "Gib am Ende fast jedes Pfannengerichts eine Handvoll Spinat oder Rucola dazu — sie garen kaum und liefern Ballaststoffe und Mikronährstoffe.",
    "Gar Proteine bei mittlerer bis hoher Hitze und lass sie eine Minute ruhen, damit sich die Säfte verteilen.",
    "Bereite sonntags eine Portion Ofengemüse vor: Das beschleunigt Bowls, Omeletts und Wochentagsessen.",
    "Nimm Naturjoghurt oder Kefir statt schwerer Sahne für frischere Saucen mit mehr Protein.",
    "Friere gehackte frische Kräuter in Olivenöl-Eiswürfeln ein: Du hast Aroma bereit, ohne das Bund zu verschwenden.",
    "Starte den Tag mit Protein (Ei, Joghurt, Hülsenfrüchte), um länger satt zu bleiben und die Energie stabiler zu halten."
  ]
};

/** Tips embebidos cuando no hay filas en BD para ese idioma. */
export function getBuiltinHealthyTips(locale: AppLocale): HealthyTip[] {
  const contents = BUILTIN_TIPS[locale] ?? BUILTIN_TIPS.es;
  const now = new Date().toISOString();

  return contents.map((contenido, index) => ({
    id: `builtin-${locale}-${index}`,
    contenido,
    creado_at: now,
    language: locale
  }));
}

export function getWeeklySandraTip(locale: AppLocale): string {
  return (BUILTIN_TIPS[locale] ?? BUILTIN_TIPS.es)[0] ?? BUILTIN_TIPS.es[0];
}
