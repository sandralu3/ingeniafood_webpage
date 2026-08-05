# Exports CSV — IngeniaFood

Archivos listos para importar en **Google Sheets**, **Excel** o **Notion**.  
Codificación: **UTF-8 con BOM** (Excel en Windows los abre bien).

Regenerar desde el repo:

```bash
node scripts/export-docs-csv.mjs
```

## Archivos

| Archivo | Filas (aprox.) | Contenido |
|---------|----------------|-----------|
| `pantallas.csv` | 23 | Inventario de pantallas / rutas |
| `modales.csv` | 16 | Modales y ventanas secundarias |
| `flujos.csv` | 6 | Flujos de usuario A–F |
| `free-vs-premium.csv` | 12 | Matriz capacidades Free vs Premium |
| `dietas-preferidas.csv` | 8 | Dietas y ejemplos de avisos |
| `casos-de-prueba.csv` | 99 | Suite QA completa (incluye columnas `resultado`, `tester`, `fecha`, `notas`) |
| `smoke.csv` | 8 | Smoke S1–S8 |

Documentación narrativa: [`../documentacion-funcional.md`](../documentacion-funcional.md) · [`../casos-de-prueba.md`](../casos-de-prueba.md)

---

## Google Sheets

1. Abre [Google Sheets](https://sheets.google.com) → **Archivo → Importar → Subir**.
2. Elige el CSV (p. ej. `casos-de-prueba.csv`).
3. Tipo de separador: **Detectar automáticamente** o **Coma**.
4. Convierte a tabla / filtra por `prioridad` = `P0` para el ciclo de release.
5. Opcional: una pestaña por CSV en el mismo libro.

**Tip:** Para Excel nativo, en Sheets: **Archivo → Descargar → Microsoft Excel (.xlsx)**.

---

## Microsoft Excel

1. Abrir el `.csv` con doble clic, o **Datos → Obtener datos → Desde archivo → CSV**.
2. Origen: UTF-8.
3. Guardar como `.xlsx` si quieres un único libro con varias hojas (importa cada CSV en una hoja).

---

## Notion

### Opción A — Import CSV (recomendado para casos de prueba)

1. En un workspace Notion: **Import → CSV**.
2. Sube `casos-de-prueba.csv`.
3. Notion crea una base de datos.
4. Configura vistas:
   - **Board** por `resultado` o `prioridad`
   - **Table** filtrada `prioridad = P0`
   - **Filter** por `area` (Hoy, Plan, Escáner…)

### Opción B — Varias tablas

Importa por separado:

- `pantallas.csv` → DB “Pantallas”
- `modales.csv` → DB “Modales”
- `casos-de-prueba.csv` → DB “QA”
- Relaciona manualmente por IDs (`SCR-HOY`, `TC-SCAN-12`, etc.) si lo necesitas.

### Columnas útiles en QA

| Columna | Uso en Notion |
|--------|----------------|
| `resultado` | Select: OK / Fallo / Bloqueado / N/A |
| `tester` | Person o texto |
| `fecha` | Date |
| `notas` | Text / bug link |
| `prioridad` | Select P0–P3 |
| `automatizable` | Select E2E / Unit / Manual |

---

## Excel “todo en uno” (opcional)

Si quieres un solo `.xlsx` con todas las hojas:

1. Importa cada CSV en Excel como hoja distinta, **o**
2. En Google Sheets crea un libro con una pestaña por archivo y descarga `.xlsx`.

No se genera `.xlsx` binario en el repo para evitar dependencias; los CSV son la fuente de verdad.
