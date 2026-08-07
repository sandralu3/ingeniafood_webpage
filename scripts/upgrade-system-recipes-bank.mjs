/**
 * Genera la migración SQL del banco de recetas sistema (contenido premium + imágenes verificadas).
 * Uso: node scripts/upgrade-system-recipes-bank.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(
  ROOT,
  "supabase/migrations/20260807160000_upgrade_system_recipes_premium_content.sql"
);

/** @typedef {{
 *  id: string;
 *  title: string;
 *  description: string;
 *  imageUrl: string;
 *  ingredients: { name: string; quantity: string }[];
 *  steps: string[];
 *  tipSandra: string;
 *  cookingTime: number;
 *  mealType: string;
 *  servings: number;
 *  complexity: string;
 *  isAirfryer: boolean;
 *  isFlourless: boolean;
 *  macros: { calories: number; protein: number; carbs: number; fat: number };
 *  tags: string[];
 * }} SystemRecipe */

/** @type {SystemRecipe[]} */
const recipes = [
  {
    id: "a1000001-0000-4000-8000-000000000001",
    title: "Yogur griego con frutos rojos y chía",
    description:
      "Desayuno proteico, cremoso y sin azúcar añadido: yogur griego natural, frutos rojos frescos y chía para fibra y saciedad.",
    imageUrl:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80",
    ingredients: [
      { name: "yogur griego natural (sin azúcar)", quantity: "200 g" },
      { name: "fresas o mix de frutos rojos", quantity: "100 g" },
      { name: "semillas de chía", quantity: "1 cda (10 g)" },
      { name: "almendras laminadas", quantity: "10 g" },
      { name: "canela en polvo", quantity: "1 pizca" },
      { name: "vainilla (opcional)", quantity: "2-3 gotas" }
    ],
    steps: [
      "Saca el yogur de la nevera un par de minutos para que esté cremoso. Pon 200 g en un bol o vasito de cristal hondo.",
      "Si usas vainilla, mézclala con el yogur con una cucharita hasta integrar (así el sabor se reparte mejor que si la echas encima).",
      "Lava los frutos rojos, sécalos con papel de cocina y córtalos en trozos pequeños (las fresas, en daditos de 1 cm). Resérvalos.",
      "Espolvorea la cucharada de chía sobre el yogur y remueve 10-15 segundos. Deja reposar 2-3 minutos: la chía absorbe líquido y espesa un poco la textura.",
      "Distribuye los frutos rojos encima formando una capa generosa. Espolvorea la pizca de canela y las almendras laminadas.",
      "Sirve al momento. Si prefieres más cremosidad, deja la chía 5 minutos extra antes de añadir la fruta."
    ],
    tipSandra:
      "Si te apetece más dulzor natural, machaca 2-3 frambuesas contra el yogur antes de montar: endulza sin azúcar añadido y queda de color rosa suave.",
    cookingTime: 8,
    mealType: "desayuno",
    servings: 1,
    complexity: "facil",
    isAirfryer: false,
    isFlourless: true,
    macros: { calories: 290, protein: 23, carbs: 20, fat: 12 },
    tags: ["desayuno", "sin_azucar", "sin_harinas", "alto_proteina"]
  },
  {
    id: "a1000001-0000-4000-8000-000000000002",
    title: "Tortilla de claras con espinacas",
    description:
      "Desayuno alto en proteína, ligero y sin harinas: claras cuajadas con espinacas salteadas al momento.",
    imageUrl: "https://www.themealdb.com/images/media/meals/yvpuuy1511797244.jpg",
    ingredients: [
      { name: "claras de huevo", quantity: "4 uds (aprox. 120 g)" },
      { name: "espinacas frescas", quantity: "60 g" },
      { name: "aceite de oliva virgen extra", quantity: "1 cdita" },
      { name: "sal marina", quantity: "al gusto" },
      { name: "pimienta negra molida", quantity: "al gusto" },
      { name: "ajo (opcional)", quantity: "1/2 diente" }
    ],
    steps: [
      "Batir las 4 claras en un cuenco con un tenedor o varillas durante 20-30 segundos, hasta que estén homogéneas y un poco espumosas. Añade una pizca de sal.",
      "Lava las espinacas y escúrrelas bien. Si las hojas son grandes, córtalas a tiras gruesas para que se reduzcan de forma uniforme.",
      "Calienta la cdita de aceite en una sartén antiadherente a fuego medio (ni muy bajo ni fuerte). Si usas ajo, pícalo fino y sofríe 20-30 segundos hasta que perfume, sin que se queme.",
      "Añade las espinacas a la sartén. Remueve 1-2 minutos hasta que se ablanden y reduzcan a la mitad, con un verde brillante (no las dejes negras ni aguadas).",
      "Baja a fuego medio-bajo. Reparte las espinacas por la sartén y vierte las claras batidas encima, inclinando la sartén para que cubran toda la superficie.",
      "Cuaja sin remover 2-3 minutos, hasta que los bordes estén cuajados y el centro aún un poco cremoso. Si quieres más firme, tapa 30-40 segundos.",
      "Despega con una espátula flexible, dobla por la mitad como una tortilla francesa y sirve al momento con pimienta recién molida."
    ],
    tipSandra:
      "Si quieres más saciedad sin perder el perfil ligero, añade 1 yema a las claras: crece la cremosidad y apenas sube el tiempo de cuajado.",
    cookingTime: 12,
    mealType: "desayuno",
    servings: 1,
    complexity: "facil",
    isAirfryer: false,
    isFlourless: true,
    macros: { calories: 165, protein: 25, carbs: 3, fat: 5 },
    tags: ["desayuno", "alto_proteina", "sin_harinas"]
  },
  {
    id: "a1000001-0000-4000-8000-000000000003",
    title: "Bowl de quinoa, pollo y verduras",
    description:
      "Almuerzo completo y equilibrado: quinoa esponjosa, pollo jugoso a la plancha y verduras salteadas con aliño de limón.",
    imageUrl: "https://www.themealdb.com/images/media/meals/k29viq1585565980.jpg",
    ingredients: [
      { name: "quinoa cocida (o 40 g en seco)", quantity: "120 g cocida" },
      { name: "pechuga de pollo", quantity: "150 g" },
      { name: "calabacín", quantity: "1/2 ud" },
      { name: "pimiento rojo", quantity: "1/2 ud" },
      { name: "aceite de oliva virgen extra", quantity: "1 cda" },
      { name: "limón (zumo)", quantity: "1 cda" },
      { name: "sal, pimienta y orégano", quantity: "al gusto" }
    ],
    steps: [
      "Si partes de quinoa seca: enjuágala bajo el grifo, cuécela 1:2 con agua a fuego medio 12-15 min hasta que se abran los gérmenes, y deja reposar tapada 5 min. Si ya está cocida, simplemente caliéntala.",
      "Sala y pimienta la pechuga por ambos lados. Calienta media cucharada de aceite en una plancha o sartén a fuego medio-alto.",
      "Cocina el pollo 4-5 minutos por cada lado, hasta que el exterior esté dorado y al cortar el centro no quede rosado (o 74 °C internos). Retira y deja reposar 2 minutos antes de cortar en tiras.",
      "Corta el calabacín y el pimiento en medias lunas o dados de 1,5 cm. En la misma sartén, añade el resto del aceite y saltea las verduras 5-6 minutos a fuego medio, removiendo, hasta que estén tiernas pero aún con un poco de bocado.",
      "Monta el bowl: base de quinoa, encima las verduras y las tiras de pollo. Espolvorea orégano.",
      "Aliña con el zumo de limón y un hilito de aceite si hace falta. Prueba la sal y sirve templado."
    ],
    tipSandra:
      "Cocina un bote de quinoa el domingo: aguanta 3 días en nevera y montas bowls express en menos de 10 minutos entre semana.",
    cookingTime: 30,
    mealType: "almuerzo",
    servings: 1,
    complexity: "intermedio",
    isAirfryer: false,
    isFlourless: true,
    macros: { calories: 430, protein: 38, carbs: 34, fat: 14 },
    tags: ["almuerzo", "bowl", "sin_harinas"]
  },
  {
    id: "a1000001-0000-4000-8000-000000000004",
    title: "Ensalada de salmón y aguacate",
    description:
      "Almuerzo fresco rico en omega-3: salmón, aguacate cremoso, hojas verdes y un aliño suave de aceite y limón.",
    imageUrl: "https://www.themealdb.com/images/media/meals/1549542994.jpg",
    ingredients: [
      { name: "salmón cocido, a la plancha o ahumado", quantity: "120 g" },
      { name: "aguacate maduro", quantity: "1/2 ud" },
      { name: "rúcula o mix de hojas", quantity: "80 g" },
      { name: "tomate cherry", quantity: "8 uds" },
      { name: "aceite de oliva virgen extra", quantity: "1 cda" },
      { name: "zumo de limón o vinagre de manzana", quantity: "1 cdita" },
      { name: "sal y pimienta", quantity: "al gusto" }
    ],
    steps: [
      "Lava las hojas con agua fría y sécalas muy bien (centrifugadora o papel de cocina): si quedan mojadas, el aliño no se adhiere y la ensalada se aguada.",
      "Corta los tomates cherry por la mitad. Pela el medio aguacate, retira el hueso y córtalo en láminas o daditos de 1 cm justo antes de montar (así no se oxida).",
      "Si el salmón es a la plancha: cocina 3-4 min por lado a fuego medio hasta que esté opaco y jugoso; deja templar y desmenúzalo en trozos grandes. Si es ahumado, desmenúzalo directamente.",
      "En un bol ancho, coloca las hojas como base. Reparte tomate, aguacate y el salmón por encima sin aplastar.",
      "Prepara el aliño: mezcla en un vasito el aceite, el limón o vinagre, una pizca de sal y pimienta. Emulsiona con un tenedor 10 segundos.",
      "Riega la ensalada con el aliño justo al servir, remueve con suavidad dos veces y emplata. Listo en el momento."
    ],
    tipSandra:
      "Si usas salmón ahumado, reduce la sal del aliño: ya aporta sabor. Unas semillas de sésamo tostadas dan crunch sin harinas.",
    cookingTime: 15,
    mealType: "almuerzo",
    servings: 1,
    complexity: "facil",
    isAirfryer: false,
    isFlourless: true,
    macros: { calories: 390, protein: 28, carbs: 10, fat: 26 },
    tags: ["almuerzo", "ensalada", "sin_harinas"]
  },
  {
    id: "a1000001-0000-4000-8000-000000000005",
    title: "Salmón al horno con limón y tomate",
    description:
      "Cena ligera y aromática: salmón jugoso al horno con tomates cherry, limón y eneldo, sin harinas ni frituras.",
    imageUrl: "https://www.themealdb.com/images/media/meals/1548772327.jpg",
    ingredients: [
      { name: "lomos de salmón", quantity: "180 g (1-2 piezas)" },
      { name: "tomates cherry", quantity: "120 g (en rama si puedes)" },
      { name: "limón", quantity: "1 ud (rodajas + zumo)" },
      { name: "aceite de oliva virgen extra", quantity: "1 cda" },
      { name: "eneldo fresco o seco", quantity: "1 cdita" },
      { name: "sal y pimienta negra", quantity: "al gusto" },
      { name: "mix de hojas o lombarda fina (opcional)", quantity: "40 g" }
    ],
    steps: [
      "Precalienta el horno a 200 °C. Coloca un trozo de papel de hornear sobre una bandeja o tabla apta: así el salmón no se pega y el emplatado queda limpio.",
      "Seca los lomos con papel de cocina. Úntalos con media cucharada de aceite, sal, pimienta y la mitad del eneldo. Coloca 2-3 rodajas finas de limón encima de cada pieza.",
      "Distribuye los tomates cherry alrededor (enteros, preferible en rama). Riega el resto del aceite y una pizca de sal. El calor los concentrará y quedarán dulces.",
      "Hornea 12-15 minutos. El salmón está listo cuando la carne pasa de traslúcida a opaca y se desmenuza en lascas con un tenedor, pero sigue jugosa en el centro (no lo dejes seco).",
      "Saca la bandeja y espolvorea el resto del eneldo. Exprime unas gotas de limón fresco por encima justo al salir del horno.",
      "Sirve el salmón con los tomates asados. Si quieres más volumen verde, acompaña con un puñado de hojas o lombarda fina aliñada con una gota de aceite (opcional)."
    ],
    tipSandra:
      "En airfryer a 180 °C: 8-10 minutos según el grosor. El truco es no pasarse de tiempo: el salmón sigue cuajando 1 minuto fuera del calor.",
    cookingTime: 20,
    mealType: "cena",
    servings: 1,
    complexity: "facil",
    isAirfryer: true,
    isFlourless: true,
    macros: { calories: 360, protein: 34, carbs: 6, fat: 22 },
    tags: ["cena", "pescado", "airfryer", "sin_harinas"]
  },
  {
    id: "a1000001-0000-4000-8000-000000000006",
    title: "Salteado de pollo y verduras",
    description:
      "Cena exprés alta en proteína: tiras de pollo doradas con verduras al wok, pimentón y un final de limón.",
    imageUrl: "https://www.themealdb.com/images/media/meals/el64dy1763483009.jpg",
    ingredients: [
      { name: "pechuga de pollo en tiras", quantity: "150 g" },
      { name: "calabacín", quantity: "1 ud mediana" },
      { name: "cebolla", quantity: "1/4 ud" },
      { name: "pimiento (rojo o verde)", quantity: "1/2 ud" },
      { name: "aceite de oliva virgen extra", quantity: "1 cda" },
      { name: "pimentón dulce", quantity: "1/2 cdita" },
      { name: "sal y pimienta", quantity: "al gusto" }
    ],
    steps: [
      "Corta el pollo en tiras delgadas de 1 cm. Sala y pimienta. Corta el calabacín en medias lunas, la cebolla en juliana fina y el pimiento en tiras.",
      "Calienta la sartén o wok a fuego medio-alto con media cucharada de aceite hasta que brille (unos 30 segundos).",
      "Saltea el pollo 3-4 minutos removiendo, hasta que esté dorado por fuera y cocido por dentro. Retíralo a un plato para no sobrecocinarlo.",
      "Añade el resto del aceite a la sartén. Sofríe cebolla y pimiento 2 minutos. Incorpora el calabacín y cocina 3-4 minutos más a fuego medio, hasta que esté tierno pero firme.",
      "Devuelve el pollo a la sartén. Espolvorea el pimentón, remueve 30-40 segundos (el pimentón no debe quemarse) y ajusta sal.",
      "Apaga el fuego, remata con un chorrito de limón si te gusta y sirve inmediatamente, bien caliente."
    ],
    tipSandra:
      "El secreto del salteado es no sobrecargar la sartén: si echas demasiada verdura de golpe, se cuece en vez de dorarse. Mejor dos tandas rápidas.",
    cookingTime: 18,
    mealType: "cena",
    servings: 1,
    complexity: "facil",
    isAirfryer: false,
    isFlourless: true,
    macros: { calories: 300, protein: 35, carbs: 10, fat: 12 },
    tags: ["cena", "salteado", "sin_harinas"]
  },
  {
    id: "a1000001-0000-4000-8000-000000000007",
    title: "Hummus casero con crudités",
    description:
      "Snack salado sin pan: hummus cremoso de garbanzo y tahini con bastones de zanahoria y pepino crujientes.",
    imageUrl: "https://www.themealdb.com/images/media/meals/gpon5u1763801180.jpg",
    ingredients: [
      { name: "garbanzos cocidos (escurridos)", quantity: "150 g" },
      { name: "tahini", quantity: "1 cda" },
      { name: "zumo de limón", quantity: "1 cda" },
      { name: "aceite de oliva virgen extra", quantity: "1 cdita + chorrito al servir" },
      { name: "ajo", quantity: "1/2 diente (opcional)" },
      { name: "zanahoria", quantity: "1 ud" },
      { name: "pepino", quantity: "1/2 ud" },
      { name: "sal y comino", quantity: "al gusto" }
    ],
    steps: [
      "Escurre bien los garbanzos. Si quieres una textura más fina, retira algunas pieles frotándolos entre los dedos (opcional pero marca diferencia).",
      "En el vaso de la batidora, pon garbanzos, tahini, limón, aceite, ajo (si lo usas), una pizca de sal y de comino.",
      "Tritura 30-45 segundos. Si está demasiado denso, añade 1-2 cucharadas de agua fría y vuelve a triturar hasta obtener una crema sedosa, sin grumos.",
      "Prueba y ajusta: más limón si quieres acidez, más sal si falta sabor, más agua si lo prefieres untuoso para mojar.",
      "Pela la zanahoria y córtala en bastones de 8-10 cm. Lava el pepino y córtalo igual (puedes dejar la piel).",
      "Sirve el hummus en un cuenco, haz un surco con la cuchara, un chorrito de aceite por encima y acompaña con las crudités."
    ],
    tipSandra:
      "Guarda el hummus en un táper 3 días en nevera. Si espesa, remueve con una cucharadita de agua o limón antes de servir.",
    cookingTime: 12,
    mealType: "snack",
    servings: 1,
    complexity: "facil",
    isAirfryer: false,
    isFlourless: true,
    macros: { calories: 230, protein: 9, carbs: 20, fat: 12 },
    tags: ["snack", "sin_azucar", "sin_harinas"]
  },
  {
    id: "a1000001-0000-4000-8000-000000000008",
    title: "Manzana con crema de almendras",
    description:
      "Snack dulce natural: rodajas de manzana crujiente con crema de almendras 100% y un toque de canela, sin azúcar añadido.",
    imageUrl:
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80",
    ingredients: [
      { name: "manzana (preferible fuji o golden)", quantity: "1 ud mediana" },
      { name: "crema de almendras 100%", quantity: "1 cda (15 g)" },
      { name: "canela en polvo", quantity: "1 pizca" },
      { name: "zumo de limón (opcional)", quantity: "unas gotas" }
    ],
    steps: [
      "Lava bien la manzana. Si no es ecológica, puedes pelarla; si lo es, deja la piel (aporta fibra y crunch).",
      "Córtala en rodajas de 0,5-0,7 cm. Si no las vas a comer al momento, rocía unas gotas de limón para que no se oxiden.",
      "Extiende una capa fina de crema de almendras sobre cada rodaja (o sirve la cucharada en el centro del plato para mojar).",
      "Espolvorea la pizca de canela por encima. Sirve al momento, mientras la manzana sigue crujiente."
    ],
    tipSandra:
      "Elige crema de frutos secos cuyo único ingrediente sea el fruto seco. Si la lista lleva azúcares o aceites añadidos, no es el mismo snack.",
    cookingTime: 5,
    mealType: "snack",
    servings: 1,
    complexity: "facil",
    isAirfryer: false,
    isFlourless: true,
    macros: { calories: 195, protein: 5, carbs: 22, fat: 10 },
    tags: ["snack", "sin_azucar", "sin_harinas"]
  },
  {
    id: "a1000001-0000-4000-8000-000000000009",
    title: "Mousse de cacao y aguacate",
    description:
      "Postre cremoso sin azúcar refinado ni harinas: aguacate maduro, cacao puro y dátiles para un dulzor natural.",
    imageUrl: "https://www.themealdb.com/images/media/meals/uttuxy1511382180.jpg",
    ingredients: [
      { name: "aguacate maduro", quantity: "1 ud (aprox. 150 g de pulpa)" },
      { name: "cacao puro en polvo", quantity: "2 cdas" },
      { name: "dátiles sin hueso", quantity: "2-3 uds" },
      { name: "leche de almendras sin azúcar", quantity: "3-4 cdas" },
      { name: "esencia de vainilla", quantity: "1/2 cdita" },
      { name: "pizca de sal", quantity: "1 toque" }
    ],
    steps: [
      "Si los dátiles están duros, cúbrelos con agua caliente 5-8 minutos y escúrrelos: así se trituran sin grumos.",
      "Abre el aguacate, retira el hueso y saca toda la pulpa a un vaso de batidora. Debe estar maduro (cede al tacto) para una mousse sedosa.",
      "Añade cacao, dátiles, leche de almendras, vainilla y la pizca de sal.",
      "Tritura 45-60 segundos, raspando los bordes a mitad, hasta obtener una crema homogénea, brillante y sin trozos de dátil.",
      "Prueba: si quieres más chocolate, 1/2 cda más de cacao; si está densa, 1 cda más de leche de almendras.",
      "Reparte en 2 vasitos. Enfría en nevera mínimo 20 minutos (mejor 40): cuaja un poco y el sabor se redondea. Sirve fría."
    ],
    tipSandra:
      "Cuanto más maduro el aguacate, más sedosa queda. Unas frambuesas encima aportan acidez y color sin azúcar añadido.",
    cookingTime: 20,
    mealType: "postre",
    servings: 2,
    complexity: "facil",
    isAirfryer: false,
    isFlourless: true,
    macros: { calories: 210, protein: 4, carbs: 18, fat: 15 },
    tags: ["postre", "sin_azucar", "sin_harinas"]
  },
  {
    id: "a1000001-0000-4000-8000-00000000000a",
    title: "Bolitas energéticas de dátil y cacao",
    description:
      "Bocados dulces naturales: dátil, almendra y cacao, sin harinas ni azúcar añadido. Ideales para antojo o postre ligero.",
    imageUrl: "https://www.themealdb.com/images/media/meals/dg7tad1782588053.jpg",
    ingredients: [
      { name: "dátiles Medjool sin hueso", quantity: "8 uds (aprox. 120 g)" },
      { name: "almendras crudas", quantity: "60 g" },
      { name: "cacao puro en polvo", quantity: "1 cda + extra para rebozar" },
      { name: "coco rallado sin azúcar (opcional)", quantity: "2 cdas" },
      { name: "pizca de sal", quantity: "1 toque" }
    ],
    steps: [
      "Comprueba que los dátiles no tengan hueso. Si están secos, hidrátalos 5 minutos en agua caliente y escúrrelos muy bien (exceso de agua = masa pegajosa).",
      "Tritura las almendras en un robot o picadora a pulsos 15-20 segundos, hasta obtener un polvo grueso (no mantequilla).",
      "Añade los dátiles, la cucharada de cacao y la pizca de sal. Tritura a pulsos hasta formar una pasta que se pegue al apretar entre los dedos. Si está seca, 1 cucharadita de agua; si está blanda, 1 cucharadita más de almendra.",
      "Con las manos ligeramente húmedas, forma 8 bolitas del tamaño de una nuez, compactándolas bien para que no se deshagan.",
      "Reboza cada bolita en cacao en polvo o coco rallado, girándola para cubrir toda la superficie.",
      "Colócalas en un plato y refrigera 20-30 minutos (o congela 10 minutos) para que firmes. Guarda en nevera hasta 5 días."
    ],
    tipSandra:
      "Congélalas: sacas 1-2 unidades cuando apetezca algo dulce. Puedes rebozar unas en cacao, otras en coco rallado: quedan de fiesta y sin azúcar añadido.",
    cookingTime: 20,
    mealType: "postre",
    servings: 8,
    complexity: "facil",
    isAirfryer: false,
    isFlourless: true,
    macros: { calories: 95, protein: 2, carbs: 12, fat: 5 },
    tags: ["postre", "snack", "sin_azucar", "sin_harinas"]
  }
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function instructionsFromSteps(steps) {
  return steps.map((step, i) => `${i + 1}) ${step}`).join(" ");
}

const lines = [];
lines.push("-- Banco sistema: textos estilo IngeniaFood (pasos detallados) + imagenes verificadas.");
lines.push("-- Ejecutar en SQL Editor si el entorno no aplica migraciones automaticamente.");
lines.push("");

for (const recipe of recipes) {
  const ingredientsJson = JSON.stringify(recipe.ingredients);
  const stepsJson = JSON.stringify(recipe.steps);
  const macrosJson = JSON.stringify(recipe.macros);
  const tagsJson = JSON.stringify(recipe.tags);
  const instructions = instructionsFromSteps(recipe.steps);

  lines.push(`-- ${recipe.title}`);
  lines.push(`update public.recipes set`);
  lines.push(`  title = ${sqlString(recipe.title)},`);
  lines.push(`  description = ${sqlString(recipe.description)},`);
  lines.push(`  image_url = ${sqlString(recipe.imageUrl)},`);
  lines.push(`  ingredients = ${sqlString(ingredientsJson)}::jsonb,`);
  lines.push(`  steps = ${sqlString(stepsJson)}::jsonb,`);
  lines.push(`  instructions = ${sqlString(instructions)},`);
  lines.push(`  tip_sandra = ${sqlString(recipe.tipSandra)},`);
  lines.push(`  cooking_time = ${recipe.cookingTime},`);
  lines.push(`  meal_type = ${sqlString(recipe.mealType)},`);
  lines.push(`  servings = ${recipe.servings},`);
  lines.push(`  complexity = ${sqlString(recipe.complexity)},`);
  lines.push(`  is_airfryer = ${recipe.isAirfryer},`);
  lines.push(`  is_flourless = ${recipe.isFlourless},`);
  lines.push(`  is_system_recipe = true,`);
  lines.push(`  is_public = false,`);
  lines.push(`  es_instagram = false,`);
  lines.push(`  macros = ${sqlString(macrosJson)}::jsonb,`);
  lines.push(`  tags = ${sqlString(tagsJson)}::jsonb,`);
  lines.push(`  updated_at = now()`);
  lines.push(`where id = '${recipe.id}'::uuid;`);
  lines.push("");
}

writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${OUT} (${recipes.length} recipes)`);
