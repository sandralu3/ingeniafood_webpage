-- Añade portugués (pt) y alemán (de) a los idiomas permitidos.
-- Idempotente: crea columnas language si faltan.

alter table if exists public.profiles
  add column if not exists language varchar(8) not null default 'es';

alter table if exists public.profiles
  drop constraint if exists profiles_language_check;

alter table if exists public.profiles
  add constraint profiles_language_check
  check (language in ('es', 'en', 'fr', 'pt', 'de'));

comment on column public.profiles.language is
  'Idioma de interfaz preferido del usuario (es, en, fr, pt, de, ...).';

do $$
begin
  if to_regclass('public.tips_saludables') is not null then
    alter table public.tips_saludables
      add column if not exists language varchar(8) not null default 'es';

    alter table public.tips_saludables
      drop constraint if exists tips_saludables_language_check;

    alter table public.tips_saludables
      add constraint tips_saludables_language_check
      check (language in ('es', 'en', 'fr', 'pt', 'de'));

    comment on column public.tips_saludables.language is
      'Idioma del tip (es, en, fr, pt, de, ...).';

    create index if not exists tips_saludables_language_idx
      on public.tips_saludables (language);
  end if;
end $$;
