-- Límite de generaciones gratuitas con Gemini por usuario
alter table public.profiles
  add column if not exists generations_left integer not null default 5
  check (generations_left >= 0);

comment on column public.profiles.generations_left is
  'Escaneos/generaciones de receta con IA restantes en el plan gratuito.';

-- Perfiles existentes sin valor explícito
update public.profiles
set generations_left = 5
where generations_left is null;

-- Nuevos registros vía trigger handle_new_user (ver schema.sql)
