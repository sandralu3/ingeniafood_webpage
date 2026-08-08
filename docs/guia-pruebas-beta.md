# 📱 Guía de Pruebas Beta — IngeniaFood

> Documento para testers. Lenguaje de **pantalla**: lo que ves, tocas y experimentas.  
> Última actualización: agosto 2026

---

### 🎯 Objetivo de la Beta

Probar las funciones principales de **IngeniaFood**: organizar comidas saludables de la semana, generar ideas a partir de lo que tienes en casa y disfrutar (o evaluar) la experiencia Premium.

Tu misión no es “romper el código”, sino **vivir la app como una usuaria real** y reportar:

- Errores de interfaz (botones que no responden, textos cortados, pantallas en blanco).
- Fallos de experiencia (pasos confusos, resultados raros, tiempos de espera largos sin aviso).
- Cualquier detalle que te haga dudar de *qué hacer a continuación*.

**Navegación principal** (barra inferior):


| Icono / pestaña | Nombre en pantalla |
| --------------- | ------------------ |
| Casa / día      | **Hoy**            |
| Calendario      | **Plan**           |
| Cámara (centro) | **Escáner**        |
| Libro           | **Guardadas**      |
| Persona         | **Perfil**         |


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



### 2. 🥗 Banco de Recetas y Exploración



#### Dónde están las recetas

1. Abre la pestaña **Guardadas**.
2. Título esperado: **«Recetas guardadas»**.
3. Prueba las pestañas internas:
  - **Guardadas** — tu recetario
  - **Favoritas** — las que marcaste con corazón
  - **Fuera** — comidas registradas fuera de casa

> Las recetas **sugeridas del sistema** (incluyendo snacks y otras ideas listas) también aparecen al elegir un plato desde el **Plan** → **«Elegir receta»** → pestaña **«Sugeridas»**.



#### Buscar y filtrar

1. Usa el campo **«Buscar recetas...»**.
2. Abre el menú de filtros (icono ⋮ o similar) y prueba:
  - **Todas**
  - **Desayunos**
  - **Almuerzos**
  - **Cenas**
  - **Snacks**
  - **Airfryer**
  - **Sin Harinas**
3. Comprueba el chip **«Filtro: …»** y el botón **«Quitar»**.



#### Ver el detalle de una receta

1. Toca una tarjeta de receta.
2. En el detalle, revisa que puedas ver:
  - Foto del plato
  - Etiquetas (Desayuno, Postre, Snack, Sin Harinas, etc.)
  - Tiempo / dificultad (si aparecen)
  - **Macronutrientes** (proteínas, carbohidratos, grasas, calorías)
  - **Ingredientes**
  - **Preparación** (pasos)
  - **Tip de Sandra** / consejo experto (si existe)
3. Prueba acciones:
  - Marcar / desmarcar **favorito**
  - **Compartir** (imagen de la receta)
  - Asignar al **Plan** (si el botón está disponible)
  - Volver atrás y comprobar que regresas al sitio correcto

**Qué probar**

- [ ] Búsqueda por nombre encuentra resultados esperados
- [ ] Cada filtro cambia la lista de forma coherente
- [ ] El detalle se lee bien en móvil (sin textos cortados)
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
5. Verifica el plato en **Plan** y, si aplica, en **Guardadas → Fuera**.



#### E) Snacks / tentempié

1. En **Plan**, baja a **«Snacks / Tentempié»**.
2. Usa chips rápidos (`+ Manzana`, etc.) o el botón **«✨ + Registrar snack»**.
3. Prueba registro por texto y, si eres Premium, **foto instantánea**.
4. Elimina un snack con la **X** y confirma que desaparece.

**Qué probar**

- [ ] Foto de despensa → ingredientes → receta generada
- [ ] Despensa manual sin foto
- [ ] Flujo Instagram / catálogo hasta el plan
- [ ] Escaneo de plato servido (con y sin Premium)
- [ ] Comida rápida (con y sin Premium)
- [ ] Registrar y borrar snacks

---



### 4. 📅 Planificador Semanal de Menús

1. Abre la pestaña **Plan**.
2. Título esperado: **«Tu plan semanal»**.
3. Cambia de día con el selector de la semana (Lunes… Domingo).
4. Revisa el resumen del día: progreso de comidas (ej. **2/3**) y calorías / objetivo.



#### Asignar recetas

1. En un hueco vacío de **☀️ Desayuno**, **🌤️ Almuerzo** o **🌙 Cena**, pulsa **«Elegir receta»**.
2. En **«Elige una receta»** prueba:
  - Pestaña **«Sugeridas»**
  - Pestaña **«Mis recetas»**
  - Buscador y filtros
3. Selecciona un plato y confirma que aparece en la tarjeta del día (foto, kcal, macros si hay).
4. Con una comida ya puesta, pulsa **«Agregar complemento»** y añade un segundo plato anidado.



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

- Que el **contador del día** (ej. 3/3) sube al asignar Desayuno, Almuerzo y Cena.
- Que las calorías del día se actualizan al añadir/quitar platos y snacks.
- En **Hoy**, los **retos** sí pueden mostrar estados tipo **Completado / Pendiente** (flujo aparte del menú).

**Qué probar**

- [ ] Llenar un día completo (3 comidas + snack)
- [ ] Añadir complemento bajo una comida
- [ ] Cambiar y eliminar platos
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

Cuando algo falle, envía el reporte con este checklist:

1. **📸 Captura de pantalla o vídeo corto** del problema (idealmente mostrando el botón o mensaje exacto).
2. **📱 Dispositivo usado**
  - iPhone / Android / ordenador  
  - Modelo aproximado y navegador (Safari, Chrome…) si lo sabes
3. **🧭 ¿Qué estabas intentando hacer** cuando ocurrió el fallo?
  Ejemplo: *“En Plan → Sábado → Elegir receta → Escanear plato servido → al pulsar Analizar se quedó cargando”*.
4. **🔁 ¿Se puede repetir?** (siempre / a veces / solo una vez)
5. **👤 Estado de tu cuenta** (Free / Pase 24h / Premium), si lo sabes.
6. **🕐 Fecha y hora aproximada** del fallo.



#### Plantilla rápida para copiar

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

---



### ✅ Ruta sugerida de una sesión de prueba (30–45 min)

1. Instalar app → registro / login
2. Activar pase 24h (si aplica)
3. Escáner de despensa → guardar una receta
4. Plan: llenar un día + snack + complemento
5. Lista de compras → copiar
6. Probar una función PRO (plato servido o menú del día)
7. Guardadas: favorito + detalle
8. Perfil: revisar estado Premium
9. Reportar cualquier roce de UX aunque “no sea un bug grave”

¡Gracias por ayudar a pulir IngeniaFood! 💚