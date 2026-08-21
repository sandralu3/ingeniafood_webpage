# 📱 Guía de Pruebas Beta — IngeniaFood

> Documento para testers. Lenguaje de **pantalla**: lo que ves, tocas y experimentas.  
> Última actualización: **21 agosto 2026** (admin: reordenar pasos + informe semanal)

---

### 📣 Novedades por despliegue

#### 21 agosto 2026

**Admin · orden de pasos**
- En **Editar receta (Admin)** puedes **reordenar los pasos** de preparación: arrastra el asa ⋮⋮ o usa las flechas ↑ ↓.
- Guarda con **Guardar cambios** para aplicar el nuevo orden (útil antes de publicar como Receta de Sandra).

**Informe nutricional semanal**
- En **Plan** aparece un botón compacto **Informe semanal** (pill, bajo el selector de semana).
- También desde el modal de **dosis nutricional** (Ver informe en Hoy): botón verde **Informe semanal** (CTA, no se confunde con las tarjetas del análisis).
- El informe muestra medias diarias de kcal / proteínas / carbs / grasas frente a tus objetivos, un resumen día a día y **recomendaciones** para acercarte a la meta.
- Si marcaste platos con **Ya comí**, usa eso; si no, se basa en el plan y te lo indica.
- Desde el informe puedes ir a **Parámetros**, **Plan** o **Escáner**.
- En **Hoy** no ocupa espacio propio en el scroll (el acceso vive en **Plan** y en la dosis).

**Hoy · Ver plan**
- En **Plan de hoy**, el enlace **Ver plan** pasa a ser un botón verde compacto (pill), más fácil de ver junto a las kcal.
- Las kcal del día siguen a la izquierda del botón, sin mezclarse con el CTA.
- Se quita la leyenda bajo el título («Toca un plato…»); eso ya se explica en el **Plan** semanal.

**Qué probar de este despliegue**
- [ ] Admin: en **Editar receta**, reordena pasos arrastrando el asa o con ↑ ↓ y guarda
- [ ] En **Plan**, toca **Informe semanal** → se abre el modal con barras vs objetivos y recomendaciones
- [ ] En **Hoy** → **Ver informe** (dosis) → botón verde **Informe semanal** abre el mismo modal
- [ ] El informe respeta la semana seleccionada en el Plan
- [ ] Si no hay «Ya comí», el texto indica que usa el plan; tras marcar comidas, usa lo consumido
- [ ] Sin perfil completo: aparece consejo de ir a Parámetros
- [ ] En **Hoy** no aparece la tarjeta grande de informe semanal en el scroll
- [ ] En **Hoy**, **Ver plan** se ve como botón verde y abre **Plan**
- [ ] Bajo «Plan de hoy» ya no aparece la leyenda de check / lápiz / papelera

#### 20 agosto 2026

**Comidas escaneadas / registradas · aviso nutricional**
- En platos **escaneados** o **registrados**, el mensaje ya no se etiqueta como **Tip de Sandra**.
- Se muestra como **Información** o **Advertencia** (según el tono), igual que el icono del detalle.
- **Tip de Sandra** solo aparece en recetas **generadas** (Escáner de despensa / generación).

**Compartir receta · macros**
- La imagen al **compartir** ya no usa las barras antiguas de macronutrientes.
- Los macros salen como **chips** (igual que en el detalle de la receta): proteínas, carbs, grasas y calorías.

**Compartir receta · etiquetas**
- Las pills de la imagen ya no muestran claves técnicas (`COMIDA_FUERA`, `DIET:ALTO_PROTEINA`…).
- Se ven textos claros (p. ej. **Escaneado**, **Almuerzo**, **Alto en proteína**), alineados con el detalle.
- En platos registrados/escaneados no se duplican badges internos (p. ej. no sale «Registrada» junto a «Escaneado»).

**Qué probar de este despliegue**
- [ ] Abre un plato **escaneado** → el aviso es **Información** o **Advertencia**, no «Tip de Sandra»
- [ ] Comparte ese plato → en la imagen tampoco dice Tip de Sandra
- [ ] Genera una receta en el **Escáner** → ahí sí aparece **Tip de Sandra**
- [ ] Abre una receta → **Compartir** → la imagen muestra macros en chips, sin barras verdes
- [ ] Los valores coinciden con los del detalle (kcal / proteínas, etc.)
- [ ] Comparte un plato **escaneado** o **registrado**: las etiquetas son legibles (sin guiones bajos ni `DIET:…`)
- [ ] Comparte una receta normal: comida / dieta salen con el mismo tipo de texto que en pantalla
#### 19 agosto 2026

**Onboarding animado (primer uso)**
- La primera vez que entras a **Hoy**, **Plan**, **Escáner** o **Recetas** aparece una guía paso a paso con spotlight y tooltip.
- Se resaltan los elementos clave de cada pantalla (banner de escaneo, hidratación, retos, racha y dosis nutricional en Hoy, días del plan, almuerzo y snacks / tentempié, lista de compra y copiar semana anterior en Plan, botón de cámara, ingredientes, secciones de recetas con «Ver más» y filtro por tipo de comida).
- El tooltip queda centrado sobre el elemento resaltado (incluye elementos dentro de menús desplegables como “Copiar semana anterior”), se re-ancora si el target aparece tarde y centra el elemento si está fuera del viewport.
- En **Perfil** hay un botón para **re-ver** el onboarding (reinicia la guía en las pantallas principales).
- Puedes avanzar tocando «Siguiente» o el fondo oscuro, o cerrar con la ✕.
- Cada pantalla recuerda que ya la viste (localStorage) y no vuelve a aparecer.
- **No** aparece en Perfil.

**Qué probar de este despliegue**
- [ ] Primera visita a **Hoy**: aparece la guía con pasos (bienvenida → escanea → agrega comidas → racha → dosis nutricional → hidratación → retos)
- [ ] Primera visita a **Plan**: guía con pasos (intro → días → almuerzo → snacks / tentempié → lista de compra → copiar semana anterior)
- [ ] En **Plan**, “Copiar semana anterior” debe enfocarse correctamente dentro del menú de acciones
- [ ] Primera visita a **Escáner**: guía con 3 pasos (intro → cámara → ingredientes)
- [ ] Primera visita a **Recetas**: guía con pasos (intro → Cocinar → Sandra → Favoritas → Registradas → filtro por tipo de comida)
- [ ] En **Perfil** → botón “Ver guía de inicio”: vuelve a mostrarse el onboarding en las pantallas principales
- [ ] Al volver a la misma pantalla **no** vuelve a aparecer la guía
- [ ] En **Perfil** nunca aparece guía
- [ ] Cerrar con ✕ también marca la pantalla como completada

#### 15 agosto 2026

**Escáner · cupo antes de detectar**
- Si no te quedan escaneos hoy, **no puedes abrir la cámara/galería** ni lanzar la detección de ingredientes.
- Aparece el aviso de escaneos agotados (igual que al generar receta).
- Así no se gasta Gemini en fotos de prueba cuando el cupo ya está a cero.

**Foto real OpenAI (Premium)**
- Sigue siendo **1 foto de prueba lifetime** (Free: ninguna).
- El servidor bloquea con más rigor si ya se usó o no quedan créditos (no llama a OpenAI).

**Administración · Uso de IA (solo admin)**
- En **Administración** aparece **Uso de IA (costes)**.
- Ves el **coste estimado** del periodo, con desglose **OpenAI** (fotos) y Gemini.
- Elige un **día** para ver gasto por **función** y por **usuario**, más el bloque **Gasto fotos OpenAI** del día.
- Bloque **Límites Gemini (nivel gratuito)**: RPM / TPM / RPD con aviso en rojo si se supera el tope.
- Bloque **Suscripción · análisis**: peticiones recomendadas **Gratis vs Premium** y precio mensual sugerido para cubrir el gasto OpenAI (con margen).
- Empieza a registrar datos **después** de aplicar la migración y del uso nuevo (no hay historial anterior).

**Qué probar de este despliegue**
- [ ] Con 0 escaneos: el botón **Escanear ahora** no abre cámara; sale el modal de límite
- [ ] Con escaneos: foto → detección → generar resta 1 (como antes)
- [ ] Premium: tras usar la foto real, no se vuelve a llamar a OpenAI
- [ ] Menú → **Administración** → **Uso de IA (costes)**
- [ ] Cambiar de día actualiza usuarios, funciones, OpenAI del día y el análisis
- [ ] Se ven barras Gemini RPM / TPM / RPD y el bloque de precio / cuotas Free–Premium
#### 14 agosto 2026

**Racha (Hoy)**
- Un día de racha ya no exige completar un **reto**.
- Cuenta si haces **cualquiera** de esto: un **vaso de agua**, **registrar una comida o snack**, usar el **Escáner** de despensa, o marcar un reto.
- Al tocar el primer vaso, el número naranja de **Racha** debe subir (si ese día aún no contaba).
- El aviso de **racha en riesgo** (por la tarde) también usa esta regla.

**Registrar lo que comí (Plan)**
- **Describir lo que comí** vuelve a ser **texto libre** (escribe y separa con comas; ya no hay catálogo de alimentos para elegir).
- Debajo del cuadro hay el enlace **«Cómo escribir lo que comí»** con ejemplos (cantidad, casera, sin azúcar…).
- En **Revisa los alimentos**, el **nombre del alimento no se puede editar**. Solo cantidad y unidad. Si las kcal no cuadran: **Atrás** y reescribe el texto.
- Café solo / media taza ~1–5 kcal; café con leche es otro alimento. Galleta de paquete ≠ galleta casera ≠ galleta casera sin azúcar.
- Al abrir el plato desde el plan, el detalle muestra las **mismas kcal** que la tarjeta (ya no salta a ~80).

**Mover un plato**
- En la tarjeta del plan, el botón de **flechas (mover)** pasa el plato a **Desayuno**, **Almuerzo** o **Cena** (si ya había uno, queda como complemento).

**Qué probar de este despliegue**
- [ ] Un vaso, registrar comida o un escaneo suben la **Racha** aunque no marques un reto
- [ ] Texto libre + comas + **Analizar alimentos**; el nombre no se edita en la revisión
- [ ] Enlace **«Cómo escribir lo que comí»**
- [ ] **Mover** un plato de Desayuno a Almuerzo (o Cena)
- [ ] Detalle del plato: mismas kcal que la tarjeta

---

### 🎯 Objetivo de la Beta

Probar las funciones principales de **IngeniaFood**: organizar comidas saludables de la semana, generar ideas a partir de lo que tienes en casa y disfrutar (o evaluar) la experiencia Premium.

Tu misión no es “romper el código”, sino **vivir la app como una usuaria real** y reportar:

- Errores de interfaz (botones que no responden, textos cortados, pantallas en blanco).
- Fallos de experiencia (pasos confusos, resultados raros, tiempos de espera largos sin aviso).
- Cualquier detalle que te haga dudar de *qué hacer a continuación*.

**Navegación principal** (barra inferior):

| Icono / pestaña | Nombre en pantalla |
| --- | --- |
| Casa / día | **Hoy** |
| Calendario | **Plan** |
| Cámara (centro) | **Escáner** |
| Libro | **Recetas** *(antes se llamaba Guardadas)* |
| Persona | **Perfil** |

---

### 1. 🔑 Registro y Acceso

#### Crear una cuenta
1. Abre la app (idealmente **instalada en el móvil**, desde la pantalla de inicio).
2. Si ves el aviso de instalación, pulsa **«Instalar App Ahora»** (o «Añadir a pantalla de inicio» en iPhone).
3. Entra en **Registro** / **Crear cuenta**.
4. Completa:
   - **Nombre y apellidos**
   - **Correo electrónico**
   - **Contraseña**
5. Pulsa **«Crear cuenta»**.
6. Deberías ver un mensaje del estilo: *revisa tu correo para confirmar*.
7. Abre el correo, confirma y vuelve a **Iniciar sesión**.

#### Iniciar sesión
1. Pantalla **«Iniciar sesión»**.
2. Escribe correo y contraseña.
3. Pulsa **«Iniciar sesion»** (o el botón equivalente).
4. Comprueba que llegas a la pestaña **Hoy**.

> Si cierras la app instalada (PWA) y al reabrir te pide **login**, entra con tu correo: **no** deberías ver la landing pública («Muy pronto disponible en versión Beta»). Si ya tenías sesión, deberías volver directo a **Hoy**.

Al cargar las pantallas principales (Hoy, Plan, Escáner, Recetas, Perfil, Retos, Parámetros) deberías ver un **esqueleto** con la forma de la pantalla (no solo un spinner o pantalla en blanco) hasta que lleguen los datos.

#### ¿Olvidaste la contraseña?
1. Pulsa **«¿Olvidaste tu contraseña?»**.
2. En **Recuperar contraseña**, introduce tu correo.
3. Pulsa **«Enviar enlace de recuperación»**.
4. Sigue el correo y comprueba que puedes entrar de nuevo.

#### Pase Premium de 24 horas (acceso temporal)
No hay un campo en pantalla para “escribir un código”. El pase llega así:

1. Entra con el **enlace de invitación** que te hayan pasado (o abre la app si ya tienes un pase pendiente).
2. Ve a la pestaña **Hoy**.
3. Busca el banner:
   - **«Pase Premium de 24 horas disponible»** o  
   - **«🎁 Pase 24H Premium»**
4. Lee el texto: algo como *«Actívalo ahora y desbloquea…»*.
5. Pulsa **«Desbloquea tu experiencia premium»**.
6. Debe aparecer un mensaje de éxito: *«¡Tu pase Premium de 24 horas ya está activo!…»*.
7. Comprueba que ves indicadores **Premium** (por ejemplo en la cabecera o al usar funciones PRO).
8. En el **Escáner**, con el pase activo deberías tener **20 escaneos al día** (Free solo tiene **5**).

#### Hoy · Vasos de agua
1. En **Hoy**, busca el bloque de **Agua de hoy**.
2. Si **aún no** configuraste vasos:
   - Debe verse una tarjeta invitando a configurar (no un hueco vacío).
   - Pulsa **«Configurar vasos de agua»** → vas a **Personalizar parámetros**.
3. Elige un número de vasos (ej. **8**) y guarda.
4. Vuelve a **Hoy**: deben aparecer los vasos tocables y el progreso (ej. `0/8`).
5. Toca **al menos un vaso**: el número de **Racha** (tarjeta naranja del tablero) debe subir si ese día aún no contaba.

#### Hoy · Racha
La racha **no** depende solo de los retos. Un día cuenta si haces **cualquiera** de esto:
- Completas un **reto**
- Tocas **al menos un vaso** de agua
- **Registras una comida** o un snack (foto o «Describir lo que comí»)
- Usas el **Escáner** de despensa

Si saltas un día completo, la racha vuelve a 0. El calendario naranja es la racha seguida; el gris es un día con actividad que ya no forma parte de la racha actual.

**Qué probar**
- [ ] Registro + confirmación de correo
- [ ] Login correcto e incorrecto (contraseña mala)
- [ ] Recuperación de contraseña
- [ ] Activar el pase de 24h desde **Hoy** (si te corresponde)
- [ ] Tras activar el pase, que las funciones PRO dejen de bloquearse durante ese tiempo
- [ ] Con pase 24h / Premium: **20** escaneos/día en Escáner (Free: **5**)
- [ ] Sin meta de agua: CTA en Hoy → configurar en parámetros → tracker visible
- [ ] Un vaso, registrar comida o un escaneo suben la **Racha** aunque no marques un reto

---

### 2. 🥗 Libro de Recetas (pestaña **Recetas**)

#### Dónde están las recetas
1. Abre la pestaña inferior **Recetas** (libro).
2. Título esperado: **«Recetas»**.
3. Debajo verás un subtítulo con el número de recetas del libro.
4. En la pantalla principal verás **filas por tipo** (carrusel horizontal, hasta **4** recetas por fila):
   - **Cocinar** — recetas tuyas para preparar (p. ej. del escáner de despensa)
   - **Sandra** — **Recetas de Sandra** (banco oficial + Instagram)
   - **Favoritas** — las marcadas con corazón
   - **Registradas** — comidas que ya comiste (foto o texto), en casa o fuera
5. Si hay más de 4, pulsa **«Ver más»**: entras a esa sección con **buscador + filtros** y las recetas en **2 columnas**.
6. La flecha atrás vuelve al listado con carruseles.

> Las recetas **sugeridas** también siguen apareciendo al elegir un plato desde el **Plan** → **«Elegir receta»** → **«Sugeridas»**.  
> **Nota:** el catálogo de Instagram **ya no está en el Escáner**; vive en **Recetas → Sandra**.

#### Buscar y filtrar
1. Entra a una sección con **Ver más**.
2. Usa el buscador (**«Buscar recetas...»**) y el botón de filtros (deslizadores).
3. Si en **Personalizar parámetros** tienes una dieta, el filtro de dieta suele arrancar aplicado.
4. En la hoja de filtros:
   - **Tipo de comida**: Todas, Desayunos, Almuerzos, Cenas, Snacks, Postres
   - **Dieta**: Todas las dietas + las del perfil
   - **Otros**: Ninguno, Airfryer, Sin Harinas
5. Pulsa **Ver resultados** o **Limpiar**.
6. Comprueba el aviso **«Filtro: …»** y **«Quitar»**.
7. Si tienes recetas antiguas en **Cocinar** / **Registradas** sin tipo de comida o dieta, puede aparecer **«Completar mis recetas»** en el listado principal.
8. Las recetas **nuevas** del escáner o registradas ya guardan dieta (y tipo si aplica).

#### Cómo se ve cada tarjeta de receta
En la lista, cada tarjeta debería mostrar:

- **Foto grande** a la izquierda (ocupa el borde de la tarjeta, sin mucho margen blanco).
- **Título** y **fecha** corta arriba a la derecha (ej. `8 ago 2026`).
- Etiquetas si aplica:
  - Tipo de comida: **Desayuno / Almuerzo / Snack / Cena** (también en **Registradas**)
  - Origen: **Escaneado** (verde menta + escáner) o **Registrada** (naranja + cubiertos)
  - Insignia **✨ Sandra** en listados/tarjetas; en el **detalle** se mantiene **Receta de Sandra**
  - En Registradas se ven **tipo + origen** juntos (ej. Almuerzo + Escaneado)
- **Calorías** (llama) y **tiempo** (reloj), si hay datos.
- **Macros** compactos: `…g P · …g C · …g G`.
- Acciones abajo a la derecha: **corazón**, **compartir**, **lápiz** (abrir/editar) y **papelera** (si es tuya).

#### Ver el detalle de una receta
1. Toca una tarjeta (foto, título o lápiz).
2. En el detalle, revisa:
   - Foto del plato
   - Etiquetas, tiempo / dificultad
   - **Macronutrientes**, **Ingredientes**, **Preparación**
   - **Tip de Sandra** / consejo experto (si existe)
   - Si viene de Instagram: botón **«Ver en Instagram»** encima de la foto (esquina inferior izquierda; abre el reel en otra pestaña)
3. Prueba: favorito, compartir, asignar al Plan (si aparece) y volver atrás.

**Qué probar**
- [ ] La pestaña inferior se llama **Recetas** (no “Guardadas”)
- [ ] Home: filas **Cocinar / Sandra / Favoritas / Registradas** en carrusel (máx. 4)
- [ ] **Ver más** abre la sección en **2 columnas** con buscador y filtros
- [ ] Flecha atrás vuelve a los carruseles
- [ ] Sección **Sandra** muestra catálogo (incl. Instagram) con insignia
- [ ] En detalle de Instagram aparece **«Ver en Instagram»** sobre la foto
- [ ] Búsqueda y filtros funcionan dentro de la sección
- [ ] Si aparece **«Completar mis recetas»**, al tocarlo mejora Cocinar/Registradas
- [ ] En **Registradas**, cada tarjeta muestra tipo (Desayuno/Almuerzo/Snack/Cena) y origen (Escaneado/Registrada)
- [ ] Desde **Ver más** de una sección, abrir una receta y **Volver** regresa a esa sección (no al listado general) y a la zona del grid donde estaba la tarjeta
- [ ] En detalle de receta (biblioteca): solo badge **«Imagen de referencia»** si aplica; el aviso «Ya usaste tu foto real de prueba…» solo aparece al generar desde el **Escáner**
- [ ] Favoritos se guardan al salir y volver a entrar

---

### 3. 📸 Creación de Recetas e Ingredientes

#### A) Escanear despensa
1. Abre la pestaña **Escáner**.
2. Lee el mensaje tipo **«Escanea tu despensa»** o **«Escanear Nevera o Despensa»**.
3. Prueba:
   - **«📷 Tomar foto a mi nevera»** / **«Escanear ahora»**, **o**
   - Añadir ingredientes a mano en **«Ingredientes a la mano»** / **«Tu Despensa»**.
4. En **«Confirmar ingredientes»**, revisa la lista, corrige si hace falta y continúa.
5. Pulsa **«✨ Generar Recetas…»** / **«✨ Buscar Recetas»** / **«Generar receta con mi despensa»**.
6. En el resultado, prueba las opciones **Clásica**, **Rápida** y **Fit** (algunas pueden pedir Premium).
7. Revisa pestañas **Ingredientes** y **Preparación**.
8. Guarda con:
   - **«🍳 Guardar en mi Plan / Cocinar»**, y/o
   - **«Guardar en mi recetario»**
9. En **Recetas → Cocinar**, la receta nueva debería filtrar por la **dieta de tus parámetros** (y por tipo de comida si el escáner lo indicó).

> El Escáner **solo** sirve para generar recetas con tu despensa. Las recetas de Instagram están en **Recetas → Sandra** (apartado B).  
> **Límite diario de escaneos:** cuenta **Free → 5**/día · **Premium o pase 24h → 20**/día. Si se agotan, verás el aviso de límite y **no podrás abrir la cámara** ni detectar ingredientes hasta mañana (o hasta tener más cupo).

#### B) Recetas de Sandra (incluye Instagram)
1. Ve a **Recetas** → sección **Sandra** (o **Ver más** en esa fila).
2. Deberías ver las recetas oficiales **y** las del catálogo de Instagram, con el **mismo estilo de tarjeta** que Cocinar / Favoritas / Registradas (foto, macros, acciones).
3. Abre una receta:
   - El detalle es el mismo layout que el resto (hero, ingredientes, preparación, tip…).
   - Si tiene reel, verás **«Ver en Instagram»** sobre la foto — ábrelo y comprueba que lleva al Instagram correcto.
   - **Admin**: en «Editar receta» puedes cambiar el **tipo de comida** (desayuno / almuerzo / cena / postre / snack), además de ingredientes y pasos. Tras guardar, comprueba que el filtro de Sandra y el badge del detalle reflejan el nuevo tipo.
4. Desde el **Plan** → **«Elegir receta»**, abre la pestaña **«Mis recetas»** (incluye las de Sandra) o ve a **Recetas → Sandra** desde la barra inferior:
   - Si llegaste desde el escáner con un hueco pendiente, verás un aviso de asignación.
   - Abre una receta y pulsa **«Añadir a este hueco»** (o el icono de calendario) para asignarla al plan.
5. Confirma que la receta aparece en el día del Plan.

#### C) Registrar lo que comí — escanear plato (función PRO / Premium)
Disponible desde el **Plan**, al elegir o cambiar un plato (en **hoy** o **días pasados**):

1. Ve a **Plan** y selecciona el día de hoy (o uno pasado).
2. En un hueco vacío pulsa **«Elegir receta»** (o el lápiz de **Cambiar plato**).
3. Encima de los tabs: bloque **«¿Ya comiste? Regístralo aquí»** (3 tarjetas de acción).
4. Pulsa **«Tomar foto del plato»** (badge **👑 PRO**).
5. Verás **Tomar foto del plato** con dos tarjetas (**Tomar foto** / **Elegir de galería**) en bloque crema; el picker de recetas **se oculta** (como en snacks). **Atrás** vuelve al picker; **Analizar alimentos** aparece después de elegir la foto.
6. Pulsa **Analizar alimentos**.
7. En **«Revisa los alimentos»**, ajusta cantidades si hace falta.
8. Pulsa **«Guardar y asignar al plan»**.
9. Comprueba que la comida aparece en el día con su nombre y calorías (no entra en la lista de compra).

> Sin Premium (ni pase 24h), debe abrirse el diálogo **«Función Premium»** en lugar de completar el flujo.

#### D) Describir lo que comí (función PRO)
1. Desde el mismo bloque **«¿Ya comiste? Regístralo aquí»**.
2. Pulsa **«Describir lo que comí»** (**👑 PRO**).
3. Describe qué comiste separando por **comas**. Incluye **cantidad** y **cómo es**. Debajo hay el enlace **«Cómo escribir lo que comí»** con ejemplos.
4. Pulsa **Analizar alimentos** → debe abrir la revisión (no un error de «imagen» si el texto es comida real).
5. En **Revisa los alimentos**, el **nombre del alimento no se puede editar**. Solo ajusta **cantidad y unidad**. Si las kcal no cuadran, pulsa **Atrás** y reescribe el texto (marca, casera, sin azúcar, gramos). En **«De dónde salen las calorías»** ves el cálculo de ahora.
6. Guarda en el plan y verifica el plato en **Plan** y, si aplica, en **Recetas → Registradas**.

**Qué probar (calorías)**
- [ ] Overnight oats / desayuno con avena en ml o taza: kcal razonables (no ~600 solo por 125 ml de avena)
- [ ] Banano/guineo + mantequilla de almendras/maní: kcal cercanas a lo esperado (~150–200 si es ½ pieza + ~17 g)
- [ ] Café solo / media taza de café ~1–5 kcal; café con leche es otro alimento
- [ ] El nombre del alimento en la revisión **no** se puede escribir; cantidad/unidad sí
- [ ] El enlace **«Cómo escribir lo que comí»** abre una lista de ejemplos (cantidad, comas, casera, sin azúcar…)

#### E) Snacks / tentempié
1. En **Plan**, baja a **🍪 Snacks / Tentempié**.
2. Si hay un snack registrado, verás su tarjeta (foto, título, kcal) con una **X** para descartarlo.
3. Pulsa el botón verde musgo oscuro tipo  
   **«✨ + Registrar snack • XXX kcal»** (o sin kcal si aún no hay snacks).
4. En el modal (mismo estilo que registrar comida):
   - Arriba: **Tomar foto del plato** y **Describir lo que comí**
   - Debajo: **Snacks de Sandra** en **rejilla de tarjetas** (foto, título, kcal), con **barra de buscar**
5. Prueba una tarjeta de Sandra, **Describir lo que comí** (texto libre + comas, igual que en comidas) y, si eres Premium, **foto**:
   - Tras **Tomar foto del plato**, verás **Tomar foto del snack** con dos tarjetas (**Tomar foto** / **Elegir de galería**) en bloque crema, igual que el menú del modal.
   - Tras elegir foto, aparece la vista con imagen grande y el botón **Analizar alimentos** (no antes).
6. Elimina un snack con la **X** y confirma que desaparece.

**Qué probar**
- [ ] Foto de despensa → ingredientes → receta generada
- [ ] Despensa manual sin foto
- [ ] Escáner **sin** pestaña «Desde Instagram» (solo despensa)
- [ ] Límite diario: Free **5** / Premium o pase 24h **20**
- [ ] Con 0 escaneos: **Escanear ahora** no abre cámara; modal de límite (sin llamar a Gemini)
- [ ] Recetas → Sandra: mismas tarjetas + detalle + «Ver en Instagram» sobre la foto
- [ ] Plan → Mis recetas / Recetas → Sandra → asignar al hueco
- [ ] Escaneo de plato servido (con y sin Premium) desde **¿Ya comiste? Regístralo aquí**
- [ ] Foto de comida: tarjetas cámara/galería → preview → **Analizar alimentos**
- [ ] **Describir lo que comí** (con y sin Premium): texto con varios alimentos (incl. **cebolla**) se analiza bien
- [ ] Tras analizar: el nombre del alimento no se edita; cantidad/unidad sí actualiza kcal; **«De dónde salen las calorías»** recomienda **Atrás** si no cuadran
- [ ] Café vs café con leche son ítems distintos; media taza de café ~1–5 kcal
- [ ] «Galleta» de paquete vs **galleta casera sin azúcar**: al escribir o cambiar el nombre, las kcal no son las mismas
- [ ] Al abrir esa receta desde el plan, el detalle muestra las **mismas kcal** que la tarjeta (no ~80)
- [ ] Registrar snack: foto / texto libre / tarjetas **Snacks de Sandra** + buscar + borrar
- [ ] Snack por foto: tarjetas cámara/galería → preview → **Analizar alimentos**

---

### 4. 📅 Planificador Semanal de Menús

1. Abre la pestaña **Plan**.
2. Título esperado: **«Tu plan semanal»**.
3. Cambia de día con el selector de la semana (Lunes… Domingo).
4. Revisa el **resumen superior del día**:
   - Nombre del día + fecha
   - Texto de ayuda: **«Toca un plato para verlo. Usa el check (Ya comí), mover, el lápiz o la papelera»**  
     *(ya no se habla de arrastrar comidas)*
   - **Círculo / donut** de progreso (ej. **2/3** comidas asignadas), en tono ámbar/dorado
   - **Calorías consumidas** a la derecha (ej. `915 kcal`) y debajo **«Objetivo: … kcal»**

#### Asignar recetas
1. En un hueco vacío de **☀️ Desayuno**, **🌤️ Almuerzo** o **🌙 Cena**, pulsa **«Elegir receta»**.
2. En el sheet verás el título del hueco (ej. **«Almuerzo del Martes»**) y:
   - Pestañas **«Sugeridas»** / **«Mis recetas»**
   - Buscador + icono de filtros
   - Según el tab activo, rejilla **3 columnas**:
     - Tab **Sugeridas** → **✨ Sugeridas de Sandra**
     - Tab **Mis recetas** → **📖 Mis Recetas**
   - Mientras carga: skeleton de tarjetas (no spinner solo)
   - Encima de los tabs, bloque separado (fondo crema): **«¿Ya comiste? Regístralo aquí»** con 3 acciones en este orden:
     1. **Escanear despensa**
     2. **Tomar foto del plato**
     3. **Describir lo que comí**
   - Debajo, sección **«Buscar una receta»** (tabs + buscador + filtros)
   - Pie fijo: aviso ámbar con icono (i): al guardar se asignará a ese hueco
3. Si pulsas **«Escanear despensa»**, confirma **«Continuar»** y genera/guarda una receta:
   - Al **Guardar**, aparece **«¿Añadir al …?»** → **«Añadir al plan»** o **«Solo guardar»**
4. Si eliges un plato de la rejilla, confirma la tarjeta en el plan:
   - Foto, título
   - **kcal** (icono llama) y **tiempo** (reloj)
   - **Badges de macros**: `…g P` (verde), `…g C` (naranja), `…g G` (rosa), si hay datos
   - Botones circulares de **check (Ya comí)**, **mover** (flechas), **lápiz** y **papelera** (el check solo en **hoy** o **días pasados**)
5. Con una comida ya puesta, pulsa el botón píldora con borde punteado **«Agregar complemento»**.
6. El complemento debe verse **anidado debajo** (fondo crema claro):
   - Etiqueta **«Agregado de Complemento:»**
   - Miniatura, nombre, kcal y acciones editar/eliminar

#### Cambiar, eliminar, mover o marcar «Ya comí»
1. **Lápiz** → **Cambiar plato** → elige otra receta.
2. **Flechas (mover)** → elige **Desayuno**, **Almuerzo** o **Cena**. El plato pasa a esa sección (si ya había uno, queda como complemento).
3. **Papelera** → confirma **«¿Quitar esta receta del día?»** → **«Quitar receta»**.
4. En **hoy** o un **día pasado**, con una receta del plan (no registrada por foto/texto):
   - Pulsa el **check** → badge **«Ya comí»** y aviso de que **no entra en la lista de compra**.
   - Vuelve a pulsar el check para **desmarcar**.
5. Toca el nombre/foto del plato para abrir el detalle y vuelve atrás.

#### Menú sugerido del día
1. Si faltan comidas, busca **«✨ Proponer menú del día»** o **«✨ Sugerir comidas que faltan»**.
2. Con Premium (o pase 24h) debería rellenar huecos vacíos.
3. Sin Premium, debería aparecer el aviso de **Función Premium**.

#### Sobre «Ya comí» y el plan
- **«Ya comí»** confirma que cocinaste/comiste el plato del plan: la receta **sigue visible**, pero **sale de la lista de compra**.
- **«¿Ya comiste? Regístralo aquí»** (foto o texto) es para poner lo que comiste de verdad cuando no era (solo) la receta planificada; tampoco entra en la lista de compra.
- El **donut del día** (ej. 3/3) sube al asignar Desayuno, Almuerzo y Cena.
- Las **calorías del día** y el **objetivo** se actualizan al añadir/quitar platos y snacks.
- En **Hoy**, los **retos** sí pueden mostrar estados tipo **Completado / Pendiente** (flujo aparte del menú).

> **Nota:** para cambiar un plato de **desayuno** a **almuerzo** o **cena**, usa el botón de **flechas (mover)**. No hace falta borrar y volver a registrar.

**Qué probar**
- [ ] Donut + kcal / objetivo se ven claros y cambian al editar el día
- [ ] Macros visibles en las tarjetas de comida (si la receta los tiene)
- [ ] Picker: rejilla 3 cols + skeleton al cargar + pie con 3 acciones + aviso (i) ámbar
- [ ] Escanear despensa → diálogo Continuar → al Guardar: **Añadir al plan** vs **Solo guardar**
- [ ] Complemento anidado debajo del plato principal
- [ ] Botón «Agregar complemento» en estilo píldora
- [ ] CTA de snacks verde musgo con ✨ y kcal
- [ ] Proponer menú del día (Premium vs Free)
- [ ] **Mover** un plato (p. ej. de Desayuno a Almuerzo): desaparece del origen y aparece en el destino
- [ ] **Copiar semana anterior** (si hay menú la semana previa)
- [ ] Navegar entre semanas (anterior / siguiente)

---

### 5. 🛒 Lista de la Compra Automática

1. En **Plan**, pulsa **«Lista de compras»**.
2. Se abre un panel con el rango de fechas de la semana.
3. Panel premium compacto: fondo crema, categorías en tarjetas, cantidad en píldora verde y filas densas.
4. Las cantidades se **aproximan y unifican** cuando se puede; si falta dato, solo se muestra el nombre (sin guión).
5. La lista **solo cuenta platos de hoy y días futuros** (los días pasados no suman).
6. Un plato marcado **«Ya comí»** o una comida **registrada** (foto/texto) **no** aporta ingredientes.
7. Prueba:
   - **Quitar** un ingrediente de la lista (icono de papelera / quitar).
   - **«Copiar lista»** y pegarla en Notas o WhatsApp para verificar el texto.
8. Vacía el plan de un día futuro, regenera o vuelve a abrir la lista y mira si el contenido tiene sentido.

> **Nota para testers:** la lista **no usa casillas de “comprado”**. La forma de gestionarla es **quitar ítems**, marcar **Ya comí**, o **copiar** la lista completa.

**Qué probar**
- [ ] Panel compacto y legible (cantidad | nombre, sin emojis)
- [ ] Cantidades unificadas cuando se puede; sin guión si falta dato
- [ ] Lista vacía cuando no hay recetas pendientes (o solo hay días pasados / Ya comí / registradas)
- [ ] Lista con varias recetas de hoy/futuro (ingredientes agrupados, sin duplicados raros)
- [ ] Tras **Ya comí** en un plato de hoy, al reabrir la lista esos ingredientes ya no están
- [ ] Días pasados no inflan la lista aunque tengan recetas cocinables
- [ ] Quitar un ítem y copiar la lista

---

### 6. 💎 Suscripción y Pase Premium

> **Importante para testers:** ser tester **no** te da Premium automático. Empiezas en **Free** (5 escaneos/día y funciones PRO bloqueadas) para poder probar el mismo recorrido que una usuaria real. Para pasar a Premium eliges una de estas dos vías:
> 1. **Pase 24h** — banner en **Hoy** → **«Desbloquea tu experiencia premium»**
> 2. **Suscripción** — en **Perfil**, bloque **Suscripción** / **IngeniaFood Premium** → checkout de prueba (Paddle)

#### Dónde aparece el diálogo de Premium
Prueba disparar **«Función Premium»** desde acciones como:

- Proponer menú del día con IA  
- Escanear plato servido / **Describir lo que comí**  
- Foto instantánea de snack  
- Alternativas de receta (**Rápida / Fit**) o filtros avanzados del escáner  
- Foto real del plato (si te lo ofrece)

En el diálogo deberías ver:

- Título **«Función Premium»**
- Explicación de la función bloqueada
- Botón **«Desbloquear Premium»** (o indicación de activar el pase desde **Hoy**)
- **«Entendido»** para cerrar

#### Flujo de upgrade / pago de prueba
1. Ve a **Perfil** (si eres tester verás bloque **Suscripción** / **IngeniaFood Premium**).
2. Pulsa **«Upgrade a Premium»** o **«Desbloquear Premium»**.
3. Debe abrirse la pasarela de pago de prueba (pantalla de checkout).
4. Completa el flujo de **pago de prueba** que os indiquen el equipo (tarjeta de prueba / entorno de ensayos).
5. Tras el éxito, vuelve a la app y comprueba:
   - Badge o estado **Premium**
   - Que la función que estaba bloqueada ahora funciona
6. Si aplica: **«Gestionar suscripción»**.

#### Pase temporal vs suscripción
- Con pase 24h: mensaje tipo **«Premium temporal activo hasta {fecha}»**.
- Con pase o suscripción activa: **20 escaneos/día** en el Escáner (Free: **5**).
- Comprueba qué pasa cuando el pase **caduca** (vuelven los bloqueos PRO y el límite de escaneos a **5**/día).

**Qué probar**
- [ ] Como tester: empezar en Free (paywall visible) sin Premium automático
- [ ] Activar pase 24h desde **Hoy** y comprobar Premium temporal
- [ ] Paywall claro (no pantalla en blanco)
- [ ] Cerrar con **Entendido** sin romper la app
- [ ] Completar checkout de prueba desde **Perfil** y volver con Premium activo
- [ ] Función bloqueada → upgrade → misma función desbloqueada
- [ ] Escaneos/día: Free 5 → Premium/pase 20 (y vuelta a 5 al caducar el pase)

---

### 7. 🎁 Programa de Invitaciones / Referidos

En esta versión **no hay un botón “Invitar amigos” visible dentro de la app**.

El flujo que debéis validar es:

1. El equipo (o una persona con enlace) **comparte un enlace de invitación**.
2. La persona invitada **abre ese enlace** e inicia sesión / se registra.
3. En **Hoy** aparece el **Pase Premium de 24 horas** pendiente de activar.
4. La invitada pulsa **«Desbloquea tu experiencia premium»** y disfruta el pase.

**Qué probar (como invitada)**
- [ ] Abrir el enlace de invitación en móvil
- [ ] Registrarse o iniciar sesión
- [ ] Ver y activar el banner de 24h en **Hoy**
- [ ] Confirmar que el pase se aplica a la cuenta correcta

**Qué probar (como quien invita)**  
Si el equipo os da un enlace o código para compartir:

- [ ] Compartir por WhatsApp / correo
- [ ] Verificar que la otra persona recibe el pase (no hace falta que veáis un “contador de referidos” en pantalla: puede no existir aún)

> **No confundir** con **«Compartir receta»** (eso genera/envía la imagen de un plato, no una invitación).

---

### 8. 🔔 Notificaciones (campana + push del sistema)

#### Activar en el móvil
1. Instala la app en la **pantalla de inicio** (PWA). En iPhone esto es necesario para push en segundo plano.
2. En **Hoy** o en **Personalizar parámetros**, acepta las notificaciones si aparece el aviso.
3. En el sistema del móvil, confirma que IngeniaFood tiene permiso de notificaciones **activado**.

#### Qué deberías recibir sin tener la app abierta
Con push activado, las alertas del sistema pueden llegar **aunque no tengas la app abierta** (el servidor las envía un par de veces al día), por ejemplo:
- Tip de Sandra del día
- Recordatorio de agua (media jornada)
- Racha en riesgo (por la tarde: si llevas racha y hoy aún no hay vaso, comida, escáner ni reto)
- Huecos vacíos del plan de hoy
- Reenganche si llevas varios días sin entrar
- Pase Premium pendiente de activar

> La campana **dentro** de la app sigue mostrando el historial al abrir IngeniaFood.

**Qué probar**
- [ ] Activar notificaciones y ver el permiso concedido en el móvil
- [ ] Cerrar la app por completo y comprobar que llega al menos un aviso del sistema (agua / tip / plan)
- [ ] Al tocar la notificación, se abre la pantalla correcta (Hoy / Plan / Recetas…)
- [ ] Si no llega nada en segundo plano: revisar permiso del sistema e instalación PWA

---

### 9. 🛡️ Administración (solo cuenta admin)

El panel **ya no está en Perfil**. Acceso:

1. Abre el **menú hamburguesa** (arriba a la izquierda).
2. Debes ver el ítem **Administración** (solo visible para la cuenta admin).
3. Entra al hub:
   - **Herramientas**: Administrar usuarios, **Uso de IA (costes)**, **Recetas por usuario**, Importar receta, Banco de imágenes, Editar catálogo (Instagram).
   - **Recetas de Sandra**: listado del catálogo oficial.
4. Desde las herramientas `/admin/…`, el enlace **Volver** regresa a **Administración**, no a Perfil.

> Los pases Premium de **24h** caducados se limpian en segundo plano (junto al cron de notificaciones, 2×/día) y al usar la app: `is_premium` vuelve a Free si no hay suscripción Paddle. El código canjeado (`WELCOME`, etc.) se conserva en historial.

#### Uso de IA / costes (admin)
1. Menú → **Administración** → **Uso de IA (costes)**.
2. Arriba: coste del periodo, gasto OpenAI, nº de fotos y llamadas.
3. **Límites Gemini**: RPM / TPM / RPD del día (rojo si se pasó el tope free).
4. **Gasto fotos OpenAI** del día elegido ($ / imagen calibrado con tu factura).
5. **Suscripción · análisis**: cuotas recomendadas Gratis vs Premium y precio mensual sugerido.
6. En **Por día**, pulsa una fecha para filtrar.
7. Debajo: desglose por **función** y por **usuario**.
8. Nota: cifras orientativas; hace falta uso **después** de activar el registro en la base de datos.

#### Administrar usuarios
1. Menú → **Administración** → **Administrar usuarios**.
2. Arriba verás el total y cuántos **usaron pase 24h**.
3. Usa los chips **Solo testers** / **Solo usaron pase 24h**.
4. Columna **Pase 24h**:
   - **Activo** — lo tienen en curso (con fecha de fin)
   - **Usado (caducado)** — ya lo activaron y terminó (p. ej. código WELCOME)
   - **Disponible (sin activar)** — lo tienen pendiente en Hoy
   - **No usado**
5. También puedes marcar Tester / Premium y límites de escaneo.

#### Recetas por usuario (admin)
1. Menú → **Administración** → **Recetas por usuario**.
2. Verás un resumen arriba (cuántos tienen recetas, cuántos usaron escáner…).
3. En cada usuario:
   - **Total**, **Propias** (para cocinar), **Escáner despensa**, **Escáner plato**, **Fuera texto**.
   - Badge **Sí usó escáner** / **No usó escáner** y escaneos de hoy.
4. Prueba buscar por email y los chips **Solo con recetas** / **Solo usaron escáner**.

#### Recetas de Sandra (admin)
1. Menú → **Administración** → **Administrar recetas de Sandra**.
2. Verás todas las recetas del catálogo (busca por título o filtra **Solo sin dieta** / **Solo sin macros**).
3. En cada tarjeta:
   - Marca uno o varios **tipos de dieta** y pulsa **Guardar dietas**.
   - Si no marcas ninguna, queda como sin restricciones.
   - **Editar** abre la ficha de la receta (ingredientes, pasos, tipo de comida, Instagram).
4. Asignación masiva con IA:
   - Pulsa **Completar N con IA** (solo rellena las que no tienen dieta o macros; no pisa datos ya guardados).
   - Puedes **Detener** a mitad de proceso.
   - Al terminar, revisa chips de dieta y badges «Con macros» / «Sin macros».
5. Las dietas ayudan a que el plan / sugerencias respeten la preferencia del usuario.

**Qué probar**
- [ ] Como admin: el ítem **Administración** aparece en el menú
- [ ] Como usuaria normal: ese ítem **no** aparece
- [ ] Hub: **Uso de IA (costes)** abre el panel de consumo diario
- [ ] En Uso de IA: Gemini RPM/TPM/RPD, gasto OpenAI del día y análisis de suscripción
- [ ] Perfil **ya no** muestra el bloque «Panel de administración»
- [ ] Los accesos de herramientas abren bien y vuelven al hub
- [ ] **Administrar usuarios**: columna Pase 24h + filtros Solo testers / Solo usaron pase 24h
- [ ] **Recetas por usuario**: lista con totales, propias vs escáner y «Sí/No usó escáner»
- [ ] Listado de Recetas de Sandra carga y permite buscar / filtrar
- [ ] Guardar una o varias dietas en una receta y recargar: se mantienen
- [ ] **Completar con IA** actualiza solo pendientes (dieta y/o macros) y muestra progreso
- [ ] Tras la IA, una receta que antes no tenía macros muestra kcal / P·C·G en Recetas → Sandra
- [ ] **Editar** abre el detalle y permite cambiar contenido (admin)

---

### 🐞 ¿Cómo reportar un error?

Los fallos de la beta se gestionan en **Jira** (proyecto **IF**). Ahí el equipo los ve en el tablero Kanban y les da seguimiento.

#### Dónde crear el ticket
1. Entra al tablero de IngeniaFood:  
   **[Abrir tablero Kanban en Jira](https://ingeniafood.atlassian.net/jira/software/projects/IF/boards/2?filter=&groupBy=none)**
2. Crea una **incidencia / issue** nueva (tipo Bug o Task, según te indiquen).
3. Pon un **título corto y claro**, por ejemplo:  
   `Beta · Plan · Snack CTA no guarda` o `Beta · Recetas · Chip Sandra vacío`
4. En la **descripción**, pega la plantilla de abajo (completa todos los puntos que puedas).
5. **Adjunta** captura o vídeo corto.
6. Si puedes, añade etiquetas útiles: `beta`, `android` / `ios` / `web`, y la pantalla (`plan`, `recetas`, `escaner`…).

> Si aún no tienes acceso a Jira, pide a Sandra que te invite al proyecto **IF**. Sin acceso no podrás crear el ticket.

#### Checklist de lo que debe incluir el ticket

1. **📸 Captura de pantalla o vídeo corto** del problema (idealmente mostrando el botón o mensaje exacto).
2. **📱 Dispositivo usado**
   - iPhone / Android / ordenador  
   - Modelo aproximado y navegador (Safari, Chrome…) si lo sabes  
3. **🧭 ¿Qué estabas intentando hacer** cuando ocurrió el fallo?  
   Ejemplo: *“En Plan → Sábado → Elegir receta → Escanear plato servido → al pulsar Analizar se quedó cargando”*.  
   Otro ejemplo: *“En Recetas → chip Sandra → la tarjeta no muestra macros”*.
4. **🔁 ¿Se puede repetir?** (siempre / a veces / solo una vez)
5. **👤 Estado de tu cuenta** (Free / Pase 24h / Premium), si lo sabes.
6. **🕐 Fecha y hora aproximada** del fallo.

#### Plantilla rápida para pegar en Jira

```text
🐛 Error Beta IngeniaFood

Qué hacía:
Dispositivo:
Pantalla / pestaña:
Qué esperaba:
Qué ocurrió:
Se puede repetir: Sí / No / A veces
Captura o vídeo: (adjunto)
Cuenta: Free / Pase 24h / Premium
```

**Enlace directo al tablero:** https://ingeniafood.atlassian.net/jira/software/projects/IF/boards/2?filter=&groupBy=none

---

### ✅ Ruta sugerida de una sesión de prueba (30–45 min)

1. Instalar app → registro / login  
2. Activar pase 24h (si aplica) y comprobar **20** escaneos/día  
3. Escáner de despensa → guardar una receta  
4. **Hoy**: si no hay vasos, CTA de agua → configurar → tracker; comprueba que un vaso sube la **Racha**  
5. Activar notificaciones push → cerrar app → comprobar aviso del sistema  
6. **Recetas**: filas **Cocinar / Sandra / Favoritas / Registradas** + Ver más en Sandra (reel Instagram si aplica)  
7. **Plan**: llenar un día (donut + macros) + complemento + snack CTA; desde el picker, **Escanear despensa** con confirmación al Guardar  
8. Lista de compras → copiar  
9. Probar una función PRO (plato servido abajo del picker, o menú del día)  
10. Perfil: revisar estado Premium  
11. *(Solo admin)* Menú → **Administración** → Recetas de Sandra: Completar con IA + revisar 1 ficha  
12. Reportar el fallo en **Jira** (tablero IF) con captura + plantilla


¡Gracias por ayudar a pulir IngeniaFood! 💚
