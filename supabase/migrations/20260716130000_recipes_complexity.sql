alter table if exists public.recipes
  add column if not exists complexity text;

comment on column public.recipes.complexity is
  'Nivel de complejidad solicitado al generar la receta (facil | intermedio | avanzado).';
