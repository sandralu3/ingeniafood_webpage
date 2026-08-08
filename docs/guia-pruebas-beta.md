# 📱 Guía de Pruebas Beta — IngeniaFood

> Documento para testers. Lenguaje de **pantalla**: lo que ves, tocas y experimentas.  
> Última actualización: **8 agosto 2026**

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

**Qué probar**
- [ ] Registro + confirmación de correo
- [ ] Login correcto e incorrecto (contraseña mala)
- [ ] Recuperación de contraseña
- [ ] Activar el pase de 24h desde **Hoy** (si te corresponde)
- [ ] Tras activar el pase, que las funciones PRO dejen de bloquearse durante ese tiempo

---

### 2. 🥗 Libro de Recetas (pestaña **Recetas**)

#### Dónde están las recetas
1. Abre la pestaña inferior **Recetas** (libro).
2. Título esperado: **«Recetas ✨»**.
3. Debajo verás un subtítulo con el número de recetas del libro.
4. Prueba las **píldoras / chips** de sección (fila horizontal):
   - **Mías** — tus recetas del recetario personal
   - **Sandra** — **Recetas de Sandra** del banco oficial (insignia «Receta de Sandra»)
   - **Favoritas** — las marcadas con corazón
   - **Fuera** — comidas registradas fuera de casa (escaneadas o escritas)

> El chip activo se ve en verde suave (salvia), con el contador y pequeños ✨.  
> Las recetas **sugeridas** también siguen apareciendo al elegir un plato desde el **Plan** → **«Elegir receta»** → **«Sugeridas»**.

#### Buscar y filtrar
1. Usa el buscador en forma de **píldora** (**«Buscar recetas...»**), con fondo crema/champagne suave.
2. A la derecha, el botón circular de filtros (icono de **deslizadores** / sliders).
3. En el menú de filtros prueba:
   - **Todas · Desayunos · Almuerzos · Cenas · Snacks · Airfryer · Sin Harinas**
4. Comprueba el aviso **«Filtro: …»** y el botón **«Quitar»**.

#### Cómo se ve cada tarjeta de receta
En la lista, cada tarjeta debería mostrar:

- **Foto grande** a la izquierda (ocupa el borde de la tarjeta, sin mucho margen blanco).
- **Título** y **fecha** corta arriba a la derecha (ej. `8 ago 2026`).
- Etiquetas de origen si aplica:
  - **Escaneado** (verde menta + icono de escáner)
  - **Comida fuera** (naranja/melocotón + cubiertos)
  - O insignia **Receta de Sandra** / tipo de comida (Desayuno, Cena…)
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
3. Prueba: favorito, compartir, asignar al Plan (si aparece) y volver atrás.

**Qué probar**
- [ ] La pestaña inferior se llama **Recetas** (no “Guardadas”)
- [ ] Chip **Sandra** muestra recetas oficiales con insignia
- [ ] **Mías / Favoritas / Fuera** filtran bien
- [ ] Búsqueda y filtros de categoría funcionan
- [ ] Las tarjetas se leen bien en móvil (sin textos cortados)
- [ ] Favoritos se guardan al salir y volver a entrar

---

### 3. 📸 Creación de Recetas e Ingredientes

#### A) Escanear despensa
1. Abre la pestaña **Escáner**.
2. Elige el modo **«Escáner»** / **«Escanear despensa»**.
3. Lee el mensaje tipo **«Escanea tu despensa»** o **«Escanear Nevera o Despensa»**.
4. Prueba:
   - **«📷 Tomar foto a mi nevera»** / **«Escanear ahora»**, **o**
   - Añadir ingredientes a mano en **«Ingredientes a la mano»** / **«Tu Despensa»**.
5. En **«Confirmar ingredientes»**, revisa la lista, corrige si hace falta y continúa.
6. Pulsa **«✨ Generar Recetas…»** / **«✨ Buscar Recetas»** / **«Generar receta con mi despensa»**.
7. En el resultado, prueba las opciones **Clásica**, **Rápida** y **Fit** (algunas pueden pedir Premium).
8. Revisa pestañas **Ingredientes** y **Preparación**.
9. Guarda con:
   - **«🍳 Guardar en mi Plan / Cocinar»**, y/o
   - **«Guardar en mi recetario»**

#### B) Importar desde Instagram / catálogo
1. En **Escáner**, cambia a **«Desde Instagram»**.
2. Deberías ver algo como **«Catálogo & Instagram»** (*recetas virales…*).
3. Explora las tarjetas y prueba **«Añadir al plan»** / **«Asignar al plan»**.
4. Si pide el día y la comida, elige **hoy** (o el día que quieras) y confirma.

#### C) Escanear plato servido (función PRO / Premium)
Disponible desde el **Plan**, al elegir o cambiar un plato (en **hoy** o **días pasados**):

1. Ve a **Plan** y selecciona el día de hoy (o uno pasado).
2. En un hueco vacío pulsa **«Elegir receta»** (o el lápiz de **Cambiar plato**).
3. Busca el bloque **«¿Comiste fuera?»**.
4. Pulsa **«📸 Escanear plato servido (IA)»** (badge **👑 PRO**).
5. Elige **Tomar Foto** o **Elegir de la Galería**.
6. Pulsa **Analizar alimentos**.
7. En **«Revisa los alimentos»**, ajusta cantidades si hace falta.
8. Pulsa **«Guardar y asignar al plan»**.
9. Comprueba que la comida aparece en el día con su nombre y calorías.

> Sin Premium (ni pase 24h), debe abrirse el diálogo **«Función Premium»** en lugar de completar el flujo.

#### D) Registrar comida rápida (función PRO)
1. Desde el mismo bloque **«¿Comiste fuera?»**.
2. Pulsa **«✍️ Registrar comida rápida»** (**👑 PRO**).
3. Describe qué comiste (ej.: *pechuga, arroz, ensalada*).
4. Sigue la revisión de alimentos y guarda en el plan.
5. Verifica el plato en **Plan** y, si aplica, en **Recetas → Fuera**.

#### E) Snacks / tentempié
1. En **Plan**, baja a **🍪 Snacks / Tentempié**.
2. Si hay un snack registrado, verás su tarjeta (foto, título, kcal) con una **X** para descartarlo.
3. Usa los **chips rápidos** grises (`+ Manzana`, etc.).
4. Pulsa el botón verde musgo oscuro tipo  
   **«✨ + Registrar snack • XXX kcal»** (o sin kcal si aún no hay snacks).
5. Prueba registro por texto y, si eres Premium, **foto instantánea**.
6. Elimina un snack con la **X** y confirma que desaparece.

**Qué probar**
- [ ] Foto de despensa → ingredientes → receta generada
- [ ] Despensa manual sin foto
- [ ] Flujo Instagram / catálogo hasta el plan
- [ ] Escaneo de plato servido (con y sin Premium)
- [ ] Comida rápida (con y sin Premium)
- [ ] Registrar y borrar snacks (chips + botón CTA)

---

### 4. 📅 Planificador Semanal de Menús

1. Abre la pestaña **Plan**.
2. Título esperado: **«Tu plan semanal»**.
3. Cambia de día con el selector de la semana (Lunes… Domingo).
4. Revisa el **resumen superior del día**:
   - Nombre del día + fecha
   - Texto de ayuda: **«Toca un plato para verlo, o usa el lápiz y la papelera para editarlo»**  
     *(ya no se habla de arrastrar comidas)*
   - **Círculo / donut** de progreso (ej. **2/3** comidas asignadas), en tono ámbar/dorado
   - **Calorías consumidas** a la derecha (ej. `915 kcal`) y debajo **«Objetivo: … kcal»**

#### Asignar recetas
1. En un hueco vacío de **☀️ Desayuno**, **🌤️ Almuerzo** o **🌙 Cena**, pulsa **«Elegir receta»**.
2. En **«Elige una receta»** prueba:
   - Pestaña **«Sugeridas»**
   - Pestaña **«Mis recetas»**
   - Buscador y filtros
3. Selecciona un plato y confirma la tarjeta:
   - Foto, título
   - **kcal** (icono llama) y **tiempo** (reloj)
   - **Badges de macros**: `…g P` (verde), `…g C` (naranja), `…g G` (rosa), si hay datos
   - Botones circulares de **lápiz** y **papelera**
4. Con una comida ya puesta, pulsa el botón píldora con borde punteado **«Agregar complemento»**.
5. El complemento debe verse **anidado debajo** (fondo crema claro):
   - Etiqueta **«Agregado de Complemento:»**
   - Miniatura, nombre, kcal y acciones editar/eliminar

#### Cambiar o eliminar
1. **Lápiz** → **Cambiar plato** → elige otra receta.
2. **Papelera** → confirma **«¿Quitar esta receta del día?»** → **«Quitar receta»**.
3. Toca el nombre/foto del plato para abrir el detalle y vuelve atrás.

#### Menú sugerido del día
1. Si faltan comidas, busca **«✨ Proponer menú del día»** o **«✨ Sugerir comidas que faltan»**.
2. Con Premium (o pase 24h) debería rellenar huecos vacíos.
3. Sin Premium, debería aparecer el aviso de **Función Premium**.

#### Sobre “marcar como completada”
En esta versión **no hay un botón “Marcado como comido / completado”** por plato.  
Lo que sí debes comprobar:

- Que el **donut del día** (ej. 3/3) sube al asignar Desayuno, Almuerzo y Cena.
- Que las **calorías del día** y el **objetivo** se actualizan al añadir/quitar platos y snacks.
- En **Hoy**, los **retos** sí pueden mostrar estados tipo **Completado / Pendiente** (flujo aparte del menú).

> **Nota:** el arrastre entre huecos **no está operativo**; no intentes “arrastrar” comidas. Usa lápiz / papelera / elegir receta.

**Qué probar**
- [ ] Donut + kcal / objetivo se ven claros y cambian al editar el día
- [ ] Macros visibles en las tarjetas de comida (si la receta los tiene)
- [ ] Complemento anidado debajo del plato principal
- [ ] Botón «Agregar complemento» en estilo píldora
- [ ] CTA de snacks verde musgo con ✨ y kcal
- [ ] Proponer menú del día (Premium vs Free)
- [ ] **Copiar semana anterior** (si hay menú la semana previa)
- [ ] Navegar entre semanas (anterior / siguiente)

---

### 5. 🛒 Lista de la Compra Automática

1. En **Plan**, pulsa **«Lista de compras»**.
2. Se abre un panel con el rango de fechas de la semana.
3. Comprueba que aparecen ingredientes agrupados (verduras, proteínas, lácteos, despensa, etc.).
4. Prueba:
   - **Quitar** un ingrediente de la lista (icono de papelera / quitar).
   - **«Copiar lista»** y pegarla en Notas o WhatsApp para verificar el texto.
5. Vacía el plan de un día, regenera o vuelve a abrir la lista y mira si el contenido tiene sentido.

> **Nota para testers:** la lista **no usa casillas de “comprado”**. La forma de gestionarla es **quitar ítems** o **copiar** la lista completa.

**Qué probar**
- [ ] Lista vacía cuando no hay recetas en la semana
- [ ] Lista con varias recetas (ingredientes agrupados, sin duplicados raros)
- [ ] Quitar un ítem y copiar la lista

---

### 6. 💎 Suscripción y Pase Premium

#### Dónde aparece el diálogo de Premium
Prueba disparar **«Función Premium»** desde acciones como:

- Proponer menú del día con IA  
- Escanear plato servido / registrar comida rápida  
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
- Comprueba qué pasa cuando el pase **caduca** (vuelven a aparecer los bloqueos).

**Qué probar**
- [ ] Paywall claro (no pantalla en blanco)
- [ ] Cerrar con **Entendido** sin romper la app
- [ ] Completar checkout de prueba y volver con Premium activo
- [ ] Función bloqueada → upgrade → misma función desbloqueada

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
2. Activar pase 24h (si aplica)  
3. Escáner de despensa → guardar una receta  
4. **Recetas**: revisar chips **Mías / Sandra / Favoritas / Fuera** + una tarjeta  
5. **Plan**: llenar un día (donut + macros) + complemento + snack CTA  
6. Lista de compras → copiar  
7. Probar una función PRO (plato servido o menú del día)  
8. Perfil: revisar estado Premium  
9. Reportar el fallo en **Jira** (tablero IF) con captura + plantilla


¡Gracias por ayudar a pulir IngeniaFood! 💚
