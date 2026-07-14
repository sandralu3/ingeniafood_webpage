-- Metadatos de recetas generadas por escáner (filtros, aviso, imágenes, etiquetas).
alter table if exists public.recipes
  add column if not exists reference_image_url text,
  add column if not exists meal_type text,
  add column if not exists cuisine_style text,
  add column if not exists meal_type_advisory text,
  add column if not exists tags jsonb;

comment on column public.recipes.reference_image_url is
  'Imagen de referencia del banco (cuando hay foto premium distinta).';
comment on column public.recipes.meal_type is
  'Filtro de momento del plato usado al generar (desayuno, almuerzo, cena, postre).';
comment on column public.recipes.cuisine_style is
  'Filtro de estilo culinario usado al generar.';
comment on column public.recipes.meal_type_advisory is
  'Aviso opcional sobre ingredientes complementarios al generar.';
comment on column public.recipes.tags is
  'Etiquetas de la receta (Sin Harinas, Alto en Proteína, etc.).';
