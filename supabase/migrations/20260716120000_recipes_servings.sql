alter table if exists public.recipes
  add column if not exists servings smallint;

comment on column public.recipes.servings is
  'Número de porciones/personas para la que se generó la receta (filtro Premium del escáner).';
