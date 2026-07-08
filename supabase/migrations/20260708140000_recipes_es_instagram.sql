alter table public.recipes
  add column if not exists es_instagram boolean not null default false;

comment on column public.recipes.es_instagram is
  'Marca recetas curadas publicadas desde Instagram para el catálogo del escáner.';

create index if not exists recipes_es_instagram_idx
  on public.recipes (es_instagram)
  where es_instagram = true;

update public.recipes
set es_instagram = true
where is_public = true
  and (instagram_url is not null or image_url is not null);
