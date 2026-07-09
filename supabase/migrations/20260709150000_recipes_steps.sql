-- Pasos estructurados de la receta (array JSON de strings)
alter table public.recipes
  add column if not exists steps jsonb not null default '[]'::jsonb;

comment on column public.recipes.steps is 'Pasos de preparación como array JSON de strings.';
