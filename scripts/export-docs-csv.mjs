import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs", "exports");
mkdirSync(out, { recursive: true });

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function write(name, headers, rows) {
  writeFileSync(join(out, name), toCsv(headers, rows), "utf8");
  console.log(`OK ${name} (${rows.length})`);
}

const pantallas = [
  {
    id: "SCR-LAND",
    area: "Marketing",
    nombre: "Landing web",
    ruta: "/",
    tipo: "Página",
    nav: "No",
    auth: "Pública",
    premium: "N/A",
    descripcion: "Marketing, guía gratis, idioma, CTA a la app",
    funcionalidad: "Presentar producto; descargar guía; ir a /descargar-app"
  },
  {
    id: "SCR-DESK",
    area: "Marketing",
    nombre: "Optimizado para móviles",
    ruta: "/desktop-app-recetas",
    tipo: "Página",
    nav: "No",
    auth: "Pública",
    premium: "N/A",
    descripcion: "Puerta desktop con QR",
    funcionalidad: "Indicar uso móvil; QR; volver a web"
  },
  {
    id: "SCR-PWA-GATE",
    area: "Acceso",
    nombre: "Instalar PWA",
    ruta: "/app-recetas/* (gate)",
    tipo: "Gate",
    nav: "No",
    auth: "Pre-login",
    premium: "N/A",
    descripcion: "Obliga instalar PWA salvo localhost",
    funcionalidad: "Instrucciones Android/iOS; modal iPhone"
  },
  {
    id: "SCR-LOGIN",
    area: "Auth",
    nombre: "Login / Registro / Recuperar",
    ruta: "/login (/auth, /registro)",
    tipo: "Página",
    nav: "No",
    auth: "Pública",
    premium: "N/A",
    descripcion: "Acceso a cuenta",
    funcionalidad: "Login; signup; forgot password; ?next=; ?ref="
  },
  {
    id: "SCR-CONFIRM",
    area: "Auth",
    nombre: "Confirmar correo",
    ruta: "/auth/confirm-email",
    tipo: "Página",
    nav: "No",
    auth: "Enlace email",
    premium: "N/A",
    descripcion: "Activación de cuenta",
    funcionalidad: "Confirmar email; adjuntar referral; redirigir"
  },
  {
    id: "SCR-CALLBACK",
    area: "Auth",
    nombre: "Callback auth",
    ruta: "/auth/callback",
    tipo: "Página técnica",
    nav: "No",
    auth: "Enlace",
    premium: "N/A",
    descripcion: "Router de enlaces Supabase",
    funcionalidad: "Recovery→reset; signup→confirm"
  },
  {
    id: "SCR-RESET",
    area: "Auth",
    nombre: "Nueva contraseña",
    ruta: "/auth/reset-password",
    tipo: "Página",
    nav: "No",
    auth: "Enlace recovery",
    premium: "N/A",
    descripcion: "Reset password",
    funcionalidad: "Definir nueva contraseña"
  },
  {
    id: "SCR-HOY",
    area: "PWA",
    nombre: "Hoy",
    ruta: "/app-recetas/hoy",
    tipo: "Tab",
    nav: "Bottom + Drawer",
    auth: "Sesión + PWA",
    premium: "Parcial",
    descripcion: "Dashboard diario",
    funcionalidad: "Racha; dosis; plan del día; agua; retos; menú IA; pase 24h"
  },
  {
    id: "SCR-PLAN",
    area: "PWA",
    nombre: "Plan semanal",
    ruta: "/app-recetas/plan",
    tipo: "Tab",
    nav: "Bottom + Drawer",
    auth: "Sesión + PWA",
    premium: "Parcial",
    descripcion: "Planificación L–D",
    funcionalidad: "Slots; picker; drag; lista compras; menú IA; comida fuera; snacks"
  },
  {
    id: "SCR-SCAN",
    area: "PWA",
    nombre: "Escáner",
    ruta: "/app-recetas/scanner",
    tipo: "Tab",
    nav: "Bottom + Drawer",
    auth: "Sesión + PWA",
    premium: "Parcial",
    descripcion: "Generación IA de recetas",
    funcionalidad: "Foto/manual; filtros; 3 variantes; dieta; Instagram; guardar/plan"
  },
  {
    id: "SCR-SCAN-CONFIRM",
    area: "PWA",
    nombre: "Confirmar ingredientes",
    ruta: "/app-recetas/scanner (estado)",
    tipo: "Subpantalla",
    nav: "Escáner",
    auth: "Sesión",
    premium: "Free/Prem",
    descripcion: "Post-detección foto",
    funcionalidad: "Añadir/quitar ingredientes; confirmar"
  },
  {
    id: "SCR-SCAN-RESULT",
    area: "PWA",
    nombre: "Resultado de receta",
    ruta: "/app-recetas/scanner (estado)",
    tipo: "Subpantalla",
    nav: "Escáner",
    auth: "Sesión",
    premium: "Free/Prem",
    descripcion: "Hasta 3 opciones",
    funcionalidad: "Ver; guardar; plan; avisos dieta/salud; nueva búsqueda"
  },
  {
    id: "SCR-RECIPES",
    area: "PWA",
    nombre: "Guardadas",
    ruta: "/app-recetas/recipes",
    tipo: "Tab",
    nav: "Bottom + Drawer",
    auth: "Sesión + PWA",
    premium: "Free",
    descripcion: "Recetario",
    funcionalidad: "Tabs Guardadas/Favoritas/Fuera; buscar; favorito; compartir; borrar"
  },
  {
    id: "SCR-RECIPE-DETAIL",
    area: "PWA",
    nombre: "Detalle de receta",
    ruta: "/app-recetas/recipes/[id]",
    tipo: "Página",
    nav: "Desde Guardadas",
    auth: "Sesión + PWA",
    premium: "Free",
    descripcion: "Ficha completa",
    funcionalidad: "Ingredientes; pasos; macros; advisory; plan; compartir; borrar"
  },
  {
    id: "SCR-PROFILE",
    area: "PWA",
    nombre: "Perfil",
    ruta: "/app-recetas/profile",
    tipo: "Tab",
    nav: "Bottom + Drawer",
    auth: "Sesión + PWA",
    premium: "Billing",
    descripcion: "Cuenta y suscripción",
    funcionalidad: "Nombre; país; idioma; avatar; Stripe; código 24h; logout; admin link"
  },
  {
    id: "SCR-RETOS",
    area: "PWA",
    nombre: "Retos",
    ruta: "/app-recetas/retos",
    tipo: "Página",
    nav: "Drawer",
    auth: "Sesión + PWA",
    premium: "Free",
    descripcion: "Hábitos",
    funcionalidad: "Activar retos; días semana; metas personalizadas"
  },
  {
    id: "SCR-PARAMS",
    area: "PWA",
    nombre: "Personalizar parámetros",
    ruta: "/app-recetas/parametros",
    tipo: "Página",
    nav: "Drawer",
    auth: "Sesión + PWA",
    premium: "Free",
    descripcion: "Preferencias nutricionales",
    funcionalidad: "Agua; BMR/TDEE; metas; dieta preferida"
  },
  {
    id: "SCR-ADM-USERS",
    area: "Admin",
    nombre: "Administrar usuarios",
    ruta: "/admin/usuarios",
    tipo: "Página",
    nav: "Admin",
    auth: "Admin Sandra",
    premium: "N/A",
    descripcion: "Gestión usuarios",
    funcionalidad: "Premium/tester; límites escaneos; eliminar"
  },
  {
    id: "SCR-ADM-IMPORT",
    area: "Admin",
    nombre: "Importar receta",
    ruta: "/admin/importar-receta",
    tipo: "Página",
    nav: "Admin",
    auth: "Admin Sandra",
    premium: "N/A",
    descripcion: "Import Instagram→IA",
    funcionalidad: "Pegar texto; estructurar; publicar"
  },
  {
    id: "SCR-ADM-BANK",
    area: "Admin",
    nombre: "Banco de imágenes",
    ruta: "/admin/banco-imagenes",
    tipo: "Página",
    nav: "Admin",
    auth: "Admin Sandra",
    premium: "N/A",
    descripcion: "Imágenes de platos",
    funcionalidad: "CRUD; filtros; seed"
  },
  {
    id: "SCR-ADM-CAT",
    area: "Admin",
    nombre: "Catálogo Instagram",
    ruta: "/admin/catalogo-instagram",
    tipo: "Página",
    nav: "Admin",
    auth: "Admin Sandra",
    premium: "N/A",
    descripcion: "Listado catálogo escáner",
    funcionalidad: "Listar entradas"
  },
  {
    id: "SCR-ADM-CAT-EDIT",
    area: "Admin",
    nombre: "Editar receta catálogo",
    ruta: "/admin/catalogo-instagram/[id]/edit",
    tipo: "Página",
    nav: "Admin",
    auth: "Admin Sandra",
    premium: "N/A",
    descripcion: "Edición catálogo",
    funcionalidad: "Editar y guardar entrada"
  },
  {
    id: "SCR-TEST-PREM",
    area: "Utilidad",
    nombre: "Test Premium",
    ruta: "/test-premium",
    tipo: "Página",
    nav: "No",
    auth: "Sesión",
    premium: "Diagnóstico",
    descripcion: "Estado Premium",
    funcionalidad: "Ver flags de acceso Premium"
  }
];

const modales = [
  { id: "MOD-DRAWER", nombre: "Menú lateral", contexto: "Header PWA", premium: "No", funcion: "Navegación extendida + cerrar sesión" },
  { id: "MOD-PAYWALL", nombre: "Paywall Premium", contexto: "Hoy Plan Escáner picker", premium: "CTA", funcion: "Stripe; código 24h; mensaje función Premium" },
  { id: "MOD-GEN-LIMIT", nombre: "Límite generaciones", contexto: "Escáner", premium: "CTA", funcion: "Aviso free agotado (5 pruebas)" },
  { id: "MOD-REAL-PHOTO", nombre: "Confirmar foto real", contexto: "Escáner", premium: "Sí", funcion: "Usar crédito foto OpenAI del plato" },
  { id: "MOD-PICKER", nombre: "Picker recetas plan", contexto: "Plan / Hoy", premium: "Parcial", funcion: "Elegir guardada; atajos escáner / Instagram" },
  { id: "MOD-SHOP", nombre: "Lista de compras", contexto: "Plan", premium: "No", funcion: "Ingredientes semana; copiar" },
  { id: "MOD-EXTERNAL", nombre: "Comida fuera", contexto: "Plan", premium: "Sí", funcion: "Registro externo foto/texto + estimación" },
  { id: "MOD-SNACK", nombre: "Snack", contexto: "Plan / Hoy", premium: "No", funcion: "Registrar tentempié" },
  { id: "MOD-DOSE", nombre: "Informe Dosis Inteligente", contexto: "Hoy", premium: "Sí", funcion: "Informe nutricional + CTA escáner" },
  { id: "MOD-COACH", nombre: "Teaser Coach Nutricional", contexto: "Hoy", premium: "CTA", funcion: "Activar pase 24h / upgrade" },
  { id: "MOD-STREAK", nombre: "Calendario racha / logros / progreso", contexto: "Hoy", premium: "No", funcion: "Detalle gamificación" },
  { id: "MOD-CUSTOM-CH", nombre: "Reto personalizado", contexto: "Retos / Hoy", premium: "No", funcion: "CRUD meta propia" },
  { id: "MOD-AVATAR", nombre: "Recorte avatar", contexto: "Perfil", premium: "No", funcion: "Crop foto perfil" },
  { id: "MOD-IG", nombre: "Detalle catálogo Instagram", contexto: "Escáner", premium: "Parcial", funcion: "Ver / guardar / plan" },
  { id: "MOD-CONFIRM", nombre: "Diálogos confirmar/eliminar", contexto: "Varios", premium: "No", funcion: "Confirmaciones destructivas" },
  { id: "MOD-IOS-INSTALL", nombre: "Instalar en iPhone", contexto: "Gate PWA", premium: "N/A", funcion: "Instrucciones Añadir a inicio" }
];

const freePrem = [
  { capacidad: "Planificar comidas manualmente", free: "Sí", premium: "Sí", notas: "" },
  { capacidad: "Lista de compras", free: "Sí", premium: "Sí", notas: "" },
  { capacidad: "Agua / retos / parámetros / dieta", free: "Sí", premium: "Sí", notas: "" },
  { capacidad: "Generaciones receta IA", free: "Limitadas (5)", premium: "Ampliado / ilimitado", notas: "FREE_GENERATIONS_LIMIT=5" },
  { capacidad: "Filtros avanzados escáner", free: "Limitados", premium: "Completos", notas: "Free típico: almuerzo/mediterránea/2/fácil" },
  { capacidad: "Foto real del plato", free: "No", premium: "Sí (crédito limitado)", notas: "Normalmente 1 uso" },
  { capacidad: "Proponer/completar menú del día IA", free: "No", premium: "Sí", notas: "Hoy y Plan" },
  { capacidad: "Comida fuera", free: "No", premium: "Sí", notas: "" },
  { capacidad: "Dosis Inteligente / Coach", free: "Teaser + pase 24h", premium: "Sí", notas: "" },
  { capacidad: "Desde Instagram en picker plan", free: "Bloqueado", premium: "Sí", notas: "" },
  { capacidad: "Código / pase 24h", free: "Canjeable", premium: "—", notas: "Perfil o paywall" },
  { capacidad: "Suscripción Stripe", free: "Upgrade", premium: "Portal gestión", notas: "" }
];

const flujos = [
  {
    id: "FL-A",
    nombre: "Entrar a la app",
    pasos: "Instalar PWA → clave privada si aplica → Login/Registro → confirmar email → Hoy",
    pantallas: "SCR-PWA-GATE;SCR-LOGIN;SCR-HOY"
  },
  {
    id: "FL-B",
    nombre: "Generar una receta",
    pasos: "Escáner → foto/manual → confirmar → filtros → generar → variante → guardar/plan",
    pantallas: "SCR-SCAN;SCR-SCAN-CONFIRM;SCR-SCAN-RESULT;SCR-RECIPES;SCR-PLAN"
  },
  {
    id: "FL-C",
    nombre: "Planificar la semana",
    pasos: "Plan → día → añadir/cambiar → escáner/IG → snacks/fuera → lista compras",
    pantallas: "SCR-PLAN;SCR-SCAN;MOD-PICKER;MOD-SHOP"
  },
  {
    id: "FL-D",
    nombre: "Completar el día (Hoy)",
    pasos: "Agua → retos → comidas vacías → dosis Premium",
    pantallas: "SCR-HOY;MOD-DOSE"
  },
  {
    id: "FL-E",
    nombre: "Ajustar preferencias",
    pasos: "Parámetros → nutrición + dieta + agua",
    pantallas: "SCR-PARAMS"
  },
  {
    id: "FL-F",
    nombre: "Hacerse Premium",
    pasos: "Perfil/paywall → Stripe o código 24h o pase promo Hoy",
    pantallas: "SCR-PROFILE;MOD-PAYWALL;SCR-HOY"
  }
];

const dietas = [
  { id: "estandar", label: "Sin restricciones", aviso_escanner: "No", ejemplos_incompatibles: "—" },
  {
    id: "sin_gluten",
    label: "Sin gluten",
    aviso_escanner: "Sí",
    ejemplos_incompatibles: "harina de trigo; pan; pasta; cebada (NO: harina de almendras/coco)"
  },
  {
    id: "sin_harinas",
    label: "Sin harinas",
    aviso_escanner: "Sí",
    ejemplos_incompatibles: "harina de trigo; pan; pasta"
  },
  {
    id: "keto",
    label: "Keto / low carb",
    aviso_escanner: "Sí",
    ejemplos_incompatibles: "arroz; azúcar; pasta; pan; patata"
  },
  {
    id: "vegetariana",
    label: "Vegetariana",
    aviso_escanner: "Sí",
    ejemplos_incompatibles: "carne; pollo; pescado"
  },
  {
    id: "vegana",
    label: "Vegana",
    aviso_escanner: "Sí",
    ejemplos_incompatibles: "carne; huevo; leche; queso; miel"
  },
  {
    id: "alto_proteina",
    label: "Alto en proteína",
    aviso_escanner: "Sí (blando)",
    ejemplos_incompatibles: "golosinas; refrescos"
  },
  {
    id: "mediterranea",
    label: "Mediterránea",
    aviso_escanner: "Sí (blando)",
    ejemplos_incompatibles: "ultraprocesados; nuggets; refrescos"
  }
];

/** @type {Array<Record<string, string>>} */
const casos = [
  { id: "S1", area: "Smoke", titulo: "Abrir app instalada → login o Hoy", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "PWA instalada", pasos: "Abrir desde icono", esperado: "Login o Hoy", automatizable: "E2E" },
  { id: "S2", area: "Smoke", titulo: "Login válido → Hoy", prioridad: "P0", cuenta: "Free/Prem", precondiciones: "Usuario confirmado", pasos: "Email+password correctos", esperado: "/app-recetas/hoy con nav", automatizable: "E2E" },
  { id: "S3", area: "Smoke", titulo: "Bottom nav 5 tabs", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Pulsar Hoy Plan Escáner Guardadas Perfil", esperado: "Cada tab abre su pantalla", automatizable: "E2E" },
  { id: "S4", area: "Smoke", titulo: "Escáner 1 ingrediente manual", prioridad: "P0", cuenta: "Free/Prem", precondiciones: "Cuota disponible", pasos: "Añadir pollo → generar", esperado: "Opciones de receta", automatizable: "E2E+mock IA" },
  { id: "S5", area: "Smoke", titulo: "Guardar receta → Guardadas", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Resultado generado", pasos: "Guardar", esperado: "Aparece en Guardadas", automatizable: "E2E" },
  { id: "S6", area: "Smoke", titulo: "Asignar al plan", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Receta guardada", pasos: "Asignar a slot", esperado: "Visible en Plan", automatizable: "E2E" },
  { id: "S7", area: "Smoke", titulo: "Hoy refleja comida", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Comida en plan hoy", pasos: "Abrir Hoy", esperado: "Comida visible", automatizable: "E2E" },
  { id: "S8", area: "Smoke", titulo: "Logout", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Cerrar sesión", esperado: "Vuelve a acceso", automatizable: "E2E" },
  { id: "TC-ACC-01", area: "Acceso", titulo: "Landing pública", prioridad: "P2", cuenta: "N/A", precondiciones: "Ninguna", pasos: "Abrir /; idioma; CTAs", esperado: "Carga sin 500; CTAs ok", automatizable: "E2E" },
  { id: "TC-ACC-02", area: "Acceso", titulo: "Desktop → pantalla móvil", prioridad: "P2", cuenta: "N/A", precondiciones: "Desktop", pasos: "/descargar-app", esperado: "QR / optimizado móviles", automatizable: "E2E" },
  { id: "TC-ACC-03", area: "Acceso", titulo: "Gate instalación PWA", prioridad: "P0", cuenta: "N/A", precondiciones: "Móvil no standalone", pasos: "Abrir app sin instalar; instalar; reabrir", esperado: "Pide instalar; luego login/Hoy", automatizable: "Manual" },
  { id: "TC-ACC-04", area: "Acceso", titulo: "Clave privada", prioridad: "P1", cuenta: "N/A", precondiciones: "Entorno con key", pasos: "Sin ?k= y con ?k=", esperado: "Bloqueo / acceso", automatizable: "E2E" },
  { id: "TC-AUTH-01", area: "Auth", titulo: "Registro cuenta nueva", prioridad: "P0", cuenta: "Nueva", precondiciones: "Email libre", pasos: "Signup + confirm email", esperado: "Cuenta creada", automatizable: "Semi (email manual)" },
  { id: "TC-AUTH-02", area: "Auth", titulo: "Login correcto", prioridad: "P0", cuenta: "Confirmado", precondiciones: "Usuario válido", pasos: "Login", esperado: "Hoy + nav", automatizable: "E2E" },
  { id: "TC-AUTH-03", area: "Auth", titulo: "Login incorrecto", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "—", pasos: "Password mala", esperado: "Error; no entra", automatizable: "E2E" },
  { id: "TC-AUTH-04", area: "Auth", titulo: "Recuperar contraseña", prioridad: "P1", cuenta: "Confirmado", precondiciones: "Email válido", pasos: "Forgot → email → reset → login", esperado: "Nueva pass funciona", automatizable: "Semi" },
  { id: "TC-AUTH-05", area: "Auth", titulo: "Confirmar email", prioridad: "P1", cuenta: "Nueva", precondiciones: "Enlace email", pasos: "Abrir enlace", esperado: "Activación + redirect", automatizable: "Semi" },
  { id: "TC-AUTH-06", area: "Auth", titulo: "Cerrar sesión", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Logout drawer/perfil", esperado: "Sin acceso a Hoy", automatizable: "E2E" },
  { id: "TC-AUTH-07", area: "Auth", titulo: "Sesión persistente", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Login", pasos: "Cerrar y reabrir PWA", esperado: "Sigue autenticado", automatizable: "E2E" },
  { id: "TC-NAV-01", area: "Nav", titulo: "Bottom navigation", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "5 tabs", esperado: "Navegación correcta", automatizable: "E2E" },
  { id: "TC-NAV-02", area: "Nav", titulo: "Menú lateral", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Retos; Parámetros; resto", esperado: "Rutas ok; drawer cierra", automatizable: "E2E" },
  { id: "TC-NAV-03", area: "Nav", titulo: "Avatar → perfil", prioridad: "P2", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Pulsar avatar", esperado: "Abre Perfil", automatizable: "E2E" },
  { id: "TC-PAR-01", area: "Parámetros", titulo: "Guardar perfil nutricional", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Completar bio + guardar + recargar", esperado: "Persistido + preview metas", automatizable: "E2E" },
  { id: "TC-PAR-02", area: "Parámetros", titulo: "Dieta preferida", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Migración preferred_diet", pasos: "Elegir Sin gluten; guardar; recargar", esperado: "Valor persistido", automatizable: "E2E" },
  { id: "TC-PAR-03", area: "Parámetros", titulo: "Meta de agua", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Cambiar vasos; ver Hoy", esperado: "Tracker con meta nueva", automatizable: "E2E" },
  { id: "TC-PAR-04", area: "Parámetros", titulo: "Overrides kcal/proteína", prioridad: "P2", cuenta: "Cualquiera", precondiciones: "Perfil completo", pasos: "Override + guardar", esperado: "Metas usan override", automatizable: "E2E" },
  { id: "TC-HOY-01", area: "Hoy", titulo: "Carga dashboard", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Abrir Hoy", esperado: "Secciones visibles sin blanco", automatizable: "E2E" },
  { id: "TC-HOY-02", area: "Hoy", titulo: "Racha", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Ver + abrir calendario", esperado: "Modal/datos coherentes", automatizable: "E2E" },
  { id: "TC-HOY-03", area: "Hoy", titulo: "Dosis Free", prioridad: "P1", cuenta: "Free", precondiciones: "Sin Premium", pasos: "Ver informe", esperado: "Teaser/paywall", automatizable: "E2E" },
  { id: "TC-HOY-04", area: "Hoy", titulo: "Dosis Premium", prioridad: "P0", cuenta: "Premium", precondiciones: "Premium", pasos: "Ver score + informe", esperado: "Informe completo; UI compacta", automatizable: "E2E" },
  { id: "TC-HOY-05", area: "Hoy", titulo: "Vasos de agua", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Meta agua", pasos: "Tocar vasos; recargar", esperado: "Persistencia; solo vaso azul sin fondo botón", automatizable: "E2E" },
  { id: "TC-HOY-06", area: "Hoy", titulo: "Editar agua → Parámetros", prioridad: "P2", cuenta: "Cualquiera", precondiciones: "Tracker visible", pasos: "Editar", esperado: "Va a parámetros", automatizable: "E2E" },
  { id: "TC-HOY-07", area: "Hoy", titulo: "Completar reto", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Reto activo", pasos: "Completar", esperado: "Puntos/racha update", automatizable: "E2E" },
  { id: "TC-HOY-08", area: "Hoy", titulo: "Banner menú Free/Prem", prioridad: "P1", cuenta: "Ambas", precondiciones: "Slots vacíos", pasos: "Pulsar banner", esperado: "Free paywall; Prem genera; 1 solo sparkle", automatizable: "E2E" },
  { id: "TC-HOY-09", area: "Hoy", titulo: "Comidas vacías añadir", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Slot vacío", pasos: "CTA planificar", esperado: "Picker/sugerencia", automatizable: "E2E" },
  { id: "TC-HOY-10", area: "Hoy", titulo: "Snack desde Hoy", prioridad: "P2", cuenta: "Cualquiera", precondiciones: "UI snack", pasos: "Registrar snack", esperado: "Visible en día", automatizable: "E2E" },
  { id: "TC-HOY-11", area: "Hoy", titulo: "Pase 24h promo", prioridad: "P1", cuenta: "Promo", precondiciones: "Promo reclamable", pasos: "Activar", esperado: "Premium temporal", automatizable: "E2E" },
  { id: "TC-PLAN-01", area: "Plan", titulo: "Navegar días/semanas", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Cambiar día/semana", esperado: "Contenido correcto", automatizable: "E2E" },
  { id: "TC-PLAN-02", area: "Plan", titulo: "Añadir receta a slot", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Receta guardada", pasos: "Añadir desde picker", esperado: "En slot + kcal", automatizable: "E2E" },
  { id: "TC-PLAN-03", area: "Plan", titulo: "Reemplazar plato", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Slot con comida", pasos: "Editar/reemplazar", esperado: "Reemplaza sin duplicar", automatizable: "E2E" },
  { id: "TC-PLAN-04", area: "Plan", titulo: "Quitar comida", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Slot con comida", pasos: "Eliminar", esperado: "Vacío + nutrición", automatizable: "E2E" },
  { id: "TC-PLAN-05", area: "Plan", titulo: "Arrastrar horarios", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Comida asignada", pasos: "Drag and drop", esperado: "Cambia slot", automatizable: "E2E móvil" },
  { id: "TC-PLAN-06", area: "Plan", titulo: "Escáner desde plan", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Cuota", pasos: "Añadir→escanear→guardar plan", esperado: "Asigna día/comida correctos", automatizable: "E2E" },
  { id: "TC-PLAN-07", area: "Plan", titulo: "Lista de compras", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Plan con comidas", pasos: "Abrir lista; copiar", esperado: "Lista coherente", automatizable: "E2E" },
  { id: "TC-PLAN-08", area: "Plan", titulo: "Copiar semana anterior", prioridad: "P2", cuenta: "Cualquiera", precondiciones: "Semana previa", pasos: "Copiar semana", esperado: "Copia o mensaje claro", automatizable: "E2E" },
  { id: "TC-PLAN-09", area: "Plan", titulo: "Menú IA Premium", prioridad: "P0", cuenta: "Premium", precondiciones: "Slots vacíos", pasos: "Proponer/completar", esperado: "Rellena; 1 sparkle; respeta dieta", automatizable: "E2E+IA" },
  { id: "TC-PLAN-10", area: "Plan", titulo: "Menú IA Free", prioridad: "P1", cuenta: "Free", precondiciones: "—", pasos: "Pulsar banner", esperado: "Paywall", automatizable: "E2E" },
  { id: "TC-PLAN-11", area: "Plan", titulo: "Comida fuera Premium", prioridad: "P1", cuenta: "Premium", precondiciones: "Premium", pasos: "Registrar fuera", esperado: "En plan/nutrición", automatizable: "E2E" },
  { id: "TC-PLAN-12", area: "Plan", titulo: "Snack en plan", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "—", pasos: "Registrar snack", esperado: "En día + macros", automatizable: "E2E" },
  { id: "TC-PLAN-13", area: "Plan", titulo: "Instagram picker Free/Prem", prioridad: "P1", cuenta: "Ambas", precondiciones: "—", pasos: "Desde Instagram", esperado: "Free bloqueado; Prem asigna", automatizable: "E2E" },
  { id: "TC-SCAN-01", area: "Escáner", titulo: "Generar manual happy path", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Cuota", pasos: "Ingrediente pollo → generar", esperado: "Hasta 3 opciones", automatizable: "E2E+IA" },
  { id: "TC-SCAN-02", area: "Escáner", titulo: "Generar con foto", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Foto comida", pasos: "Subir→confirmar→generar", esperado: "Recetas", automatizable: "E2E+fixture" },
  { id: "TC-SCAN-03", area: "Escáner", titulo: "Foto sin comida", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Imagen no food", pasos: "Subir paisaje", esperado: "NOT_FOOD / aviso", automatizable: "E2E" },
  { id: "TC-SCAN-04", area: "Escáner", titulo: "Editar ingredientes detectados", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Detección", pasos: "Quitar/añadir; confirmar", esperado: "Usa lista editada", automatizable: "E2E" },
  { id: "TC-SCAN-05", area: "Escáner", titulo: "Filtros Free vs Prem", prioridad: "P1", cuenta: "Ambas", precondiciones: "—", pasos: "Probar filtros", esperado: "Free limitado; Prem aplica", automatizable: "E2E" },
  { id: "TC-SCAN-06", area: "Escáner", titulo: "Límite 5 generaciones Free", prioridad: "P0", cuenta: "Free", precondiciones: "Cuota agotable", pasos: "Agotar generaciones", esperado: "Modal límite", automatizable: "E2E" },
  { id: "TC-SCAN-07", area: "Escáner", titulo: "Guardar en recetario", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Resultado", pasos: "Guardar", esperado: "En Guardadas", automatizable: "E2E" },
  { id: "TC-SCAN-08", area: "Escáner", titulo: "Guardar en plan", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Resultado", pasos: "Asignar plan", esperado: "En Plan y Hoy", automatizable: "E2E" },
  { id: "TC-SCAN-09", area: "Escáner", titulo: "3 variantes", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Resultado", pasos: "Cambiar tabs", esperado: "Enfoques distintos", automatizable: "E2E" },
  { id: "TC-SCAN-10", area: "Escáner", titulo: "Aviso poco saludable", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "—", pasos: "Generar con bacon", esperado: "Receta + nota", automatizable: "Unit+E2E" },
  { id: "TC-SCAN-11", area: "Escáner", titulo: "Sin gluten + harina trigo", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Dieta sin_gluten", pasos: "Generar harina de trigo", esperado: "Nota dieta gluten", automatizable: "Unit+E2E" },
  { id: "TC-SCAN-12", area: "Escáner", titulo: "Sin gluten + harina almendras", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Dieta sin_gluten", pasos: "Generar harina de almendras", esperado: "NO falso positivo gluten", automatizable: "Unit+E2E" },
  { id: "TC-SCAN-13", area: "Escáner", titulo: "Otras dietas muestra", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Dietas keto/vegana/etc", pasos: "Ingredientes incompatibles", esperado: "Notas coherentes", automatizable: "Unit+E2E" },
  { id: "TC-SCAN-14", area: "Escáner", titulo: "Tab Instagram", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Catálogo", pasos: "Detalle→guardar", esperado: "En recetario", automatizable: "E2E" },
  { id: "TC-SCAN-15", area: "Escáner", titulo: "Foto real plato Premium", prioridad: "P1", cuenta: "Premium", precondiciones: "Crédito", pasos: "Aceptar foto real", esperado: "Usa crédito; respeta límite", automatizable: "E2E" },
  { id: "TC-SCAN-16", area: "Escáner", titulo: "Nueva búsqueda", prioridad: "P2", cuenta: "Cualquiera", precondiciones: "Resultado", pasos: "Nueva búsqueda", esperado: "Flujo limpio", automatizable: "E2E" },
  { id: "TC-SCAN-17", area: "Escáner", titulo: "Ingrediente inválido", prioridad: "P2", cuenta: "Cualquiera", precondiciones: "—", pasos: "Texto no food", esperado: "Validación; no genera", automatizable: "E2E" },
  { id: "TC-REC-01", area: "Guardadas", titulo: "Listado y pestañas", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Tabs", esperado: "Listas/empty state", automatizable: "E2E" },
  { id: "TC-REC-02", area: "Guardadas", titulo: "Buscar/filtrar", prioridad: "P2", cuenta: "Cualquiera", precondiciones: "Varias recetas", pasos: "Buscar nombre", esperado: "Filtra", automatizable: "E2E" },
  { id: "TC-REC-03", area: "Guardadas", titulo: "Favorito", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Receta", pasos: "Marcar/desmarcar", esperado: "En Favoritas", automatizable: "E2E" },
  { id: "TC-REC-04", area: "Guardadas", titulo: "Detalle completo", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Receta", pasos: "Abrir detalle", esperado: "Ingredientes pasos macros", automatizable: "E2E" },
  { id: "TC-REC-05", area: "Guardadas", titulo: "Compartir", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Receta", pasos: "Compartir", esperado: "Imagen/share sin crash", automatizable: "E2E" },
  { id: "TC-REC-06", area: "Guardadas", titulo: "Asignar plan desde detalle", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Receta", pasos: "Asignar", esperado: "En Plan", automatizable: "E2E" },
  { id: "TC-REC-07", area: "Guardadas", titulo: "Eliminar receta", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Receta", pasos: "Eliminar confirmando", esperado: "Desaparece", automatizable: "E2E" },
  { id: "TC-PER-01", area: "Perfil", titulo: "Editar nombre/país/idioma", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Guardar + cambiar idioma", esperado: "Persistencia + i18n", automatizable: "E2E" },
  { id: "TC-PER-02", area: "Perfil", titulo: "Avatar", prioridad: "P2", cuenta: "Cualquiera", precondiciones: "Foto", pasos: "Crop + guardar", esperado: "Avatar actualizado", automatizable: "E2E" },
  { id: "TC-PER-03", area: "Perfil", titulo: "Upgrade Stripe", prioridad: "P0", cuenta: "Free", precondiciones: "Stripe test", pasos: "Checkout test", esperado: "Premium activo", automatizable: "Semi" },
  { id: "TC-PER-04", area: "Perfil", titulo: "Portal suscripción", prioridad: "P1", cuenta: "Premium Stripe", precondiciones: "Suscripción", pasos: "Gestionar", esperado: "Abre portal", automatizable: "E2E" },
  { id: "TC-PER-05", area: "Perfil", titulo: "Código 24h válido", prioridad: "P0", cuenta: "Free", precondiciones: "Código válido", pasos: "Canjear", esperado: "Premium 24h", automatizable: "E2E" },
  { id: "TC-PER-06", area: "Perfil", titulo: "Código inválido", prioridad: "P1", cuenta: "Free", precondiciones: "—", pasos: "Código malo", esperado: "Error; sin Premium", automatizable: "E2E" },
  { id: "TC-PER-07", area: "Perfil", titulo: "Logout desde perfil", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Cerrar sesión", esperado: "Sale", automatizable: "E2E" },
  { id: "TC-RET-01", area: "Retos", titulo: "Activar/desactivar reto", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Toggle retos", esperado: "Persistido; en Hoy", automatizable: "E2E" },
  { id: "TC-RET-02", area: "Retos", titulo: "Días de la semana", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Reto", pasos: "Solo LMX; verificar otro día", esperado: "Solo días seleccionados", automatizable: "E2E" },
  { id: "TC-RET-03", area: "Retos", titulo: "Meta personalizada CRUD", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "Crear editar eliminar", esperado: "CRUD ok", automatizable: "E2E" },
  { id: "TC-PREM-01", area: "Premium", titulo: "Paywall consistente Free", prioridad: "P0", cuenta: "Free", precondiciones: "Sin Prem", pasos: "Menú IA; fuera; dosis; IG; filtros", esperado: "Siempre paywall", automatizable: "E2E" },
  { id: "TC-PREM-02", area: "Premium", titulo: "Funciones abiertas Premium", prioridad: "P0", cuenta: "Premium", precondiciones: "Premium", pasos: "Repetir PREM-01", esperado: "Disponibles", automatizable: "E2E" },
  { id: "TC-ADM-01", area: "Admin", titulo: "Acceso restringido", prioridad: "P1", cuenta: "Free/Prem", precondiciones: "No admin", pasos: "/admin/usuarios", esperado: "Denegado", automatizable: "E2E" },
  { id: "TC-ADM-02", area: "Admin", titulo: "Editar usuarios", prioridad: "P1", cuenta: "Admin", precondiciones: "Admin Sandra", pasos: "Toggles Premium/límites", esperado: "Cambios afectan usuario", automatizable: "E2E" },
  { id: "TC-ADM-03", area: "Admin", titulo: "Importar receta IG", prioridad: "P2", cuenta: "Admin", precondiciones: "Admin", pasos: "Pegar→IA→publicar", esperado: "Creada", automatizable: "Semi" },
  { id: "TC-ADM-04", area: "Admin", titulo: "Banco imágenes", prioridad: "P2", cuenta: "Admin", precondiciones: "Admin", pasos: "CRUD", esperado: "Operativo", automatizable: "E2E" },
  { id: "TC-ADM-05", area: "Admin", titulo: "Catálogo IG editar", prioridad: "P2", cuenta: "Admin", precondiciones: "Admin", pasos: "Editar entrada", esperado: "Visible en escáner", automatizable: "E2E" },
  { id: "TC-I18N-01", area: "i18n", titulo: "Cambio de idioma", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Sesión", pasos: "EN FR PT DE; recorrer tabs", esperado: "Sin claves crudas", automatizable: "E2E" },
  { id: "TC-DEV-01", area: "Dispositivo", titulo: "Android PWA smoke", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Android Chrome", pasos: "S1–S8", esperado: "Sin roturas críticas", automatizable: "Manual/Device" },
  { id: "TC-DEV-02", area: "Dispositivo", titulo: "iOS PWA smoke", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Safari + Añadir inicio", pasos: "S1–S8", esperado: "Usable; safe areas", automatizable: "Manual/Device" },
  { id: "TC-DEV-03", area: "Dispositivo", titulo: "Red inestable", prioridad: "P3", cuenta: "Cualquiera", precondiciones: "—", pasos: "Cortar red al generar", esperado: "Error claro; no hang", automatizable: "E2E" },
  { id: "TC-UI-01", area: "UI regresión", titulo: "Banner menú un solo sparkle", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Hoy/Plan", pasos: "Ver banner completar/proponer", esperado: "Un solo icono", automatizable: "E2E" },
  { id: "TC-UI-02", area: "UI regresión", titulo: "Vasos sin fondo azul botón", prioridad: "P1", cuenta: "Cualquiera", precondiciones: "Meta agua", pasos: "Llenar vasos", esperado: "Solo vaso azul", automatizable: "E2E" },
  { id: "TC-UI-03", area: "UI regresión", titulo: "Dosis compacta vs racha", prioridad: "P2", cuenta: "Premium", precondiciones: "Hoy", pasos: "Comparar alturas tarjetas", esperado: "Alturas equilibradas", automatizable: "Manual" },
  { id: "TC-UI-04", area: "UI regresión", titulo: "Harina almendras sin gluten OK", prioridad: "P0", cuenta: "Cualquiera", precondiciones: "Dieta sin gluten", pasos: "Generar con harina almendras", esperado: "Sin falso positivo", automatizable: "Unit+E2E" }
];

write("pantallas.csv", ["id", "area", "nombre", "ruta", "tipo", "nav", "auth", "premium", "descripcion", "funcionalidad"], pantallas);
write("modales.csv", ["id", "nombre", "contexto", "premium", "funcion"], modales);
write("free-vs-premium.csv", ["capacidad", "free", "premium", "notas"], freePrem);
write("flujos.csv", ["id", "nombre", "pasos", "pantallas"], flujos);
write("dietas-preferidas.csv", ["id", "label", "aviso_escanner", "ejemplos_incompatibles"], dietas);
write(
  "casos-de-prueba.csv",
  ["id", "area", "titulo", "prioridad", "cuenta", "precondiciones", "pasos", "esperado", "automatizable", "resultado", "tester", "fecha", "notas"],
  casos.map((c) => ({ ...c, resultado: "", tester: "", fecha: "", notas: "" }))
);
write(
  "smoke.csv",
  ["id", "titulo", "prioridad", "pasos", "esperado", "ok"],
  casos
    .filter((c) => c.area === "Smoke")
    .map((c) => ({
      id: c.id,
      titulo: c.titulo,
      prioridad: c.prioridad,
      pasos: c.pasos,
      esperado: c.esperado,
      ok: ""
    }))
);

console.log(`Exports in ${out}`);
