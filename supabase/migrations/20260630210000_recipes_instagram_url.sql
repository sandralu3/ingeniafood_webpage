-- Enlace opcional al reel o publicación de Instagram de cada receta
alter table public.recipes
  add column if not exists instagram_url text;

comment on column public.recipes.instagram_url is
  'URL del reel o publicación de Instagram asociada a la receta (opcional).';
