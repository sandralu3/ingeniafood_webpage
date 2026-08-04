-- Preferencia de tipo de alimentación del usuario (recomendaciones y generación).
alter table public.profiles
  add column if not exists preferred_diet text;

alter table public.profiles
  drop constraint if exists profiles_preferred_diet_check;

alter table public.profiles
  add constraint profiles_preferred_diet_check
  check (
    preferred_diet is null
    or preferred_diet in (
      'estandar',
      'sin_gluten',
      'sin_harinas',
      'keto',
      'vegetariana',
      'vegana',
      'alto_proteina',
      'mediterranea'
    )
  );

comment on column public.profiles.preferred_diet is
  'Tipo de alimentación preferida: estandar | sin_gluten | sin_harinas | keto | vegetariana | vegana | alto_proteina | mediterranea';
