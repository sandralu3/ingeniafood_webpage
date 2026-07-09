alter table public.profiles
  add column if not exists country text;

comment on column public.profiles.country is
  'País o región de residencia del usuario para personalizar recetas e ingredientes.';
