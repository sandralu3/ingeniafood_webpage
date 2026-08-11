/** Letras (incl. acentos ES), números, espacios, guion y apóstrofo. Compatible con target ES5. */
const LETTER_CHARS = "a-zA-ZáéíóúÁÉÍÓÚñÑüÜ";
const ALLOWED_CHARS = new RegExp(`^[${LETTER_CHARS}0-9\\s'\\-]+$`);
const ONLY_LETTERS = new RegExp(`[^${LETTER_CHARS}]`, "g");
const HAS_VOWEL = /[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]/;

/** Utensilios / aparatos / no comida (también usados en ranking de frecuentes). */
export const NON_FOOD_APPLIANCE_RE =
  /\b(?:air\s*fryer|airfryer|freidora|horno|microondas|batidora|licuadora|sarten|sartén|olla|robot|nevera|refrigerador|lavavajillas|cuchillo|tenedor|plato|vaso)\b|\btaza\b(?!\s+de)/i;

/**
 * Nombres / tokens que NO son alimentos (persona de la app, nombres propios comunes, basura).
 * Incluye "Sandra" (Tip de Sandra) para evitar recetas con personas como "ingrediente".
 */
const NON_FOOD_BLOCKLIST = new Set(
  [
    // App / coach
    "sandra",
    "tip de sandra",
    "tip sandra",
    "ingenia",
    "ingeniafood",
    "ingenia food",
    "chef sandra",
    // Nombres propios frecuentes (ES/EN) que no son comida
    "juan",
    "maria",
    "maría",
    "pedro",
    "ana",
    "luis",
    "carlos",
    "jose",
    "josé",
    "laura",
    "sofia",
    "sofía",
    "diego",
    "andrea",
    "pablo",
    "lucia",
    "lucía",
    "miguel",
    "carmen",
    "elena",
    "david",
    "daniel",
    "alejandro",
    "fernando",
    "patricia",
    "monica",
    "mónica",
    "raul",
    "raúl",
    "jorge",
    "alberto",
    "francisco",
    "antonio",
    "manuel",
    "jesus",
    "jesús",
    "javier",
    "sergio",
    "ruben",
    "rubén",
    "victor",
    "víctor",
    "adrian",
    "adrián",
    "natalia",
    "valentina",
    "camila",
    "isabella",
    "john",
    "mike",
    "michael",
    "sarah",
    "emily",
    "jessica",
    "chris",
    "alex",
    "sam",
    "tom",
    "bob",
    "alice",
    "kate",
    "mary",
    "james",
    "robert",
    "william",
    "emma",
    "olivia",
    "lisa",
    "kevin",
    "brian",
    "steve",
    "mark",
    "paul",
    "andrew",
    "jennifer",
    "elizabeth",
    "susan",
    "nancy",
    "karen",
    "betty",
    "helen",
    "sandra",
    // Basura / no comestible
    "test",
    "prueba",
    "asdf",
    "qwerty",
    "hola",
    "adios",
    "adiós",
    "nada",
    "ninguno",
    "ninguna",
    "usuario",
    "persona",
    "gente",
    "amigo",
    "amiga",
    "familia",
    "bebe",
    "bebé",
    "niño",
    "niña",
    "perro",
    "gato",
    "zapato",
    "zapatos",
    "camisa",
    "pantalon",
    "pantalón",
    "telefono",
    "teléfono",
    "movil",
    "móvil",
    "laptop",
    "ordenador",
    "computadora",
    "coche",
    "carro",
    "auto",
    "dinero",
    "bitcoin",
    // Objetos / no comida que el formato “parece” válido
    "mesa",
    "silla",
    "sofa",
    "sofá",
    "cama",
    "puerta",
    "ventana",
    "pared",
    "piso",
    "suelo",
    "techo",
    "piedra",
    "roca",
    "plastico",
    "plástico",
    "madera",
    "vidrio",
    "metal",
    "papel",
    "carton",
    "cartón",
    "boligrafo",
    "bolígrafo",
    "lapiz",
    "lápiz",
    "libro",
    "cuaderno",
    "llave",
    "llaves",
    "control",
    "remoto",
    "television",
    "televisión",
    "tv",
    "radio",
    "auriculares",
    "audifonos",
    "audífonos",
    "cargador",
    "cable",
    "mochila",
    "bolso",
    "cartera",
    "reloj",
    "anillo",
    "collar",
    "gafas",
    "lentes",
    "sombrero",
    "gorra",
    "chaqueta",
    "abrigo",
    "calcetin",
    "calcetín",
    "calcetines",
    "jabon",
    "jabón",
    "champu",
    "champú",
    "detergente",
    "lejia",
    "lejía",
    "cloro",
    "gasolina",
    "aceite de motor"
  ].map((item) => item.toLowerCase())
);

export function formatCustomIngredientName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function isValidCustomIngredientName(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 3) return false;
  if (!ALLOWED_CHARS.test(trimmed)) return false;

  const letters = trimmed.replace(ONLY_LETTERS, "").toLowerCase();
  if (letters.length < 3) return false;

  const uniqueLetters = new Set(letters);
  if (uniqueLetters.size < 2) return false;

  if (trimmed.length >= 4 && !HAS_VOWEL.test(trimmed)) {
    return false;
  }

  return true;
}

function normalizeIngredientKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True si el texto parece un alimento/condimento real (no persona, aparato ni basura). */
export function isLikelyEdibleIngredientName(value: string): boolean {
  if (!isValidCustomIngredientName(value)) return false;

  const key = normalizeIngredientKey(value);
  if (!key) return false;
  if (NON_FOOD_BLOCKLIST.has(key)) return false;
  if (NON_FOOD_APPLIANCE_RE.test(key)) return false;

  // "Tip de Sandra", "Receta de Juan", etc.
  if (/^(tip|receta|chef|coach|usuario|nombre)\b/.test(key)) return false;
  if (/\b(sandra|ingeniafood)\b/.test(key)) return false;

  return true;
}

export type InvalidIngredientHit = {
  name: string;
  reason: "format" | "non_food";
};

/** Devuelve los nombres de la lista que no son ingredientes comestibles válidos. */
export function findInvalidIngredientNames(names: string[]): InvalidIngredientHit[] {
  const hits: InvalidIngredientHit[] = [];
  const seen = new Set<string>();

  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = normalizeIngredientKey(name);
    if (seen.has(key)) continue;
    seen.add(key);

    if (!isValidCustomIngredientName(name)) {
      hits.push({ name, reason: "format" });
      continue;
    }
    if (!isLikelyEdibleIngredientName(name)) {
      hits.push({ name, reason: "non_food" });
    }
  }

  return hits;
}
