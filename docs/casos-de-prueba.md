# IngeniaFood — Casos de prueba para testers

Documento orientado a **QA / testers**. Cada caso incluye ID, prioridad, precondiciones, pasos y resultado esperado.

**Export CSV (Notion / Google Sheets / Excel):** [`exports/casos-de-prueba.csv`](exports/casos-de-prueba.csv) · instrucciones en [`exports/README.md`](exports/README.md)  
**Documentación funcional:** [`documentacion-funcional.md`](documentacion-funcional.md)  
Regenerar exports: `node scripts/export-docs-csv.mjs`

| Campo | Significado |
|-------|-------------|
| **P0** | Bloqueante / crítico (debe pasar antes de release) |
| **P1** | Alto (funcionalidad principal) |
| **P2** | Medio (importante pero no bloquea release) |
| **P3** | Bajo / edge case / polish |

**Entorno recomendado:** PWA instalada en móvil (Android + iOS). En local/dev el gate de instalación puede omitirse.

**Cuentas sugeridas:**
- Free (sin Premium)
- Premium (suscripción o código 24h activo)
- Admin Sandra (solo tests de administración)

**Leyenda de estado (rellenar en ejecución):**

| Resultado | Marca |
|-----------|-------|
| OK | ✅ |
| Fallo | ❌ |
| Bloqueado | ⛔ |
| N/A | — |

---

## 0. Checklist rápido de smoke (P0)

Ejecutar al inicio de cada ciclo:

| # | Caso | OK |
|---|------|----|
| S1 | Abrir app instalada → ver login o Hoy | |
| S2 | Login con usuario válido → llega a Hoy | |
| S3 | Bottom nav: Hoy / Plan / Escáner / Guardadas / Perfil | |
| S4 | Escáner: generar 1 receta con 1 ingrediente manual | |
| S5 | Guardar receta → aparece en Guardadas | |
| S6 | Plan: asignar esa receta a un slot | |
| S7 | Hoy: se refleja la comida del día | |
| S8 | Logout → vuelve a pantalla de acceso | |

---

## 1. Acceso, instalación y marketing

### TC-ACC-01 — Landing pública
| | |
|--|--|
| **Prioridad** | P2 |
| **Precondiciones** | Ninguna (navegador) |
| **Pasos** | 1. Abrir `/`. 2. Revisar secciones, idioma, CTA descargar / app. |
| **Esperado** | Landing carga; se puede cambiar idioma; CTAs redirigen sin error 500. |

### TC-ACC-02 — Escritorio redirige a pantalla móvil
| | |
|--|--|
| **Prioridad** | P2 |
| **Precondiciones** | Navegador de escritorio |
| **Pasos** | 1. Abrir `/descargar-app` o intentar app en desktop. |
| **Esperado** | Se muestra “Optimizado para móviles” / QR / vuelta a web. No se abre la PWA completa como en móvil. |

### TC-ACC-03 — Gate de instalación PWA (producción / no standalone)
| | |
|--|--|
| **Prioridad** | P0 |
| **Precondiciones** | Móvil, app no instalada, sin modo standalone |
| **Pasos** | 1. Abrir `/app-recetas`. 2. Seguir instrucciones de instalación. 3. Abrir desde icono de inicio. |
| **Esperado** | Sin instalar: se pide instalar. Tras instalar y abrir: se muestra login o Hoy. |

### TC-ACC-04 — Acceso con clave privada (si aplica en el entorno)
| | |
|--|--|
| **Prioridad** | P1 |
| **Precondiciones** | Entorno con `APP_PRIVATE_ACCESS_KEY` |
| **Pasos** | 1. Abrir `/app-recetas` sin `?k=`. 2. Abrir con `?k=` correcto. |
| **Esperado** | Sin clave: bloqueado o no entra. Con clave: acceso al gate de instalación/login. |

---

## 2. Autenticación

### TC-AUTH-01 — Registro de cuenta nueva
| | |
|--|--|
| **Prioridad** | P0 |
| **Precondiciones** | Email no registrado |
| **Pasos** | 1. Ir a registro. 2. Completar nombre, email, contraseña válidos. 3. Enviar. 4. Abrir email de confirmación si se pide. |
| **Esperado** | Cuenta creada; flujo de confirmación o acceso según configuración; sin errores de UI. |

### TC-AUTH-02 — Login correcto
| | |
|--|--|
| **Prioridad** | P0 |
| **Precondiciones** | Usuario confirmado |
| **Pasos** | 1. Email + contraseña correctos. 2. Enviar. |
| **Esperado** | Entra a `/app-recetas/hoy`. Header y bottom nav visibles. |

### TC-AUTH-03 — Login incorrecto
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | 1. Contraseña incorrecta. 2. Enviar. |
| **Esperado** | Mensaje de error claro; no entra a la app. |

### TC-AUTH-04 — Recuperar contraseña
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | 1. Olvidé contraseña. 2. Ingresar email. 3. Abrir enlace del correo. 4. Definir nueva contraseña. 5. Login con la nueva. |
| **Esperado** | Flujo completo sin bucles; login con nueva contraseña funciona. |

### TC-AUTH-05 — Confirmar email
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | 1. Usar enlace de confirmación. |
| **Esperado** | Cuenta activada; redirección a Hoy o login según estado. |

### TC-AUTH-06 — Cerrar sesión
| | |
|--|--|
| **Prioridad** | P0 |
| **Precondiciones** | Sesión activa |
| **Pasos** | 1. Menú → Cerrar sesión (o desde Perfil). |
| **Esperado** | Sesión terminada; no se puede navegar a Hoy sin volver a login. |

### TC-AUTH-07 — Sesión persistente
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | 1. Login. 2. Cerrar y reabrir la PWA. |
| **Esperado** | Sigue autenticado (salvo expiración configurada). |

---

## 3. Navegación general

### TC-NAV-01 — Bottom navigation
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Pulsar cada tab: Hoy, Plan, Escáner, Guardadas, Perfil. |
| **Esperado** | Cada tab abre su pantalla; tab activo se refleja visualmente. |

### TC-NAV-02 — Menú lateral (drawer)
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | 1. Abrir menú. 2. Ir a Retos. 3. Abrir menú. 4. Ir a Personalizar parámetros. 5. Probar el resto de ítems. |
| **Esperado** | Todas las rutas abren; drawer se cierra al navegar. |

### TC-NAV-03 — Avatar / acceso a perfil desde header
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | Pulsar avatar / acceso a perfil en header. |
| **Esperado** | Abre Perfil. |

---

## 4. Personalizar parámetros

### TC-PAR-01 — Guardar perfil nutricional completo
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | 1. Abrir Parámetros. 2. Completar peso, altura, edad, sexo, actividad, objetivo. 3. Guardar. 4. Salir y volver. |
| **Esperado** | Datos persistidos; preview de metas (kcal/proteína) coherente. |

### TC-PAR-02 — Tipo de alimentación preferida
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | 1. Elegir “Sin gluten”. 2. Guardar. 3. Recargar. |
| **Esperado** | Valor “Sin gluten” se mantiene. |

### TC-PAR-03 — Meta de agua
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | 1. Cambiar vasos/día (p. ej. 8). 2. Guardar. 3. Ir a Hoy. |
| **Esperado** | Tracker de agua muestra meta nueva (p. ej. x/8). |

### TC-PAR-04 — Overrides de kcal / proteína
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | 1. Poner override de calorías. 2. Guardar. |
| **Esperado** | Se guarda; metas usan el override (visible en preview / dosis si aplica). |

---

## 5. Hoy

### TC-HOY-01 — Carga del dashboard
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Abrir Hoy. |
| **Esperado** | Saludo, racha/dosis, plan de hoy, agua (si hay meta), retos; sin pantallas en blanco permanentes. |

### TC-HOY-02 — Racha
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | 1. Ver contador y puntos de semana. 2. Abrir detalle/calendario de racha. |
| **Esperado** | Modal/calendario abre y cierra; datos coherentes con retos completados. |

### TC-HOY-03 — Dosis nutricional (Free)
| | |
|--|--|
| **Prioridad** | P1 |
| **Cuenta** | Free |
| **Pasos** | Pulsar dosis / Ver informe. |
| **Esperado** | Teaser o paywall / pase 24h; no informe Premium completo sin activar. |

### TC-HOY-04 — Dosis nutricional (Premium)
| | |
|--|--|
| **Prioridad** | P0 |
| **Cuenta** | Premium |
| **Pasos** | 1. Ver puntuación, proteína, fibra, agua. 2. Abrir informe. |
| **Esperado** | Informe con contenido útil; CTA coherente (p. ej. hacia escáner). Altura de tarjeta alineada con racha (UI). |

### TC-HOY-05 — Vasos de agua
| | |
|--|--|
| **Prioridad** | P0 |
| **Precondiciones** | Meta de agua configurada |
| **Pasos** | 1. Tocar vaso vacío → se llena. 2. Tocar para bajar/ajustar según lógica. 3. Recargar Hoy. |
| **Esperado** | Contador x/meta correcto; **solo el icono del vaso es azul**, sin fondo de botón azul. Persistencia al recargar. |

### TC-HOY-06 — Editar agua desde Hoy
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | Pulsar “Editar” en agua. |
| **Esperado** | Va a Parámetros. |

### TC-HOY-07 — Completar reto del día
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Completar un reto activo. |
| **Esperado** | Se marca completo; puntos/racha se actualizan. |

### TC-HOY-08 — Banner Proponer / Completar menú
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | 1. Free: pulsar banner. 2. Premium con slots vacíos: generar. |
| **Esperado** | Free → paywall. Premium → genera/completa comidas faltantes; **un solo icono sparkle** (sin duplicado). |

### TC-HOY-09 — Comidas vacías → añadir
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | En slot vacío, usar CTA para planificar / sugerir. |
| **Esperado** | Lleva a plan/picker/sugerencia; se puede asignar comida. |

### TC-HOY-10 — Snack desde Hoy (si visible)
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | Registrar snack. |
| **Esperado** | Queda registrado y visible en plan del día / nutrición. |

### TC-HOY-11 — Banner pase 24h (si hay promo)
| | |
|--|--|
| **Prioridad** | P1 |
| **Precondiciones** | Cuenta con promo reclamable |
| **Pasos** | Activar pase 24h. |
| **Esperado** | Premium activo temporalmente; funciones Premium desbloqueadas. |

---

## 6. Plan semanal

### TC-PLAN-01 — Navegar días / semanas
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Cambiar de día L–D; cambiar semana si hay control. |
| **Esperado** | Contenido del día cambia; sin perder datos al volver. |

### TC-PLAN-02 — Añadir receta a un slot
| | |
|--|--|
| **Prioridad** | P0 |
| **Precondiciones** | Al menos 1 receta guardada |
| **Pasos** | 1. Añadir en desayuno/almuerzo/cena. 2. Elegir en picker. |
| **Esperado** | Receta aparece en el slot; kcal del día se actualizan. |

### TC-PLAN-03 — Cambiar / editar plato (lápiz / reemplazo)
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Abrir editar/cambiar → elegir otra receta o escanear. |
| **Esperado** | Reemplaza la comida correcta (no duplica en el mismo slot si es modo replace). |

### TC-PLAN-04 — Quitar comida
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Eliminar una comida del plan. |
| **Esperado** | Slot vacío; nutrición actualizada. |

### TC-PLAN-05 — Arrastrar entre horarios
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Mantener pulsado y arrastrar una comida a otro slot. |
| **Esperado** | Cambia de horario; no se pierde la receta. |

### TC-PLAN-06 — Ir a escáner desde el plan
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Desde picker/añadir → Escanear despensa → generar → guardar en plan. |
| **Esperado** | Vuelve / asigna al día y comida correctos. |

### TC-PLAN-07 — Lista de compras
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Abrir lista; copiar si hay botón. |
| **Esperado** | Lista coherente con ingredientes del plan; copiar funciona. |

### TC-PLAN-08 — Copiar semana anterior
| | |
|--|--|
| **Prioridad** | P2 |
| **Precondiciones** | Semana previa con comidas |
| **Pasos** | Usar “copiar semana”. |
| **Esperado** | Comidas se copian a la semana actual (o mensaje claro si no hay datos). |

### TC-PLAN-09 — Proponer menú del día (Premium)
| | |
|--|--|
| **Prioridad** | P0 |
| **Cuenta** | Premium |
| **Pasos** | Pulsar Proponer/Completar menú. |
| **Esperado** | Rellena slots vacíos; un solo icono en el banner; respeta dieta preferida en la medida de lo posible. |

### TC-PLAN-10 — Proponer menú (Free)
| | |
|--|--|
| **Prioridad** | P1 |
| **Cuenta** | Free |
| **Pasos** | Pulsar banner. |
| **Esperado** | Paywall; no genera menú. |

### TC-PLAN-11 — Comida fuera (Premium)
| | |
|--|--|
| **Prioridad** | P1 |
| **Cuenta** | Premium |
| **Pasos** | Registrar comida fuera (texto y/o foto). |
| **Esperado** | Queda en el plan / nutrición; visible en Guardadas → Fuera si aplica. |

### TC-PLAN-12 — Snack en plan
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Registrar snack. |
| **Esperado** | Aparece en el día; macros/kcal se actualizan. |

### TC-PLAN-13 — Desde Instagram en picker (Free vs Premium)
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Free: intentar Instagram. Premium: elegir receta del catálogo. |
| **Esperado** | Free bloqueado/paywall. Premium asigna correctamente. |

---

## 7. Escáner / generación de recetas

### TC-SCAN-01 — Generar con ingrediente manual (happy path)
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | 1. Escáner → despensa. 2. Añadir “pollo”. 3. Buscar recetas. |
| **Esperado** | 3 opciones (o mensaje claro); se pueden abrir/guardar. |

### TC-SCAN-02 — Generar con foto
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | 1. Subir foto con comida visible. 2. Confirmar ingredientes. 3. Generar. |
| **Esperado** | Detección razonable; tras confirmar, genera recetas. |

### TC-SCAN-03 — Foto sin comida / no válida
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Subir imagen sin alimentos (p. ej. paisaje). |
| **Esperado** | Mensaje tipo “no parece haber comida” / NOT_FOOD; no inventa receta absurda sin aviso. |

### TC-SCAN-04 — Confirmar ingredientes (editar lista)
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Tras detección: quitar uno, añadir otro, confirmar. |
| **Esperado** | La receta usa la lista confirmada. |

### TC-SCAN-05 — Filtros Free vs Premium
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Free: intentar filtros avanzados. Premium: desayuno/cena, raciones, complejidad. |
| **Esperado** | Free limitado. Premium aplica filtros en el resultado. |

### TC-SCAN-06 — Límite de generaciones Free (5)
| | |
|--|--|
| **Prioridad** | P0 |
| **Cuenta** | Free con cuota agotable |
| **Pasos** | Generar hasta agotar (o simular límite). |
| **Esperado** | Modal de límite; no genera más hasta Premium o reset de cuota. |

### TC-SCAN-07 — Guardar en recetario
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | En resultado → Guardar. |
| **Esperado** | Aparece en Guardadas. |

### TC-SCAN-08 — Guardar en plan / cocinar
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Asignar a día y comida. |
| **Esperado** | Visible en Plan y en Hoy del día correspondiente. |

### TC-SCAN-09 — Variantes clásica / rápida / ligera
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Cambiar entre las 3 pestañas/opciones. |
| **Esperado** | Títulos/tiempos distintos; cada una usable. |

### TC-SCAN-10 — Aviso alimento poco saludable
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Generar con “bacon” o similar. |
| **Esperado** | Genera receta **y** muestra nota de “poco saludable / ten en cuenta”. |

### TC-SCAN-11 — Dieta sin gluten + harina de trigo
| | |
|--|--|
| **Prioridad** | P0 |
| **Precondiciones** | Preferencia = Sin gluten |
| **Pasos** | Generar con “harina de trigo”. |
| **Esperado** | Genera receta **y** nota de dieta indicando gluten / no apto sin gluten. |

### TC-SCAN-12 — Dieta sin gluten + harina de almendras (sin falso positivo)
| | |
|--|--|
| **Prioridad** | P0 |
| **Precondiciones** | Preferencia = Sin gluten |
| **Pasos** | Generar con “harina de almendras”. |
| **Esperado** | **No** debe decir que la harina de almendras tiene gluten. |

### TC-SCAN-13 — Otras dietas (muestra)
| | |
|--|--|
| **Prioridad** | P1 |
| **Casos** | Keto + arroz; Vegana + pollo; Vegetariana + salmón |
| **Esperado** | Nota de dieta coherente con cada restricción. |

### TC-SCAN-14 — Tab Desde Instagram
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Explorar catálogo → abrir detalle → guardar. |
| **Esperado** | Detalle correcto; se guarda en recetario. |

### TC-SCAN-15 — Foto real del plato (Premium)
| | |
|--|--|
| **Prioridad** | P1 |
| **Cuenta** | Premium con crédito |
| **Pasos** | Generar y aceptar foto real si se ofrece. |
| **Esperado** | Usa crédito; imagen generada o fallback claro; segundo intento respeta límite. |

### TC-SCAN-16 — Nueva búsqueda / reintentar
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | Tras resultado, iniciar nueva búsqueda. |
| **Esperado** | Vuelve al flujo de entrada limpio. |

### TC-SCAN-17 — Ingrediente inválido escrito a mano
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | Añadir texto no alimentario (p. ej. “móvil”). |
| **Esperado** | Error de validación; no genera. |

---

## 8. Guardadas y detalle

### TC-REC-01 — Listado y pestañas
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Revisar Guardadas / Favoritas / Fuera. |
| **Esperado** | Listas correctas; vacías muestran empty state. |

### TC-REC-02 — Buscar / filtrar
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | Buscar por nombre parcial. |
| **Esperado** | Filtra resultados. |

### TC-REC-03 — Favorito
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Marcar y desmarcar favorito. |
| **Esperado** | Aparece/desaparece en pestaña Favoritas. |

### TC-REC-04 — Detalle completo
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Abrir una receta. |
| **Esperado** | Ingredientes, pasos, macros, tip; avisos si los hay. |

### TC-REC-05 — Compartir
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Compartir receta. |
| **Esperado** | Genera imagen/share sheet sin crash. |

### TC-REC-06 — Asignar al plan desde detalle
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Asignar a un slot. |
| **Esperado** | Visible en Plan. |

### TC-REC-07 — Eliminar receta
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Eliminar con confirmación. |
| **Esperado** | Desaparece del listado; confirmación evita borrado accidental. |

---

## 9. Perfil y Premium

### TC-PER-01 — Editar nombre / país / idioma
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Cambiar y guardar; cambiar idioma. |
| **Esperado** | Persistencia; UI cambia de idioma al instante. |

### TC-PER-02 — Avatar
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | Subir foto → recortar → guardar. |
| **Esperado** | Avatar actualizado en header y perfil. |

### TC-PER-03 — Upgrade Stripe (Premium)
| | |
|--|--|
| **Prioridad** | P0 |
| **Cuenta** | Free (usar modo test Stripe si aplica) |
| **Pasos** | Upgrade → completar checkout de prueba. |
| **Esperado** | Vuelve a la app con Premium activo. |

### TC-PER-04 — Portal de suscripción
| | |
|--|--|
| **Prioridad** | P1 |
| **Cuenta** | Premium Stripe |
| **Pasos** | Gestionar suscripción. |
| **Esperado** | Abre portal Stripe. |

### TC-PER-05 — Canjear código 24h
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Introducir código válido. |
| **Esperado** | Mensaje de éxito; Premium 24h; funciones desbloqueadas. |

### TC-PER-06 — Código inválido
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Código incorrecto. |
| **Esperado** | Error claro; no activa Premium. |

### TC-PER-07 — Cerrar sesión desde perfil
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Cerrar sesión. |
| **Esperado** | Sale de la sesión. |

---

## 10. Retos

### TC-RET-01 — Activar / desactivar reto sistema
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Activar uno; desactivar otro. |
| **Esperado** | Estado persistido; se refleja en Hoy. |

### TC-RET-02 — Días de la semana del reto
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Configurar solo L/M/X. Verificar en un día no activo. |
| **Esperado** | Solo aparece/aplica en días seleccionados. |

### TC-RET-03 — Crear meta personalizada
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Crear → completar en Hoy → editar → eliminar. |
| **Esperado** | CRUD completo sin errores. |

---

## 11. Paywall y límites (transversales)

### TC-PREM-01 — Paywall consistente
| | |
|--|--|
| **Prioridad** | P0 |
| **Cuenta** | Free |
| **Pasos** | Disparar: menú IA, comida fuera, informe dosis, Instagram picker, filtros premium. |
| **Esperado** | Siempre paywall/teaser; nunca ejecuta la función Premium. |

### TC-PREM-02 — Tras activar Premium, funciones abiertas
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Activar Premium → repetir acciones de TC-PREM-01. |
| **Esperado** | Funciones disponibles. |

---

## 12. Admin (solo cuenta Sandra)

### TC-ADM-01 — Acceso restringido
| | |
|--|--|
| **Prioridad** | P1 |
| **Cuenta** | Usuario normal |
| **Pasos** | Intentar `/admin/usuarios`. |
| **Esperado** | Acceso denegado / redirección. |

### TC-ADM-02 — Listar y editar usuarios
| | |
|--|--|
| **Prioridad** | P1 |
| **Cuenta** | Admin |
| **Pasos** | Abrir usuarios; toggles Premium/tester; límite escaneos. |
| **Esperado** | Cambios se guardan y afectan al usuario objetivo. |

### TC-ADM-03 — Importar receta Instagram
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | Pegar texto → estructurar → publicar. |
| **Esperado** | Receta creada en catálogo/sistema. |

### TC-ADM-04 — Banco de imágenes
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | Alta / edición / filtro de imágenes. |
| **Esperado** | CRUD operativo. |

### TC-ADM-05 — Catálogo Instagram (listado + edición)
| | |
|--|--|
| **Prioridad** | P2 |
| **Pasos** | Listar → editar una entrada → guardar. |
| **Esperado** | Cambios visibles en escáner “Desde Instagram”. |

---

## 13. i18n y dispositivos

### TC-I18N-01 — Cambio de idioma
| | |
|--|--|
| **Prioridad** | P1 |
| **Pasos** | Perfil → EN / FR / PT / DE → recorrer Hoy, Plan, Escáner. |
| **Esperado** | Textos principales traducidos; sin claves crudas `Hoy.xxx`. |

### TC-DEV-01 — Android PWA
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Smoke S1–S8 en Chrome Android instalada. |
| **Esperado** | Sin roturas de layout críticas; cámara/escáner usable. |

### TC-DEV-02 — iOS PWA (Añadir a inicio)
| | |
|--|--|
| **Prioridad** | P0 |
| **Pasos** | Smoke S1–S8 en Safari → pantalla de inicio. |
| **Esperado** | Instalación clara; app usable; safe areas OK. |

### TC-DEV-03 — Offline / red inestable (básico)
| | |
|--|--|
| **Prioridad** | P3 |
| **Pasos** | Cortar red al generar receta. |
| **Esperado** | Error comprensible; no pantalla colgada infinita. |

---

## 14. Regresión UI puntual (bugs conocidos corregidos)

| ID | Qué verificar | Esperado |
|----|---------------|----------|
| TC-UI-01 | Banner “Completar comidas…” en Hoy y Plan | **Un solo** icono sparkle |
| TC-UI-02 | Vasos de agua llenos | Sin fondo azul de botón; solo vaso azul |
| TC-UI-03 | Tarjeta Dosis vs Racha en Hoy | Alturas equilibradas / dosis compacta |
| TC-UI-04 | Nota dieta harina de almendras + sin gluten | Sin falso positivo de gluten |

---

## 15. Matriz de cobertura (resumen)

| Área | # casos aprox. | P0 clave |
|------|----------------|----------|
| Acceso / PWA | 4 | Instalación + entrada |
| Auth | 7 | Login, logout, registro |
| Nav | 3 | Tabs |
| Parámetros | 4 | Nutrición + dieta + agua |
| Hoy | 11 | Dashboard, agua, retos, dosis |
| Plan | 13 | CRUD comidas, escáner, menú IA |
| Escáner | 17 | Generar, límites, dieta |
| Guardadas | 7 | Guardar, detalle, borrar |
| Perfil / Premium | 7 | Stripe, código |
| Retos | 3 | Activar, personalizado |
| Paywall | 2 | Bloqueo / desbloqueo |
| Admin | 5 | Acceso + CRUD |
| i18n / dispositivos | 4 | ES+EN, Android, iOS |
| UI regresión | 4 | Bugs recientes |

---

## 16. Plantilla de reporte de bug

```text
ID caso: TC-___
Dispositivo / OS / navegador:
Cuenta (Free / Premium / Admin):
Build / entorno / fecha:
Pasos:
Resultado obtenido:
Resultado esperado:
Capturas / video:
Severidad: Bloqueante | Alta | Media | Baja
```

---

## 17. Hoja de ejecución (copiar por tester)

| Tester | Fecha | Entorno | Smoke S1–S8 | % P0 OK | Notas |
|--------|-------|---------|-------------|---------|-------|
| | | | | | |

| ID | Resultado | Notas |
|----|-----------|-------|
| TC-AUTH-01 | | |
| TC-AUTH-02 | | |
| TC-HOY-01 | | |
| TC-PLAN-02 | | |
| TC-SCAN-01 | | |
| TC-SCAN-11 | | |
| TC-SCAN-12 | | |
| … | | |

---

*Documento de pruebas funcionales de producto. Complementa `docs/documentacion-funcional.md`. Actualizar cuando se añadan pantallas o reglas Free/Premium.*
