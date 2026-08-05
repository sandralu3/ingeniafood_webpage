# IngeniaFood — Documentación funcional

Documento de referencia de **todas las ventanas / pantallas** de la aplicación y qué hace cada una desde el punto de vista del usuario.

| Meta | Valor |
|------|--------|
| App principal (PWA) | Rutas bajo `/app-recetas/*` |
| Idiomas | ES, EN, FR, PT, DE |
| Última revisión | agosto 2026 |
| Casos de prueba | [`docs/casos-de-prueba.md`](casos-de-prueba.md) |
| Export CSV (Notion / Sheets) | [`docs/exports/`](exports/README.md) |

---

## 0. Actores y roles

| Actor | Quién es | Qué puede hacer |
|-------|----------|-----------------|
| Visitante | Sin cuenta / sin PWA | Landing, marketing, instalar app, login/registro |
| Usuario Free | Cuenta sin Premium | Planificar, agua, retos, parámetros, escáner limitado (5 generaciones), recetario |
| Usuario Premium | Suscripción Stripe, código 24h o pase promo | Filtros avanzados, menú IA, comida fuera, dosis/coach, Instagram en picker, foto real (crédito) |
| Admin Sandra | Rol/email admin | `/admin/*`: usuarios, importar recetas, banco imágenes, catálogo |

---

## 1. Mapa rápido de navegación

### Barra inferior (5 pestañas)

| Tab | Ruta | Nombre en UI |
|-----|------|--------------|
| 1 | `/app-recetas/hoy` | Hoy |
| 2 | `/app-recetas/plan` | Plan |
| 3 | `/app-recetas/scanner` | Escáner (destacado) |
| 4 | `/app-recetas/recipes` | Guardadas |
| 5 | `/app-recetas/profile` | Perfil |

### Menú lateral (drawer)

Además de las pestañas anteriores:

| Ítem | Ruta | Nombre en UI |
|------|------|--------------|
| Retos | `/app-recetas/retos` | Retos |
| Parámetros | `/app-recetas/parametros` | Personalizar parámetros |
| — | — | Cerrar sesión |

`/app-recetas` redirige a `/app-recetas/hoy`.

---

## 2. Acceso y marketing

### 2.1 Landing web — `/`

**Qué es:** Página pública de marketing de IngeniaFood.

**Qué hace:**
- Presenta la app, beneficios y llamada a la acción.
- Permite descargar guía gratuita (p. ej. “10 Cenas Sin Harinas”).
- Enlaces a redes, contacto y selector de idioma.
- CTA para abrir / descargar la app (`/descargar-app`).

### 2.2 Optimizado para móviles — `/desktop-app-recetas`

**Qué es:** Pantalla intermedia cuando se intenta abrir la PWA desde escritorio.

**Qué hace:**
- Indica que la experiencia está pensada para móvil.
- Muestra QR / instrucciones para abrir en el teléfono.
- Enlace de vuelta a la web principal.

### 2.3 Puerta de instalación PWA (dentro de `/app-recetas/*`)

**Qué es:** Gate previo a usar la app si no está instalada como PWA (excepto entornos locales).

**Qué hace:**
- Guía para “Añadir a pantalla de inicio” (Android / iOS).
- Modal de instrucciones específicas de iPhone si aplica.
- Una vez instalada (modo standalone) o en desarrollo local, deja pasar al login / app.

### 2.4 Acceso privado (producción)

En producción, `/app-recetas/*` puede exigir una clave de acceso (`?k=` / cookie de acceso privado) además de la instalación y la sesión.

---

## 3. Autenticación

### 3.1 Login / Registro / Recuperar — `/login`, `/auth`, `/registro`

**Qué es:** Pantalla de acceso a la cuenta (registro redirige al modo signup del login).

**Qué hace:**
- **Iniciar sesión** con email y contraseña.
- **Crear cuenta** (nombre, email, contraseña).
- **Olvidé mi contraseña** (envía enlace de recuperación).
- Tras login correcto, entra a Hoy (o a la ruta `?next=`).
- Soporta códigos de referido (`?ref=`) para Premium / promociones.

### 3.2 Confirmar correo — `/auth/confirm-email`

**Qué hace:** Activa la cuenta tras el enlace del email; puede adjuntar referral; redirige a Hoy o login.

### 3.3 Callback de auth — `/auth/callback`

**Qué hace:** Intermediario técnico: según el tipo de enlace, lleva a reset de contraseña o a confirmación de email.

### 3.4 Nueva contraseña — `/auth/reset-password`

**Qué hace:** Permite definir una contraseña nueva tras el enlace de recuperación.

---

## 4. Hoy — `/app-recetas/hoy`

**Qué es:** Dashboard diario del usuario (“Tu día en marcha”).

**Qué hace funcionalmente:**

1. **Saludo y contexto del día**  
   Nombre del usuario, mensaje motivacional, acceso rápido a perfil / notificaciones.

2. **Banner Escáner**  
   Acceso rápido a escanear despensa / generar recetas con IA.

3. **Pase Premium 24h (si aplica)**  
   Banner para activar un pase promocional de 24 horas.

4. **Tablero de progreso (Racha + Dosis nutricional)**  
   - **Racha:** días seguidos alimentándote mejor; puntos de la semana; abre calendario de racha.  
   - **Dosis nutricional:** puntuación del día (0–100), señales de proteína / fibra, hidratación; “Ver informe” abre el informe de dosis (Premium).  
   - Free ve teaser / tip; Premium ve informe completo (Dosis Inteligente / Coach).

5. **Plan de hoy**  
   Comidas del día (desayuno, almuerzo, cena, snacks).  
   - Ver kcal estimadas y señales nutricionales.  
   - Completar comidas vacías (añadir al plan o sugerencias).  
   - Banner **Proponer / Completar menú del día** (IA, Premium).  
   - Arrastrar / reordenar horarios cuando aplica.  
   - Enlace “Ver plan” → Plan semanal.

6. **Agua de hoy**  
   Meta de vasos configurada en Parámetros.  
   Tocar un vaso marca / desmarca consumo del día.  
   Solo el icono del vaso se colorea (sin fondo de botón).  
   Enlace “Editar” → Personalizar parámetros.

7. **Retos del día**  
   Completar hábitos activos; puntos y racha.  
   Acceso a retos personalizados.

8. **Consejo / tip de Sandra** (contenido diario).

**Modales asociados a Hoy:** informe de dosis, teaser del coach, logros del día, progreso semanal, calendario de racha, impacto nutricional, detalle de sugerencia de comida, snack, paywall Premium.

---

## 5. Plan semanal — `/app-recetas/plan`

**Qué es:** Planificación de comidas de la semana (L–D).

**Qué hace:**

1. **Navegar semanas y días** (carrusel / selector).

2. **Slots de comida**  
   Desayuno, almuerzo, cena (+ snacks).  
   Varias recetas por slot si el plan lo permite (orden).

3. **Asignar / cambiar / quitar recetas**  
   - Abrir picker de recetas guardadas.  
   - Ir al **Escáner** para generar y asignar (incluyendo modo reemplazo).  
   - Atajo “Desde Instagram” (Premium en el picker).

4. **Arrastrar comidas** entre horarios (“Mantén pulsado y arrastra…”).

5. **Lista de compras** de la semana (modal; copiar lista).

6. **Copiar semana anterior**.

7. **Proponer / Completar menú del día** con IA (Premium) — mismo banner que en Hoy (un solo icono sparkle).

8. **Comida fuera**  
   Registrar plato externo (foto / texto con estimación nutricional) — Premium.

9. **Snacks / tentempiés**  
   Registro rápido (texto, foto o sugerencias).

10. **Resumen nutricional del día** (kcal y macros estimados).

---

## 6. Escáner — `/app-recetas/scanner`

**Qué es:** Generación de recetas con IA a partir de ingredientes (foto o manual) o catálogo Instagram.

### 6.1 Tab “Escanear despensa”

**Qué hace:**
- Subir foto de nevera / ingredientes **o** elegir ingredientes por categorías (proteínas, vegetales, básicos…).
- Aplicar **filtros** de plato: tipo de comida, cocina, raciones, complejidad  
  - Free: filtros limitados.  
  - Premium: filtros avanzados.
- Detectar ingredientes en la foto → pantalla de **confirmación** (añadir / quitar).
- Generar hasta **3 variantes** de receta (clásica, rápida, ligera).
- Respetar **dieta preferida** del perfil (sin gluten, keto, vegana, etc.): prioriza en el prompt y muestra **nota de dieta** si algún ingrediente no es apto.
- Avisa si hay alimentos poco saludables aportados por el usuario.
- Guardar en recetario, compartir, asignar al plan / cocinar.
- Foto real del plato (OpenAI): Premium, crédito limitado (normalmente 1 uso).

**Límite free:** 5 generaciones (`FREE_GENERATIONS_LIMIT`); al agotarlas se muestra modal de límite.

### 6.2 Tab “Desde Instagram”

**Qué hace:**
- Explorar catálogo curado de recetas.
- Ver detalle, guardar y/o asignar al plan.
- En flujos del plan puede exigir Premium.

### 6.3 Estados / subpantallas del escáner

| Estado | Función |
|--------|---------|
| Entrada (foto / manual) | Captura ingredientes |
| Confirmar ingredientes | Revisar detección IA |
| Generando… | Carga / reintentos / errores |
| Resultado | 3 opciones + acciones (guardar, plan, nueva búsqueda) |
| Límite de generaciones | Bloqueo free + CTA Premium |

### 6.4 Notas de dieta en el resultado

Si el usuario tiene una dieta restrictiva y aporta (o la receta incluye) un alimento no apto:

- Se **genera igual** la receta.
- Se muestra un aviso tipo **«Nota de dieta (Sin gluten): …»** (u otra dieta).
- Excepciones importantes: p. ej. **harina de almendras / coco** no deben marcarse como gluten.
- La heurística del servidor es la fuente de verdad del aviso (no solo el texto de la IA).

---

## 7. Guardadas — `/app-recetas/recipes`

**Qué es:** Recetario del usuario.

**Qué hace:**
- Listar recetas en pestañas: **Guardadas / Favoritas / Fuera** (comidas externas).
- Buscar y filtrar.
- Marcar favorito, compartir (imagen), eliminar.
- Abrir detalle de cada receta.

### 7.1 Detalle de receta — `/app-recetas/recipes/[id]`

**Qué hace:**
- Ver título, imagen, tiempo, raciones, macros, ingredientes, pasos, tip.
- Mostrar avisos (`meal_type_advisory`: dieta, poco saludable, etc.).
- Favorito, compartir, asignar al plan, eliminar.
- Comidas “fuera” pueden mostrarse con tarjeta especial.

---

## 8. Perfil — `/app-recetas/profile`

**Qué es:** “Mi Perfil” — datos de cuenta y suscripción.

**Qué hace:**
- Editar nombre, país, idioma (se aplica al instante).
- Email (lectura).
- Avatar con recorte.
- **Suscripción Premium:** upgrade Stripe, gestionar portal, canjear código de acceso 24h.
- Ver crédito de foto real del plato.
- Cerrar sesión.
- Si el usuario es admin Sandra: acceso a panel de administración.

---

## 9. Retos — `/app-recetas/retos`

**Qué es:** Gestión de hábitos / retos diarios.

**Qué hace:**
- Activar / desactivar retos del sistema.
- Configurar **días de la semana** en que aplica cada reto.
- Crear, editar y eliminar **metas personalizadas**.
- Alimenta la racha y los puntos de Hoy.

---

## 10. Personalizar parámetros — `/app-recetas/parametros`

**Qué es:** Ajustes que condicionan recomendaciones y seguimiento.

**Qué hace:**

1. **Hidratación**  
   Meta de vasos de agua al día (usada en Hoy y en la dosis).

2. **Perfil nutricional**  
   Peso, altura, edad, sexo, actividad, objetivo (perder / mantener / ganar).  
   Overrides opcionales de kcal y proteína.  
   Cálculo BMR/TDEE (Mifflin-St Jeor) y metas diarias.

3. **Tipo de alimentación preferida**  

| Valor | Etiqueta UI |
|-------|-------------|
| `estandar` | Sin restricciones |
| `sin_gluten` | Sin gluten |
| `sin_harinas` | Sin harinas |
| `keto` | Keto / low carb |
| `vegetariana` | Vegetariana |
| `vegana` | Vegana |
| `alto_proteina` | Alto en proteína |
| `mediterranea` | Mediterránea |

Influye en: sugerencias de Hoy, menú del día, prompts de generación de recetas y avisos de incompatibilidad en el escáner.

> Requiere columna `profiles.preferred_diet` (migración `supabase/migrations/20260804180000_profiles_preferred_diet.sql`).

---

## 11. Admin (Sandra) — `/admin/*`

Acceso restringido (sesión + rol/email admin). Enlace desde Perfil cuando aplica.

| Pantalla | Ruta | Función |
|----------|------|---------|
| Administrar usuarios | `/admin/usuarios` | Listar usuarios; Premium/tester; límite de escaneos; eliminar |
| Importar receta | `/admin/importar-receta` | Pegar texto Instagram → estructurar con IA → publicar |
| Banco de imágenes | `/admin/banco-imagenes` | CRUD de imágenes de platos para matching |
| Catálogo Instagram | `/admin/catalogo-instagram` | Listado del catálogo del escáner |
| Editar receta catálogo | `/admin/catalogo-instagram/[id]/edit` | Editar una entrada del catálogo |

---

## 12. Otras rutas

| Ruta | Función |
|------|---------|
| `/scanner`, `/recipes`, `/recipes/[id]`, `/profile` | Versiones **legacy** de las mismas pantallas (sin shell PWA completo: header/nav/gate) |
| `/test-premium` | Diagnóstico del estado Premium de la cuenta |
| `/descargar-app` | Redirige a PWA móvil o a `/desktop-app-recetas` en escritorio |

---

## 13. Ventanas / modales relevantes (no son rutas propias)

| Ventana | Dónde aparece | Función |
|---------|---------------|---------|
| Menú lateral (AppDrawer) | Toda la PWA | Navegación extendida + logout |
| Paywall Premium | Hoy, Plan, Escáner, picker | Stripe, código 24h, mensaje de función Premium |
| Límite de generaciones | Escáner | Aviso free agotado |
| Confirmar foto real | Escáner | Usar crédito de foto del plato |
| Picker de recetas del plan | Plan / Hoy | Elegir guardada o ir a escáner / Instagram |
| Lista de compras | Plan | Ingredientes de la semana |
| Comida fuera | Plan | Registro externo (Premium) |
| Snack | Plan / Hoy | Tentempié |
| Informe Dosis Inteligente | Hoy | Informe nutricional + CTA a escáner (Premium) |
| Teaser Coach Nutricional | Hoy | Activar pase 24h / upgrade |
| Calendario de racha / logros / progreso semanal | Hoy | Detalle gamificación |
| Reto personalizado | Retos / Hoy | CRUD meta propia |
| Recorte de avatar | Perfil | Crop de foto |
| Detalle catálogo Instagram | Escáner | Ver / guardar / plan |
| Confirmar / eliminar (diálogos) | Varios | Confirmaciones de borrado |

---

## 14. Free vs Premium (resumen funcional)

| Capacidad | Free | Premium |
|-----------|------|---------|
| Planificar comidas manualmente | Sí | Sí |
| Lista de compras, agua, retos, parámetros, dieta | Sí | Sí |
| Generaciones de receta IA | Limitadas (5) | Según plan (ampliado / ilimitado) |
| Filtros avanzados del escáner | Limitados | Completos |
| Foto real del plato | No | Sí (crédito limitado) |
| Proponer / completar menú del día (IA) | No | Sí |
| Comida fuera (escaneo / estimación) | No | Sí |
| Dosis Inteligente / Coach | Teaser + pase 24h | Sí |
| “Desde Instagram” en picker del plan | Bloqueado | Sí |
| Código / pase 24h | Canjeable | — |
| Suscripción Stripe | Upgrade | Gestión en portal |

---

## 15. Flujos de usuario principales

### A. Entrar a la app
Instalar PWA → (clave privada si aplica) → Login / Registro → confirmar email si hace falta → **Hoy**.

### B. Generar una receta
Hoy o Plan o Escáner → foto o ingredientes → confirmar → filtros → generar → elegir variante → guardar y/o asignar al plan.

### C. Planificar la semana
Plan → día → añadir/cambiar comida (guardadas o escáner) → opcional: menú IA, snacks, comida fuera → lista de compras.

### D. Completar el día (Hoy)
Marcar vasos de agua → completar retos → rellenar comidas vacías → consultar dosis (Premium).

### E. Ajustar preferencias
Parámetros → nutrición + dieta + agua → afectan recomendaciones y avisos del escáner.

### F. Hacerse Premium
Perfil o paywall → Stripe **o** código 24h **o** pase promo en Hoy.

---

## 16. Entidades de datos (visión funcional)

| Entidad | Qué representa para el usuario |
|---------|--------------------------------|
| Perfil | Nombre, idioma, país, avatar, flags Premium, dieta, metas nutricionales, meta de agua |
| Plan semanal | Comidas por día/slot (recetas propias, snacks, comida fuera) |
| Receta guardada | Plato generado o del catálogo, con macros, pasos, advisory |
| Reto | Hábito del sistema o personalizado, con días activos |
| Agua del día | Vasos bebidos vs meta |
| Generaciones | Contador de usos del escáner (límite free) |
| Catálogo Instagram | Recetas curadas por admin para el tab del escáner |
| Banco de imágenes | Imágenes de referencia para platos |

---

## 17. APIs relevantes (mapa funcional)

| Endpoint (aprox.) | Usado desde | Función de negocio |
|-------------------|-------------|--------------------|
| `/api/generate-recipe` | Escáner | Generar 3 recetas + avisos dieta/salud |
| `/api/detect-ingredients` | Escáner (foto) | Detectar ingredientes en imagen |
| `/api/intelligent-dose` | Hoy | Informe Dosis Inteligente |
| `/api/meal-suggestion` | Hoy / menú | Sugerir receta según macros/dieta |
| `/api/estimate-external-meal` | Plan (comida fuera) | Estimar nutrición de plato externo |
| `/api/generations/quota` | Escáner | Consultar cuota restante |
| `/api/stripe/*` | Perfil / paywall | Checkout y portal |
| `/api/premium/*` | Perfil / Hoy | Códigos, referral, promo 24h |

Códigos de error frecuentes en cliente: `UNAUTHORIZED`, `PREMIUM_REQUIRED`, `GENERATIONS_EXHAUSTED`, `NOT_FOOD`, `PARSING_ERROR`.

---

## 18. Glosario

| Término | Significado |
|---------|-------------|
| PWA | App instalable en el móvil (standalone) |
| Slot | Hueco de comida (desayuno / almuerzo / cena / snack) |
| Dosis | Puntuación / informe del equilibrio nutricional del día |
| Racha | Días consecutivos cumpliendo hábitos |
| Advisory / nota | Mensaje bajo la receta (dieta, poco saludable, omitidos) |
| Picker | Modal para elegir receta guardada o ir a escáner |
| Free generations | Tope de generaciones IA sin Premium (5) |

---

## 19. Inventario de rutas `page.tsx`

| URL | Archivo |
|-----|---------|
| `/` | `app/page.tsx` |
| `/login` | `app/login/page.tsx` |
| `/registro` | `app/registro/page.tsx` |
| `/auth` | `app/auth/page.tsx` |
| `/auth/callback` | `app/auth/callback/page.tsx` |
| `/auth/confirm-email` | `app/auth/confirm-email/page.tsx` |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` |
| `/app-recetas` | `app/app-recetas/page.tsx` → Hoy |
| `/app-recetas/hoy` | `app/app-recetas/hoy/page.tsx` |
| `/app-recetas/plan` | `app/app-recetas/plan/page.tsx` |
| `/app-recetas/retos` | `app/app-recetas/retos/page.tsx` |
| `/app-recetas/parametros` | `app/app-recetas/parametros/page.tsx` |
| `/app-recetas/scanner` | `app/app-recetas/scanner/page.tsx` |
| `/app-recetas/recipes` | `app/app-recetas/recipes/page.tsx` |
| `/app-recetas/recipes/[id]` | `app/app-recetas/recipes/[id]/page.tsx` |
| `/app-recetas/profile` | `app/app-recetas/profile/page.tsx` |
| `/desktop-app-recetas` | `app/desktop-app-recetas/page.tsx` |
| `/scanner` | `app/scanner/page.tsx` (legacy) |
| `/recipes` | `app/recipes/page.tsx` (legacy) |
| `/recipes/[id]` | `app/recipes/[id]/page.tsx` (legacy) |
| `/profile` | `app/profile/page.tsx` (legacy) |
| `/test-premium` | `app/test-premium/page.tsx` |
| `/admin/usuarios` | `app/admin/usuarios/page.tsx` |
| `/admin/importar-receta` | `app/admin/importar-receta/page.tsx` |
| `/admin/banco-imagenes` | `app/admin/banco-imagenes/page.tsx` |
| `/admin/catalogo-instagram` | `app/admin/catalogo-instagram/page.tsx` |
| `/admin/catalogo-instagram/[id]/edit` | `app/admin/catalogo-instagram/[id]/edit/page.tsx` |

---

## 20. Documentos y exports relacionados

| Archivo | Uso |
|---------|-----|
| [`casos-de-prueba.md`](casos-de-prueba.md) | Casos QA legibles |
| [`exports/pantallas.csv`](exports/pantallas.csv) | Inventario de pantallas |
| [`exports/modales.csv`](exports/modales.csv) | Modales / ventanas |
| [`exports/flujos.csv`](exports/flujos.csv) | Flujos A–F |
| [`exports/free-vs-premium.csv`](exports/free-vs-premium.csv) | Matriz Free/Premium |
| [`exports/dietas-preferidas.csv`](exports/dietas-preferidas.csv) | Dietas y avisos |
| [`exports/casos-de-prueba.csv`](exports/casos-de-prueba.csv) | Suite QA para Sheets/Notion |
| [`exports/smoke.csv`](exports/smoke.csv) | Smoke S1–S8 |
| [`exports/README.md`](exports/README.md) | Cómo importar en Notion / Google Sheets |

Regenerar CSV: `node scripts/export-docs-csv.mjs`

---

*Este documento describe el comportamiento funcional de producto. No sustituye especificaciones técnicas detalladas de APIs ni el esquema SQL completo.*
